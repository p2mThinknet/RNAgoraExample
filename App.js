/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, {Component} from 'react';
import {
    ImageBackground,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ListView,
    TouchableHighlight
} from 'react-native';
import DrawerLayout from 'react-native-drawer-layout';
import Dialog from "react-native-dialog";

import VideoComference from './src/videoComference';
import FaceDetectSignIn from './src/faceDetectSignIn';
import Header from './component/head';
import Footer from './component/footer';

export default class App extends Component<{}> {
    constructor(props) {
        super(props);
        this.ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
        this.serverAdd = '114.215.16.218:4060';
        this.state = {
            showLive: false,
            err: undefined,
            signInMessage: '',
            roomName: undefined,
            dialogVisible: false,
            conferenceCreatedName: '',
            dataSource: this.ds.cloneWithRows([]),
            signInVideoConference: false,
            signSuccess: false,
            userName: ''
        };
    }

    getAllConference() {
        const URL = `http://${this.serverAdd}/api/allConferences`;
        return fetch(URL)
            .then((res) => res.json());
    }

    createConference(name) {
        const URL = `http://${this.serverAdd}/api/createConference`;
        return fetch(URL, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name
            }),
        }).then((res) => res.json());
    }

    componentDidMount() {
        this.fetchAllConferences();
    }

    fetchAllConferences() {
        const self = this;
        this.getAllConference().then((res) => {
            if(res.success) {
                let allConferances = [];
                for(let i = 0; i < res.result.length; i++) {
                    allConferances.push(res.result[i].name);
                }
                if(this.state.signSuccess) {
                    self.setState({dataSource: this.ds.cloneWithRows(allConferances)});
                } else {
                    self.setState({dataSource: this.ds.cloneWithRows([])});
                }
            } else {
                self.setState({dataSource: this.ds.cloneWithRows([])});
            }
        });
    }

    handleSignIn = () => {
        this.setState({
            signInVideoConference: true
        });
    };

    handleJoin = () => {
        if(this.state.roomName === undefined) {
            alert('请选择某一房间号!');
        } else {
            this.setState({
                showLive: true
            });
        }
    };

    handleCreate = () => {
        this.setState({ dialogVisible: true });
    };

    handleCreateCancle = () => {
        this.setState({ dialogVisible: false });
    };

    handleCreateConfirm = () => {
        this.setState({ dialogVisible: false });
        const self = this;
        self.createConference(this.state.conferenceCreatedName).then((res) => {
            if(res.success) {
                self.setState({roomName: this.state.conferenceCreatedName});
                this.handleJoin()
            } else {
                alert('创建视频会议失败!');
            }
        })
    };

    handleCancel = (info) => {
        this.setState({
            showLive: false,
            signInMessage: info
        });
    };

    handleSignInCancel = (info) => {
        this.setState({
            signInVideoConference: false,
            signInMessage: info,
            signSuccess: false,
        })
    };

    handleSignInSuccess = (userName) => {
        this.setState({
            signInVideoConference: false,
            signSuccess: true,
            signInMessage: `欢迎你!${userName}`,
            userName
        })
    };

    handleSignInFailed = (info) => {
        this.setState({
            signInVideoConference: false,
            signInMessage: info,
            signSuccess: false,
        })
    };

    _pressRow(rowID)  {
        this.setState({roomName: rowID});
        this.refs['DRAWER'].closeDrawer();
    };

    drawerOpen = () => {
        this.fetchAllConferences();
    };

    getAllConferences = () => {
        this.fetchAllConferences();
    };

    _renderButtons() {
        if(this.state.signSuccess) {
            return <View style={{flex:1, flexDirection:'row', justifyContent:'center'}}>
                <TouchableOpacity
                    style={styles.button}
                    onPress={this.handleJoin}
                >
                    <Text style={{color: '#fff'}}>进入视频会议</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.button}
                    onPress={this.handleCreate}
                >
                    <Text style={{color: '#fff'}}>创建视频会议</Text>
                </TouchableOpacity>
            </View>
        } else {
            return <TouchableOpacity
                style={styles.button}
                onPress={this.handleSignIn}
            >
                <Text style={{color: '#fff'}}>会议签到</Text>
            </TouchableOpacity>
        }
    }

    _renderRow(rowData: string) {
        return (
            <View>
                <TouchableHighlight onPress={this._pressRow.bind(this, rowData)}>
                    <View>
                        <Text style={styles.text}>{rowData}</Text>
                    </View>
                </TouchableHighlight>
            </View>
        )
    }

    render() {
        const {showLive, err, signInVideoConference} = this.state;
        const navigationView = (
            <View style={{flex: 1, backgroundColor: '#fff'}}>
                <ListView
                    style={styles.listviewContainer}
                    dataSource={this.state.dataSource}
                    renderRow={this._renderRow.bind(this)}
                    renderHeader = {() => <Header />}
                    renderFooter={() => <Footer getAllConferences={this.getAllConferences.bind(this)}/>}
                    onEndReached = {() => console.log('')}
                    enableEmptySections
                    renderSeparator = {(sectionID, rowID) =>
                        <View
                            style={styles.style_separator}
                            key={`${sectionID} - ${rowID}`}
                        />}
                />
            </View>
        );
        if(signInVideoConference) {
            return (<FaceDetectSignIn
                        onCancel={this.handleSignInCancel}
                        onSuccess={this.handleSignInSuccess}
                        onFailed={this.handleSignInFailed}
                    />
            )
        } else {
            if (showLive) {
                return (
                    <VideoComference
                        onCancel={this.handleCancel}
                        roomName={this.state.roomName}
                        userName={this.state.userName}
                    />
                )
            } else {
                return <DrawerLayout
                    drawerWidth={200}
                    drawerPosition={DrawerLayout.positions.Left}
                    onDrawerOpen={this.drawerOpen}
                    renderNavigationView={() => navigationView}
                    ref={'DRAWER'}>
                    <ImageBackground
                        style={ styles.imgBackground }
                        resizeMode='cover'
                        source={require('./images/background_bk.png')}>
                        <View style={styles.container}>
                            <View  style={styles.title}>
                                <Text style={styles.titleText}>党务视频会议系统</Text>
                            </View>
                            <View  style={styles.signInMessage}>
                                <Text style={styles.signInText}>{this.state.signInMessage}</Text>
                            </View>
                            <View style={styles.buttonGroup}>
                                {!!err &&
                                <Text>错误代码 {err}</Text>
                                }
                                {this._renderButtons()}
                            </View>
                        </View>
                    </ImageBackground>
                    <Dialog.Container visible={this.state.dialogVisible}>
                        <Dialog.Title>创建视频会议</Dialog.Title>
                        <Dialog.Description>
                            请填写本次视频会议名称
                        </Dialog.Description>
                        <Dialog.Input
                            onChangeText={(text) => this.setState({conferenceCreatedName: text})}/>
                        <Dialog.Button label="取消" onPress={this.handleCreateCancle} />
                        <Dialog.Button label="确定" onPress={this.handleCreateConfirm} />
                    </Dialog.Container>
                </DrawerLayout>
            }
        }
    }
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listviewContainer: {
        flex: 1,
        marginTop: 20,
    },
    welcome: {
        fontSize: 20,
        textAlign: 'center',
        margin: 10,
    },
    instructions: {
        textAlign: 'center',
        color: '#333333',
        marginBottom: 5,
    },
    button: {
        height: 44,
        paddingHorizontal:20,
        backgroundColor:'#6A71DD',
        borderRadius:10,
        justifyContent:'center',
        alignItems:'center',
        marginTop: 10,
        marginRight:10
    },
    text: {
        marginLeft: 12,
        fontSize: 16,
    },
    style_separator: {
        flex: 1,
        height: StyleSheet.hairlineWidth,
        backgroundColor: '#8E8E8E',
    },
    imgBackground: {
        width: '100%',
        height: '100%',
        flex: 1
    },
    buttonGroup: {
        position: 'absolute',
        bottom: 20,
        flexDirection:'row'
    },
    title: {
        position: 'absolute',
        top: 100,
    },
    titleText: {
        fontSize: 28,
        color: '#ffffff'
    },
    signInMessage: {
        position: 'absolute',
        top: 150
    },
    signInText: {
        fontSize: 18,
        color: '#ffffff',
    }
});
