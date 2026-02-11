import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet, Animated } from 'react-native';
import { Colors } from '../constants/Theme';

const FloatingLabelInput = ({ label, value, onChangeText, ...props }) => {
    const [isFocused, setIsFocused] = useState(false);
    const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: (isFocused || value) ? 1 : 0,
            duration: 200,
            useNativeDriver: false,
        }).start();
    }, [isFocused, value]);

    const labelStyle = {
        position: 'absolute',
        left: 15,
        top: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [18, -10],
        }),
        fontSize: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [16, 12],
        }),
        color: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: ['#999', Colors.light.primary],
        }),
        backgroundColor: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: ['transparent', '#fff'],
        }),
        paddingHorizontal: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 5],
        }),
        zIndex: 1,
    };

    return (
        <View style={[styles.container, props.containerStyle]}>
            <Animated.Text style={labelStyle}>
                {label}
            </Animated.Text>
            <TextInput
                {...props}
                style={[styles.input, isFocused && styles.inputFocused, props.style]}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onChangeText={onChangeText}
                value={value}
                placeholder="" // Important: hide placeholder so label can act as one
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingTop: 10,
        marginBottom: 15,
    },
    input: {
        paddingHorizontal: 15,
        height: 56,
        borderWidth: 1,
        borderColor: '#e1e4e8',
        borderRadius: 12,
        fontSize: 16,
        color: '#000',
        backgroundColor: '#fff',
    },
    inputFocused: {
        borderColor: Colors.light.primary,
        borderWidth: 2,
    },
});

export default FloatingLabelInput;
