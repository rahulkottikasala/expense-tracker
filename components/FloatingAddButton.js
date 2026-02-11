import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet, Text, Pressable, Dimensions } from 'react-native';
import { Plus, ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';
import { Colors } from '../constants/Theme';
import { useRouter } from 'expo-router';

export default function FloatingAddButton() {
    const [isOpen, setIsOpen] = useState(false);
    const animation = useRef(new Animated.Value(0)).current;
    const staggerAnim = useRef(new Animated.Value(0)).current;
    const router = useRouter();

    const toggleMenu = () => {
        const toValue = isOpen ? 0 : 1;

        Animated.parallel([
            Animated.spring(animation, {
                toValue,
                friction: 6,
                tension: 40,
                useNativeDriver: true,
            }),
            Animated.spring(staggerAnim, {
                toValue,
                friction: 8,
                tension: 30,
                useNativeDriver: true,
                delay: isOpen ? 0 : 40,
            })
        ]).start();

        setIsOpen(!isOpen);
    };

    const rotation = animation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '225deg'],
    });

    const incomeTranslateX = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -75],
    });
    const incomeTranslateY = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -110],
    });

    const expenseTranslateX = staggerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 75],
    });
    const expenseTranslateY = staggerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -110],
    });

    const opacity = animation.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0, 1],
    });

    const goTo = (path) => {
        toggleMenu();
        setTimeout(() => router.push(path), 100);
    };

    return (
        <View style={styles.container} pointerEvents="box-none">
            {/* Overlay - Only active when open */}
            {isOpen && (
                <Pressable
                    onPress={toggleMenu}
                    style={styles.overlay}
                />
            )}

            {/* Income Button */}
            <Animated.View style={[
                styles.secondaryButton,
                {
                    transform: [
                        { translateX: incomeTranslateX },
                        { translateY: incomeTranslateY },
                        { scale: animation }
                    ],
                    opacity: animation,
                }
            ]}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.innerButton, { backgroundColor: '#DCFCE7' }]}
                    onPress={() => goTo('/income')}
                >
                    <ArrowUpRight color={Colors.light.success} size={24} strokeWidth={2.5} />
                </TouchableOpacity>
                <View style={[styles.labelWrapper]}>
                    <Text style={styles.labelText}>Income</Text>
                </View>
            </Animated.View>

            {/* Expense Button */}
            <Animated.View style={[
                styles.secondaryButton,
                {
                    transform: [
                        { translateX: expenseTranslateX },
                        { translateY: expenseTranslateY },
                        { scale: staggerAnim }
                    ],
                    opacity: staggerAnim,
                }
            ]}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.innerButton, { backgroundColor: '#FEE2E2' }]}
                    onPress={() => goTo('/expense')}
                >
                    <ArrowDownLeft color={Colors.light.danger} size={24} strokeWidth={2.5} />
                </TouchableOpacity>
                <View style={[styles.labelWrapper]}>
                    <Text style={styles.labelText}>Expense</Text>
                </View>
            </Animated.View>

            {/* Main Toggle Button */}
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={toggleMenu}
                style={styles.mainButton}
            >
                <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                    <Plus color="#fff" size={36} strokeWidth={3} />
                </Animated.View>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 80,
        height: 80,
        zIndex: 100,
    },
    overlay: {
        position: 'absolute',
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
        bottom: -55, // Negative offset to compensate for the button's lift
        backgroundColor: 'transparent', // Changed to transparent to avoid clipping issues while still catching touches
    },
    mainButton: {
        width: 75,
        height: 75,
        borderRadius: 40,
        backgroundColor: Colors.light.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.light.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 10,
        bottom: 45, // Lifted state
    },
    secondaryButton: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        bottom: 45, // Relative to the main button's home
    },
    innerButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    labelWrapper: {
        marginTop: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    labelText: {
        color: '#1e293b',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
});
