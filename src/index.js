/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, {Component, PureComponent} from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Image,
    Dimensions,
    Modal,
    TextInput,
    Button
} from 'react-native';

const {width, height} = Dimensions.get('window');

import {RtcEngine, AgoraView} from 'react-native-agora'

export default class RNAgoraExample extends Component {

    constructor(props) {
        super(props);
        this.ws = new WebSocket("ws://114.215.16.218:4061");
        this.state = {
            remotes: [],
            isJoinSuccess: false,
            isSpeaker: true,
            isMute: false,
            isCameraTorch: false,
            disableVideo: true,
            isHideButtons: false,
            visible: false,
            selectUid: undefined,
            localUid: -1,
            speakers: [],
            chatText: ''
        };
    }

    componentWillMount() {
        //初始化Agora
        const options = {
            appid: '324cbe8505a649bb9f157e6946fa832b',
            channelProfile: 1,
            videoProfile: 40,
            clientRole: 1,
            swapWidthAndHeight: true
        };
        RtcEngine.init(options);
        RtcEngine.setLocalRenderMode(3);
    }

    componentDidMount() {
        // websocket
        this.ws.onopen = () => {
            this.ws.send('mobile connect');
        };
        this.ws.onmessage = (e) => {
            if(e.data.includes('control_')) {
                const commingMessage = e.data.split('_');
                const uidControlled = commingMessage.pop();
                if(parseInt(uidControlled) === Math.abs(this.state.localUid)) {
                    if(e.data.includes('speaker')) {
                        this.setState({
                            isSpeaker: commingMessage[0] === 'true'
                        }, () => {
                            RtcEngine.setDefaultAudioRouteToSpeakerphone(this.state.isSpeaker);
                        })
                    } else if(e.data.includes('muteAllRemote')) {
                        this.setState({
                            isMute: commingMessage[0] === 'true'
                        }, () => {
                            RtcEngine.muteAllRemoteAudioStreams(this.state.isMute);
                        })
                    } else if(e.data.includes('displayRemote')) {
                        this.setState({
                            disableVideo: commingMessage[0] === 'true'
                        }, () => {
                            this.state.disableVideo ? RtcEngine.enableVideo() : RtcEngine.disableVideo()
                        })
                    } else if(e.data.includes('controlDisplay')) {
                        RtcEngine.enableLocalVideo(commingMessage[0] === 'true');
                    }
                }
            }
        };
        // 当前版本号
        RtcEngine.getSdkVersion((version) => {
            console.log(version)
        });

        //加入房间
        RtcEngine.joinChannel(this.props.roomName, Math.floor(Math.random() * 1002) + 102);

        // 启用说话者音量提示
        RtcEngine.enableAudioVolumeIndication(500,3);

        //所有的原生通知统一管理
        RtcEngine.eventEmitter({
            onFirstRemoteVideoDecoded: (data) => {
                console.log(data);
                const {remotes} = this.state;
                const newRemotes = [...remotes];
                // 存在断网重连导致回调多次该方法的情况，已加入过的远程视频不再重复添加
                if (!remotes.find(uid => uid === data.uid)) {
                    newRemotes.push(data.uid);
                }
                this.setState({remotes: newRemotes});
            },
            onUserOffline: (data) => {
                console.log(data);
                const {remotes} = this.state;
                const newRemotes = remotes.filter(uid => uid !== data.uid);
                this.setState({remotes: newRemotes});
            },
            onJoinChannelSuccess: (data) => {
                console.log(data);
                RtcEngine.startPreview();
                this.setState({
                    isJoinSuccess: true,
                    localUid: data.uid
                });
            },
            onAudioVolumeIndication: (data) => {
                // 声音回调
                console.log(data, '-----');
                ///alert(JSON.stringify(data));
                let speakerArr = [];
                for(let i = 0; i < data.speakers.length; i++) {
                    speakerArr.push(data.speakers[i].uid);
                }
                this.setState({
                    speakers: speakerArr
                });
            },
            onUserJoined: (data) => {
                console.log(data);
            },
            onError: (data) => {
                console.log(data);
                // 错误!

                if (data.err === 17) {
                    RtcEngine.leaveChannel();
                    RtcEngine.destroy();
                }

                const {onCancel} = this.props;
                onCancel(data.err)
            }
        })
    }

    componentWillUnmount() {
        RtcEngine.removeEmitter();
        this.ws.close();
    }

    handlerCancel = () => {
        RtcEngine.leaveChannel();
        RtcEngine.destroy();

        const {onCancel} = this.props;
        onCancel()
    };

    handlerSwitchCamera = () => {
        RtcEngine.switchCamera();
    };

    handlerMuteAllRemoteAudioStreams = () => {
        this.setState({
            isMute: !this.state.isMute
        }, () => {
            RtcEngine.muteAllRemoteAudioStreams(this.state.isMute);
        })
    };

    handlerSetEnableSpeakerphone = () => {
        this.setState({
            isSpeaker: !this.state.isSpeaker
        }, () => {
            RtcEngine.setDefaultAudioRouteToSpeakerphone(this.state.isSpeaker);
        });
    };

    handlerChangeCameraTorch = () => {
        this.setState({
            isCameraTorch: !this.state.isCameraTorch
        }, () => {
            RtcEngine.setCameraTorchOn(this.state.isCameraTorch);
        });
    };

    handlerChangeVideo = () => {
        this.setState({
            disableVideo: !this.state.disableVideo
        }, () => {
            this.state.disableVideo ? RtcEngine.enableVideo() : RtcEngine.disableVideo()
        })
    };

