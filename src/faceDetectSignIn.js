import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Slider, Dimensions, ImageBackground } from 'react-native';
import { RNCamera } from 'react-native-camera';

const landmarkSize = 4;

const deviceHeight = Dimensions.get("window").height;

const deviceWidth = Dimensions.get("window").width;

export default class FaceDetectSignIn extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            flash: 'off',
            zoom: 0,
            autoFocus: 'on',
            depth: 0,
            type: 'front',
            whiteBalance: 'auto',
            ratio: '16:9',
            ratios: [],
            photoId: 1,
            showGallery: false,
            photos: [],
            faces: [],
            isFaceDetected: false,
            detectedNum: 0,
            wanningText: '请将面容对准取景框内进行身份验证',
            beforeSmileCheck: false,
            beforeBlinkCheck: false,
        };
        this.eyeState = 0;
        this.OPEN_THRESHOLD = 0.7;
        this.CLOSE_THRESHOLD = 0.2;
    }

    toggleView() {
        this.props.onCancel('jinxinx');
    }

    toggleFocus() {
        this.setState({
            autoFocus: this.state.autoFocus === 'on' ? 'off' : 'on',
        });
    }

    zoomOut() {
        this.setState({
            zoom: this.state.zoom - 0.1 < 0 ? 0 : this.state.zoom - 0.1,
        });
    }

    zoomIn() {
        this.setState({
            zoom: this.state.zoom + 0.1 > 1 ? 1 : this.state.zoom + 0.1,
        });
    }

    setFocusDepth(depth) {
        this.setState({
            depth,
        });
    }

    reVerification = async function() {
        this.setState({
            isFaceDetected: false,
        });
    };

    createFaceImage(data) {
        const URL = `http://114.215.16.218:4060/api/uploadFaceDetectImage`;
        return fetch(URL, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                imageData: data
            }),
        }).then((res) => res.json());
    }

    _checkOnlyOnePersonInCamera = async ({faces}) => {
        return faces.length === 1;
    };

    positionInCameraView(pos) {
        return pos.x > 50 && pos.x < (deviceWidth - 50) && pos.y > 100 && pos.y < (deviceHeight - 200);
    };

    _checkFaceInCamera = async ({faces}) => {
        // 最起码有8个生物特征落入取景框内
        if(!(faces[0].hasOwnProperty('leftEyePosition') && faces[0].hasOwnProperty('rightEyePosition') &&
            faces[0].hasOwnProperty('leftCheekPosition') && faces[0].hasOwnProperty('rightCheekPosition') &&
            faces[0].hasOwnProperty('leftMouthPosition') && faces[0].hasOwnProperty('rightMouthPosition') &&
            faces[0].hasOwnProperty('noseBasePosition') && faces[0].hasOwnProperty('bottomMouthPosition'))) {
            return false;
        } else {
            return this.positionInCameraView(faces[0].leftEyePosition) && this.positionInCameraView(faces[0].rightEyePosition) &&
                this.positionInCameraView(faces[0].leftCheekPosition) && this.positionInCameraView(faces[0].rightCheekPosition) &&
                this.positionInCameraView(faces[0].leftMouthPosition) && this.positionInCameraView(faces[0].rightMouthPosition) &&
                this.positionInCameraView(faces[0].noseBasePosition) && this.positionInCameraView(faces[0].bottomMouthPosition);
        }
    };

    _checkDistanceFromCamera = async ({faces}) => {
        return true;//!(faces[0].bounds.size.height < 400 || faces[0].bounds.size.width < 400);
    };

    _checkFaceSmiling = async ({faces}) => {
        return faces[0].smilingProbability > 0.5;
    };

    _checkEyesBlink = async ({faces}) => {
        if(!faces[0].hasOwnProperty('leftEyeOpenProbability') || !faces[0].hasOwnProperty('rightEyeOpenProbability')) {
            return false;
        }
        const left = faces[0].leftEyeOpenProbability;
        const right = faces[0].rightEyeOpenProbability;
        let result = false;
        switch(this.eyeState) {
            case 0:
                if((left > this.OPEN_THRESHOLD) && (right > this.OPEN_THRESHOLD)) {
                    this.eyeState = 1;
                    result = false;
                }
                break;
            case 1:
                if ((left < this.CLOSE_THRESHOLD) && (right < this.CLOSE_THRESHOLD)) {
                    // Both eyes become closed
                    this.eyeState = 2;
                    result = false;
                }
                break;
            case 2:
                if ((left > this.OPEN_THRESHOLD) && (right > this.OPEN_THRESHOLD)) {
                    // Both eyes are open again
                    this.eyeState = 0;
                    result = true;
                }
                break;
        }
        return result;
    };

    _checkAllConditionSatisfy = async ({faces}) => {
        if(!this.state.beforeSmileCheck) {
            const checkOnePerson = await this._checkOnlyOnePersonInCamera({faces});
            const faceInBound = await this._checkFaceInCamera({faces});
            const distanceFromCamera = await this._checkDistanceFromCamera({faces});
            if(!checkOnePerson) {
                return {
                    prepared: false,
                    msg: '请确保只有一个人在镜头前',
                };
            } else if(!faceInBound) {
                return {
                    prepared: false,
                    msg: '请把面部对准取景框',
                };
            } else if(!distanceFromCamera) {
                return {
                    prepared: false,
                    msg: '请尝试拉近相机',
                };
            } else {
                this.setState({
                    beforeSmileCheck: true
                });
                return {
                    prepared: false,
                    msg: '请微笑',
                };
            }
        }
        else {
            if(this.state.beforeBlinkCheck) {
                return {
                    prepared: true,
                    msg: '请眨眼',
                };
            }
            const bSmile = await this._checkFaceSmiling({faces});
            if(!bSmile) {
                return {
                    prepared: false,
                    msg: '请微笑',
                };
            } else {
                this.setState({
                    beforeBlinkCheck: true
                });
                return {
                    prepared: true,
                    msg: '请眨眼',
                };
            }
        }
    };

    onFacesDetected = async ({faces}) => {
        this.setState({
            faces,
        });
        const prepareCondition = await this._checkAllConditionSatisfy({faces});
        if(!prepareCondition.prepared) {
            this.setState({
                wanningText: prepareCondition.msg
            });
        } else {
            this.setState({
                wanningText: '请眨眼',
            });
            const eyeBlink = await this._checkEyesBlink({faces});
            if(eyeBlink) {
                //倒数三秒拍照
                const data = await this.camera.takePictureAsync({quality: 0.5, base64: true, width: 480});
                this.setState({
                    wanningText: '正在检验，请稍候',
                    isFaceDetected: true,
                    detectedNum: this.state.detectedNum += 1
                });
                await this.createFaceImage(data.base64).then((res) => {
                    if (res.success) {
                        if (!res.compareResult) {
                            this.setState({
                                wanningText: `验证失败，尝试第${this.state.detectedNum}次验证`,
                            });
                            if (this.state.detectedNum > 3) {
                                this.setState({
                                    wanningText: `连续验证失败三次均失败`,
                                });
                                this.props.onFailed('验证失败');
                            } else {
                                this.setState({
                                    isFaceDetected: false,
                                    wanningText: '继续验证，请稍候',
                                });
                            }
                        } else {
                            this.setState({
                                wanningText: `验证成功!!!`,
                            });
                            this.props.onSuccess(res.name.split('.')[0]);
                        }
                    }
                });
            }
        }
    };

    onFaceDetectionError = state => console.warn('Faces detection error:', state);

    renderFaceScope() {
        return (
            <View
                style={[
                    styles.face,
                    {
                        width: deviceWidth - 100,
                        height: deviceHeight - 300,
                        left: 50,
                        top: 100,
                    },
                ]}
            >
                <Text style={styles.faceText}>{this.state.wanningText}</Text>
            </View>
        );
    }

    renderLandmarksOfFace(face) {
        const renderLandmark = position =>
            position && (
                <View
                    style={[
                        styles.landmark,
                        {
                            left: position.x - landmarkSize / 2,
                            top: position.y - landmarkSize / 2,
                        },
                    ]}
                />
            );
        return (
            <View key={`landmarks-${face.faceID}`}>
                {renderLandmark(face.leftEyePosition)}
                {renderLandmark(face.rightEyePosition)}
                {renderLandmark(face.leftEarPosition)}
                {renderLandmark(face.rightEarPosition)}
                {renderLandmark(face.leftCheekPosition)}
                {renderLandmark(face.rightCheekPosition)}
                {renderLandmark(face.leftMouthPosition)}
                {renderLandmark(face.mouthPosition)}
                {renderLandmark(face.rightMouthPosition)}
                {renderLandmark(face.noseBasePosition)}
                {renderLandmark(face.bottomMouthPosition)}
            </View>
        );
    }

    renderLandmarks() {
        return (
            <View style={styles.facesContainer} pointerEvents="none">
                {this.state.faces.map(this.renderLandmarksOfFace)}
            </View>
        );
    }

    renderCamera() {
        return (
            <RNCamera
                ref={ref => {
                    this.camera = ref;
                }}
                style={{
                    flex: 1,
                }}
                type={this.state.type}
                flashMode={this.state.flash}
                autoFocus={this.state.autoFocus}
                zoom={this.state.zoom}
                whiteBalance={this.state.whiteBalance}
                ratio={this.state.ratio}
                faceDetectionLandmarks={RNCamera.Constants.FaceDetection.Landmarks.all}
                onFacesDetected={!this.state.isFaceDetected ? this.onFacesDetected : null}
                onFaceDetectionError={this.onFaceDetectionError}
                focusDepth={this.state.depth}
                faceDetectionClassifications={RNCamera.Constants.FaceDetection.Classifications.all}
                permissionDialogTitle={'Permission to use camera'}
                permissionDialogMessage={'We need your permission to use your camera phone'}
            >

                {this.renderFaceScope()}

                <ImageBackground
                    style={ styles.imgBackground }
                    resizeMode='cover'
                    source={require('../images/signInBk.png')}>
                </ImageBackground>
                <View
                    style={{
                        flex: 0.5,
                        backgroundColor: 'transparent',
                        flexDirection: 'row',
                        justifyContent: 'space-around',
                    }}
                >
                </View>
                <View
                    style={{
                        flex: 0.4,
                        backgroundColor: 'transparent',
                        flexDirection: 'row',
                        alignSelf: 'flex-end',
                    }}
                >
                    <Slider
                        style={{ width: 150, marginTop: 15, alignSelf: 'flex-end' }}
                        onValueChange={this.setFocusDepth.bind(this)}
                        step={0.1}
                        disabled={this.state.autoFocus === 'on'}
                    />
                </View>
                <View
                    style={{
                        flex: 0.1,
                        backgroundColor: 'transparent',
                        flexDirection: 'row',
                        alignSelf: 'flex-end',
                        zIndex:10
                    }}
                >
                    <TouchableOpacity
                        style={[styles.flipButton, { flex: 0.1, alignSelf: 'flex-end' }]}
                        onPress={this.zoomIn.bind(this)}
                    >
                        <Text style={styles.flipText}> + </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.flipButton, { flex: 0.1, alignSelf: 'flex-end' }]}
                        onPress={this.zoomOut.bind(this)}
                    >
                        <Text style={styles.flipText}> - </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.flipButton, { flex: 0.25, alignSelf: 'flex-end' }]}
                        onPress={this.toggleFocus.bind(this)}
                    >
                        <Text style={styles.flipText}> AF : {this.state.autoFocus} </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.flipButton, styles.picButton, { flex: 0.3, alignSelf: 'flex-end' }]}
                        onPress={this.reVerification.bind(this)}
                    >
                        <Text style={styles.flipText}> SNAP </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.flipButton, styles.galleryButton, { flex: 0.25, alignSelf: 'flex-end' }]}
                        onPress={this.toggleView.bind(this)}
                    >
                        <Text style={styles.flipText}> Gallery </Text>
                    </TouchableOpacity>
                </View>
                {this.renderLandmarks()}
            </RNCamera>
        );
    }

    render() {
        return <View style={styles.container}>{this.renderCamera()}</View>;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 10,
        backgroundColor: '#000',
    },
    navigation: {
        flex: 1,
    },
    gallery: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    flipButton: {
        flex: 0.3,
        height: 40,
        marginHorizontal: 2,
        marginBottom: 10,
        marginTop: 20,
        borderRadius: 8,
        borderColor: 'white',
        borderWidth: 1,
        padding: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    flipText: {
        color: 'white',
        fontSize: 15,
    },
    item: {
        margin: 4,
        backgroundColor: 'indianred',
        height: 35,
        width: 80,
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    picButton: {
        backgroundColor: 'darkseagreen',
    },
    galleryButton: {
        backgroundColor: 'indianred',
    },
    facesContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        left: 0,
        top: 0,
    },
    face: {
        padding: 10,
        borderWidth: 2,
        borderRadius: 2,
        //borderWidth: 0,
        position: 'absolute',
        borderColor: '#FFD700',
        justifyContent: 'center',
        backgroundColor: 'rgba(1, 1, 1, 0.5)',
        width: '100%',
        height: '100%',
    },
    landmark: {
        width: landmarkSize,
        height: landmarkSize,
        position: 'absolute',
        backgroundColor: 'red',
    },
    faceText: {
        color: '#FFD700',
        fontWeight: 'bold',
        textAlign: 'center',
        margin: 10,
        backgroundColor: 'transparent',
    },
    row: {
        flexDirection: 'row',
    },
    imgBackground: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        flex: 1
    },
});
