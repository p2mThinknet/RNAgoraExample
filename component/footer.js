import React, {Component} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ListView} from 'react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    button: {
        borderColor: '#8E8E8E',
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
    },
    text: {
        color: '#8E8E8E',
    },
});

export default class Footer extends Component<props> {
    constructor(props) {
        super(props);
    }

    handleGetAllConferences() {
        this.props.getAllConferences();
    }

    render() {
        return (
            <View style={styles.container}>
                <TouchableOpacity style={styles.button} onPress={this.handleGetAllConferences.bind(this)}>
                    <Text style={styles.text}>刷新会议列表</Text>
                </TouchableOpacity>
            </View>
        )
    }
}
// const Footer = (props) => (
//     <View style={styles.container}>
//         <TouchableOpacity style={styles.button} onPress={() => console.log('load more')}>
//             <Text style={styles.text}>刷新会议列表</Text>
//         </TouchableOpacity>
//     </View>
// );

// export default Footer;