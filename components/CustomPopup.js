import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Colors } from '../constants/Theme';
import { AlertCircle, CheckCircle2, XCircle, Info } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function CustomPopup({
    visible,
    type = 'info', // 'success', 'error', 'confirm', 'info'
    title,
    message,
    onClose,
    onConfirm,
    confirmText = 'Confirm',
    cancelText = 'Cancel'
}) {
    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle2 color={Colors.light.success} size={48} />;
            case 'error': return <XCircle color={Colors.light.danger} size={48} />;
            case 'confirm': return <AlertCircle color={Colors.light.accent} size={48} />;
            default: return <Info color={Colors.light.info} size={48} />;
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <View style={styles.iconContainer}>{getIcon()}</View>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.footer}>
                        {type === 'confirm' ? (
                            <>
                                <TouchableOpacity
                                    style={[styles.btn, styles.cancelBtn]}
                                    onPress={onClose}
                                >
                                    <Text style={styles.cancelBtnText}>{cancelText}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.btn, styles.confirmBtn]}
                                    onPress={() => { onConfirm(); onClose(); }}
                                >
                                    <Text style={styles.confirmBtnText}>{confirmText}</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <TouchableOpacity
                                style={[styles.btn, styles.confirmBtn, { width: '100%' }]}
                                onPress={onClose}
                            >
                                <Text style={styles.confirmBtnText}>Dismiss</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    content: {
        width: width * 0.85,
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10
    },
    iconContainer: {
        marginBottom: 20
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#000',
        marginBottom: 10,
        textAlign: 'center'
    },
    message: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 30
    },
    footer: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between'
    },
    btn: {
        flex: 1,
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center'
    },
    confirmBtn: {
        backgroundColor: Colors.light.primary,
        marginLeft: 8
    },
    cancelBtn: {
        backgroundColor: '#f5f5f5',
        marginRight: 8
    },
    confirmBtnText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 16
    },
    cancelBtnText: {
        color: '#666',
        fontWeight: '700',
        fontSize: 16
    }
});