    handlerHideButtons = () => {
        this.setState({
            isHideButtons: !this.state.isHideButtons
        })
    };

    onPressSendChat = () => {
        this.ws.send(`---chat:${this.state.localUid}:${this.state.chatText}`);
        this.setState({chatText: ''});
        this.textInput.clear();
    };

    onPressVideo = (uid) => {
        this.setState({
            selectUid: uid
        }, () => {
            this.setState({
                visible: true
            })
        })
    };

    render() {
        const {isMute, isSpeaker, isCameraTorch, disableVideo, isHideButtons, remotes, isJoinSuccess, visible} = this.state;

        if (!isJoinSuccess) {
            return (
                <View style={{flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center'}}>
                    <Text>正在创建视频会议...</Text>
                </View>
            )
        }

        return <View
            style={styles.viewContainer}>
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={this.handlerHideButtons}
                    style={styles.container}
                >
                    <AgoraView style={styles.localView} showLocalVideo={true}/>
                    <View style={styles.absView}>
                        {!visible ?
                            <View style={styles.videoView}>
                                {remotes.map((v, k) => {
                                    return (
                                        <TouchableOpacity
                                            activeOpacity={1}
                                            onPress={() => this.onPressVideo(v)}
                                            key={k}
                                        >
                                            <AgoraView
                                                style={styles.remoteView}
                                                zOrderMediaOverlay={true}
                                                remoteUid={v}
                                            />
                                            {(this.state.speakers.indexOf(v) !== -1) ?
                                                <View style={styles.innerCircleSpeaker}/> : <View/>}
                                        </TouchableOpacity>
                                    )
                                })}
                            </View> : <View style={styles.videoView}/>
                        }

                        {!isHideButtons &&
                        <View>
                            <OperateButton
                                style={{alignSelf: 'center', marginBottom: -10}}
                                onPress={this.handlerCancel}
                                imgStyle={{width: 60, height: 60}}
                                source={require('../images/btn_endcall.png')}
                            />
                            <View style={styles.bottomView}>
                                <OperateButton
                                    onPress={this.handlerChangeCameraTorch}
                                    source={isCameraTorch ? require('../images/flash_on.png') : require('../images/flash_off.png')}
                                />
                                <OperateButton
                                    onPress={this.handlerChangeVideo}
                                    source={disableVideo ? require('../images/camera_on.png') : require('../images/camera_off.png')}
                                />
                            </View>
                            <View style={styles.bottomView}>
                                <OperateButton
                                    onPress={this.handlerMuteAllRemoteAudioStreams}
                                    source={isMute ? require('../images/icon_muted.png') : require('../images/btn_mute.png')}
                                />
                                <OperateButton
                                    onPress={this.handlerSwitchCamera}
                                    source={require('../images/btn_switch_camera.png')}
                                />
                                <OperateButton
                                    onPress={this.handlerSetEnableSpeakerphone}
                                    source={!isSpeaker ? require('../images/icon_speaker.png') : require('../images/btn_speaker.png')}
                                />
                            </View>
                        </View>
                        }
                    </View>

                    <Modal
                        visible={visible}
                        presentationStyle={'fullScreen'}
                        animationType={'slide'}
                        onRequestClose={() => {
                        }}
                    >
                        <TouchableOpacity
                            activeOpacity={1}
                            style={{flex: 1}}
                            onPress={() => this.setState({
                                visible: false
                            })}
                        >
                            <AgoraView
                                style={{flex: 1}}
                                zOrderMediaOverlay={true}
                                remoteUid={this.state.selectUid}
                            />
                        </TouchableOpacity>
                    </Modal>
                </TouchableOpacity>
            <View style={styles.chatView}>
                <TextInput
                    style={{height: 40, flexGrow: 20}}
                    placeholder="输入聊天内容!"
                    ref={input => { this.textInput = input }}
                    onChangeText={(text) => this.setState({chatText: text})}
                />
                <Button
                    onPress={this.onPressSendChat}
                    style={{height: 40}}
                    title="发送"
                    color="#841584"
                />
            </View>
        </View>;
    }
}

class OperateButton extends PureComponent {
    render() {

        const {onPress, source, style, imgStyle = {width: 50, height: 50}} = this.props;

        return (
            <TouchableOpacity
                style={style}
                onPress={onPress}
                activeOpacity={.7}
            >
                <Image
                    style={imgStyle}
                    source={source}
                />
            </TouchableOpacity>
        )
    }
}

const styles = StyleSheet.create({
    viewContainer: {
        flex: 1,
        flexDirection: 'column',
        flexGrow: 9
    },
    container: {
        flex: 1,
        backgroundColor: '#F4F4F4'
    },
    absView: {
        position: 'absolute',
        top: 20,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'space-between',
    },
    videoView: {
        padding: 5,
        flexWrap: 'wrap',
        flexDirection: 'row',
        zIndex: 100
    },
    localView: {
        width: width - 10,
        height: height,
        margin: 5
    },
    remoteView: {
        width: (width - 40) / 3,
        height: (width - 40) / 3,
        margin: 5
    },
    bottomView: {
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-around'
    },
    innerCircleSpeaker: {
        borderRadius: 6,
        width: 12,
        height: 12,
        backgroundColor: 'red',
        marginTop: -20,
        marginLeft: 10
    },
    chatView: {
        flexDirection: 'row',
    }
});