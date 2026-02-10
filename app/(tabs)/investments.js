import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../../constants/Theme';
import { useTransactions } from '../../hooks/useTransactions';
import { TrendingUp, CircleDollarSign, Coins, Gem, Plus, Edit3, X, ArrowUpRight, History, ShieldCheck } from 'lucide-react-native';
import Animated, { FadeInUp, FadeInRight, Layout } from 'react-native-reanimated';
import CustomPopup from '../../components/CustomPopup';

const { width } = Dimensions.get('window');

export default function InvestmentScreen() {
    const insets = useSafeAreaInsets();
    const { data, updateInvestments, topUpInvestment } = useTransactions();

    // UI State
    const [actionModal, setActionModal] = useState({ visible: false, mode: 'topup', id: null, name: '' });
    const [inputValue, setInputValue] = useState('');
    const [popup, setPopup] = useState({ visible: false, type: 'success', title: '', message: '' });

    const investmentTypes = [
        { id: 'stocks', name: 'Stocks', icon: TrendingUp, color: '#3B82F6', gradient: ['#3B82F6', '#2563EB'] },
        { id: 'gold', name: 'Gold', icon: Gem, color: '#F59E0B', gradient: ['#F59E0B', '#D97706'] },
        { id: 'crypto', name: 'Crypto', icon: Coins, color: '#8B5CF6', gradient: ['#8B5CF6', '#7C3AED'] },
        { id: 'mutualFunds', name: 'Mutual Funds', icon: CircleDollarSign, color: '#10B981', gradient: ['#10B981', '#059669'] },
    ];

    const totalInvested = useMemo(() =>
        Object.values(data.investments).reduce((s, v) => s + (Number(v) || 0), 0)
        , [data.investments]);

    const handleAction = () => {
        const amt = parseFloat(inputValue);
        if (isNaN(amt) || amt < 0) return;

        if (actionModal.mode === 'topup') {
            topUpInvestment(actionModal.id, amt);
            setPopup({
                visible: true,
                type: 'success',
                title: 'Top-up Successful',
                message: `₹${amt.toLocaleString()} added to your ${actionModal.name} portfolio.`
            });
        } else {
            updateInvestments(actionModal.id, amt);
            setPopup({
                visible: true,
                type: 'success',
                title: 'Portfolio Adjusted',
                message: `${actionModal.name} balance updated to ₹${amt.toLocaleString()}.`
            });
        }

        setActionModal({ ...actionModal, visible: false });
        setInputValue('');
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header Section */}
                <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
                    <View>
                        <Text style={styles.headerSubtitle}>Wealth Portfolio</Text>
                        <Text style={styles.headerTitle}>Investments</Text>
                    </View>
                    <View style={styles.historyBtn}>
                        <ShieldCheck size={20} color={Colors.light.primary} />
                    </View>
                </Animated.View>

                {/* Main Portfolio Card */}
                <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.mainCard}>
                    <Text style={styles.mainLabel}>Current Net Worth</Text>
                    <Text style={styles.mainValue}>₹ {totalInvested.toLocaleString()}</Text>
                    <View style={styles.badgeRow}>
                        <View style={styles.badge}>
                            <ArrowUpRight size={12} color="#059669" />
                            <Text style={styles.badgeText}>Live Tracking</Text>
                        </View>
                    </View>
                </Animated.View>

                <Text style={styles.sectionTitle}>Asset Allocation</Text>

                {/* Asset Cards */}
                {investmentTypes.map((type, index) => {
                    const Icon = type.icon;
                    const balance = Number(data.investments[type.id]) || 0;
                    const percentage = totalInvested > 0 ? (balance / totalInvested * 100).toFixed(1) : 0;

                    return (
                        <Animated.View
                            key={type.id}
                            entering={FadeInUp.delay(300 + index * 100).duration(600)}
                            layout={Layout.springify()}
                            style={styles.assetCard}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: type.color + '15' }]}>
                                <Icon color={type.color} size={24} />
                            </View>

                            <View style={styles.assetInfo}>
                                <View style={styles.assetHeader}>
                                    <Text style={styles.assetName}>{type.name}</Text>
                                    <View style={styles.shareBadge}>
                                        <Text style={[styles.shareText, { color: type.color }]}>{percentage}%</Text>
                                    </View>
                                </View>
                                <Text style={styles.assetValue}>₹ {balance.toLocaleString()}</Text>

                                {/* Progress bar for allocation */}
                                <View style={styles.progressTrack}>
                                    <View style={[styles.progressBar, { width: `${percentage}%`, backgroundColor: type.color }]} />
                                </View>
                            </View>

                            <View style={styles.actionColumn}>
                                <TouchableOpacity
                                    style={styles.topupBtn}
                                    onPress={() => {
                                        setActionModal({ visible: true, mode: 'topup', id: type.id, name: type.name });
                                        setInputValue('');
                                    }}
                                >
                                    <Plus size={18} color="#fff" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.editBtn}
                                    onPress={() => {
                                        setActionModal({ visible: true, mode: 'edit', id: type.id, name: type.name });
                                        setInputValue(balance > 0 ? balance.toString() : '');
                                    }}
                                >
                                    <Edit3 size={14} color="#666" />
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    );
                })}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Action Modal */}
            <Modal visible={actionModal.visible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.modalBlur} activeOpacity={1} onPress={() => setActionModal({ ...actionModal, visible: false })} />
                    <View style={styles.modalContent}>
                        <View style={styles.modalIndicator} />
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {actionModal.mode === 'topup' ? 'Top-up' : 'Adjust'} {actionModal.name}
                            </Text>
                            <TouchableOpacity onPress={() => setActionModal({ ...actionModal, visible: false })}>
                                <X size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalLabel}>
                            {actionModal.mode === 'topup' ? 'Enter amount to add' : 'Enter new total balance'}
                        </Text>

                        <View style={styles.inputWrapper}>
                            <Text style={styles.currencyPrefix}>₹</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={inputValue}
                                onChangeText={setInputValue}
                                keyboardType="numeric"
                                autoFocus
                                placeholder="0.00"
                            />
                        </View>

                        <TouchableOpacity style={styles.submitBtn} onPress={handleAction}>
                            <Text style={styles.submitBtnText}>Confirm {actionModal.mode === 'topup' ? 'Top-up' : 'Update'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <CustomPopup
                visible={popup.visible}
                type={popup.type}
                title={popup.title}
                message={popup.message}
                onClose={() => setPopup({ ...popup, visible: false })}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    scrollContent: { padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    headerSubtitle: { fontSize: 13, color: '#64748B', fontWeight: '600', letterSpacing: 0.5 },
    headerTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
    historyBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
    mainCard: { backgroundColor: '#0F172A', borderRadius: 32, padding: 30, marginBottom: 30, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 15 },
    mainLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' },
    mainValue: { color: '#fff', fontSize: 36, fontWeight: '900', marginTop: 8 },
    badgeRow: { flexDirection: 'row', marginTop: 15 },
    badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '700', marginLeft: 6 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 15 },
    assetCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, borderWidth: 1, borderColor: '#F1F5F9' },
    iconContainer: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    assetInfo: { flex: 1, marginLeft: 16, marginRight: 10 },
    assetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    assetName: { fontSize: 14, fontWeight: '700', color: '#64748B' },
    shareBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: '#F8FAFC' },
    shareText: { fontSize: 10, fontWeight: '800' },
    assetValue: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginTop: 2 },
    progressTrack: { height: 4, backgroundColor: '#F1F5F9', borderRadius: 2, marginTop: 12, overflow: 'hidden' },
    progressBar: { height: '100%', borderRadius: 2 },
    actionColumn: { alignItems: 'center' },
    topupBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    editBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBlur: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 30, paddingBottom: 50 },
    modalIndicator: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
    modalLabel: { fontSize: 14, color: '#64748B', fontWeight: '600', marginBottom: 15 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 20, paddingHorizontal: 20, marginBottom: 30, borderWidth: 1, borderColor: '#E2E8F0' },
    currencyPrefix: { fontSize: 24, fontWeight: '800', color: '#64748B', marginRight: 10 },
    modalInput: { flex: 1, paddingVertical: 20, fontSize: 32, fontWeight: '900', color: '#0F172A' },
    submitBtn: { backgroundColor: '#0F172A', paddingVertical: 20, borderRadius: 20, alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' }
});
