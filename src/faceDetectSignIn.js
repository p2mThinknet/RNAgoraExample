import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Slider, Dimensions } from 'react-native';
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
            wanningText: '将面容对准取景框内进行身份验证'
        };
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

    positionInCameraView(pos) {
        return pos.x > 50 && pos.x < (deviceWidth - 50) && pos.y > 100 && pos.y < (deviceHeight - 200);

    }

    getBaiduAiToken() {
        const client_id = 'PhVFDP290U64VM95V1jxnnSM';
        const client_secret = '8YIIKy2gSnpQE8a2dn9F9jacVOOGxoyD';

        return fetch(`https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${client_id}&client_secret=${client_secret}`)
            .then((res) => res.json());
    }

    getBaiduLiveness(imageData,tokenData) {
        let imageToBaidu = [];
        imageToBaidu.push({
            image: imageData,
            image_type: 'BASE64',
            false_field: 'age, beauty, expression'
        });

        const URL = `https://aip.baidubce.com/rest/2.0/face/v3/faceverify?access_token=${tokenData}`;
        return fetch(URL, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(imageToBaidu),
        }).then((res) => res.json());
    }

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

    onFacesDetected = async ({faces}) => {
        console.log('*************************************************************');
        if(faces.length <= 0) {
            return;
        }
        this.setState({
            faces,
        });
        if(faces.length > 1) {
            this.setState({
                wanningText: '只能解锁一人'
            });
        } else {
            console.log('---------------------------------' + JSON.stringify(faces[0]));
            // 最起码得有8个生物特征落入取景框内
            if(!faces[0].hasOwnProperty('leftEyePosition') || !faces[0].hasOwnProperty('rightEyePosition') ||
                !faces[0].hasOwnProperty('leftCheekPosition') || !faces[0].hasOwnProperty('rightCheekPosition') ||
                !faces[0].hasOwnProperty('leftMouthPosition') || !faces[0].hasOwnProperty('rightMouthPosition') ||
                !faces[0].hasOwnProperty('noseBasePosition') || !faces[0].hasOwnProperty('bottomMouthPosition')) {
                this.setState({
                    wanningText: '请将面容对准取景框内1'
                });
            } else {
                if(!this.positionInCameraView(faces[0].leftEyePosition) || !this.positionInCameraView(faces[0].rightEyePosition) ||
                    !this.positionInCameraView(faces[0].leftCheekPosition) || !this.positionInCameraView(faces[0].rightCheekPosition) ||
                    !this.positionInCameraView(faces[0].leftMouthPosition) || !this.positionInCameraView(faces[0].rightMouthPosition) ||
                    !this.positionInCameraView(faces[0].noseBasePosition) || !this.positionInCameraView(faces[0].bottomMouthPosition)) {
                    this.setState({
                        wanningText: '请将面容对准取景框内2'
                    });
                } else {
                    this.setState({
                        wanningText: '正在验证，请稍候',
                        faces,
                        isFaceDetected: true,
                        detectedNum: this.state.detectedNum += 1
                    });
                    const options = {quality: 0.1, base64: true, width: 480};
                    const data = await this.camera.takePictureAsync(options);

                    const baiduTokenAccess = await this.getBaiduAiToken();
                    const data1 = await this.camera.takePictureAsync({quality: 0.5, base64: true});
                    const faceLivenessObj = await this.getBaiduLiveness(data1.base64, baiduTokenAccess.access_token);
                    console.log('&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&' + JSON.stringify(faceLivenessObj));
                    if(faceLivenessObj.error_code === 0) {
                        if(faceLivenessObj.result.face_liveness > 0.98) {
                            console.log(data.base64);
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
                                        this.props.onSuccess(res.name.split('.')[0]);//
                                    }
                                }
                            });
                        } else {
                            this.setState({
                                isFaceDetected: false,
                                wanningText: `你可能使用了照片，请重新验证！`,
                            });
                        }
                    }

                }
            }
        }
    };

    onFaceDetectionError = state => console.warn('Faces detection error:', state);

    renderFace({ bounds, faceID, rollAngle, yawAngle }) {
        return (
            <View
                key={faceID}
                transform={[
                    { perspective: 600 },
                    { rotateZ: `${rollAngle.toFixed(0)}deg` },
                    { rotateY: `${yawAngle.toFixed(0)}deg` },
                ]}
                style={[
                    styles.face,
                    {
                        ...bounds.size,
                        left: bounds.origin.x,
                        top: bounds.origin.y,
                    },
                ]}
            >
            </View>
        );
    }

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
                permissionDialogTitle={'Permission to use camera'}
                permissionDialogMessage={'We need your permission to use your camera phone'}
            >
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
                {this.renderFaceScope()}
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
        position: 'absolute',
        borderColor: '#FFD700',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
});
