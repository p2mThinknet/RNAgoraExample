/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, {Component} from 'react';
import {
    Platform,
    ImageBackground,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    DrawerLayoutAndroid,
    ListView,
    TouchableHighlight
} from 'react-native';
import PopupDialog, { SlideAnimation, DialogTitle } from 'react-native-popup-dialog';
import Dialog from "react-native-dialog";

import ConferenceComponet from './src';
import Header from './component/head';
import Footer from './component/footer';

export default class App extends Component<{}> {
    constructor(props) {
        super(props);
        this.ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
        this.state = {
            showLive: false,
            err: undefined,
            roomName: undefined,
            dialogVisible: false,
            conferenceCreatedName: '',
            dataSource: this.ds.cloneWithRows([])
        };
    }

    getAllConference() {
        const URL = 'http://114.215.16.218:4060/api/allConferences';
        return fetch(URL)
            .then((res) => res.json());
    }

    createConference(name) {
        const URL = 'http://114.215.16.218:4060/api/createConference';
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
                self.setState({dataSource: this.ds.cloneWithRows(allConferances)});
            } else {
                self.setState({dataSource: this.ds.cloneWithRows([])});
            }
        });
    }

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

    handleCancel = (err) => {
        this.setState({
            showLive: false,
            err
        });
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
        const {showLive, err} = this.state;
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
        if (showLive) {
            return (
                <ConferenceComponet
                    onCancel={this.handleCancel}
                    roomName={this.state.roomName}
                />
            )
        } else {
            return <DrawerLayoutAndroid
                drawerWidth={200}
                drawerPosition={DrawerLayoutAndroid.positions.Left}
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
                        <View style={styles.buttonGroup}>
                        {!!err &&
                        <Text>错误代码 {err}</Text>
                        }
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
            </DrawerLayoutAndroid>
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
    }
});
