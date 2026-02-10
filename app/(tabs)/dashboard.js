import React, { useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../../constants/Theme';
import { useTransactions } from '../../hooks/useTransactions';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import {
    ArrowUpCircle, ArrowDownCircle, Briefcase, Plus, Bell, TrendingUp, X, Landmark, Activity, CreditCard,
    TrendingDown, Clock, ArrowRight, History, Shield, PiggyBank, HeartHandshake, AlertTriangle
} from 'lucide-react-native';
import CustomPopup from '../../components/CustomPopup';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useRouter } from 'expo-router';

const screenWidth = Dimensions.get("window").width;

export default function Dashboard() {
    const {
        data, balance, totalIncome, totalExpenses, totalEMIs, totalBankBalance, totalEMIOutstanding, nextMonthNeeded,
        addIncome, confirmEMIPayment, addBank, takeMonthlySnapshot, loading
    } = useTransactions();
    const router = useRouter();
    const [quickAddVisible, setQuickAddVisible] = useState(false);
    const [quickTitle, setQuickTitle] = useState('');
    const [quickAmount, setQuickAmount] = useState('');
    const [quickType, setQuickType] = useState('daily');

    const [bankModalVisible, setBankModalVisible] = useState(false);
    const [bankName, setBankName] = useState('');
    const [bankBal, setBankBal] = useState('');

    const [popup, setPopup] = useState({ visible: false, type: 'info', title: '', message: '', confirmAction: null });

    const now = new Date();
    const todayDay = now.getDate();
    const currentMonthYear = now.toLocaleString('default', { month: 'short', year: 'numeric' });
    const todayStr = now.toLocaleDateString();

    const dailyIncome = useMemo(() => {
        return (data.income || [])
            .filter(item => item.date === todayStr)
            .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    }, [data.income, todayStr]);

    const dailyExpense = useMemo(() => {
        return (data.expenses || [])
            .filter(item => item.date === todayStr)
            .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    }, [data.expenses, todayStr]);

    if (loading) return <View style={styles.container}><Text>Loading...</Text></View>;

    const handleQuickAdd = (type, title) => {
        setQuickType(type);
        setQuickTitle(title);
        setQuickAddVisible(true);
    };

    const submitQuickAdd = () => {
        if (!quickAmount) return;
        addIncome({
            name: quickTitle,
            amount: parseFloat(quickAmount),
            type: quickType,
            date: new Date().toLocaleDateString(),
        });
        setQuickAmount('');
        setQuickAddVisible(false);
    };

    const handleAddBank = () => {
        if (!bankName || !bankBal) return;
        addBank(bankName, bankBal);
        setBankName('');
        setBankBal('');
        setBankModalVisible(false);
    };

    const showPopup = (type, title, message, confirmAction = null) => {
        setPopup({ visible: true, type, title, message, confirmAction });
    };

    const pendingEMIs = (data?.emis || []).filter(e => {
        if (e.status === 'closed') return false;
        // Don't show if EMI starts in the future (next month)
        if (e.startNextMonth && e.lastPaidMonth === undefined) return false;

        const isPaidThisMonth = e.lastPaidMonth === currentMonthYear;
        if (isPaidThisMonth) return false;
        const emiDay = parseInt(e.date);
        const daysUntilDue = emiDay - todayDay;
        return daysUntilDue <= 15; // Show if due within 15 days or overdue
    });

    const barData = {
        labels: ["Inc", "Exp", "EMI", "Inv"],
        datasets: [{ data: [totalIncome / 1000, totalExpenses / 1000, totalEMIs / 1000, Object.values(data.investments).reduce((s, v) => s + Number(v), 0) / 1000] }]
    };

    const categoryData = [
        { name: "Food", amt: data.expenses.filter(e => e.category === 'Food').reduce((s, e) => s + Number(e.amount), 0), color: "#F87171" },
        { name: "Rent", amt: data.expenses.filter(e => e.category === 'Rent').reduce((s, e) => s + Number(e.amount), 0), color: "#60A5FA" },
        { name: "Other", amt: data.expenses.filter(e => !['Food', 'Rent'].includes(e.category)).reduce((s, e) => s + Number(e.amount), 0), color: "#A78BFA" },
    ].filter(c => c.amt > 0).map(c => ({ ...c, population: c.amt, legendFontColor: "#7F7F7F", legendFontSize: 12 }));

    const lineData = {
        labels: (data.historicalStats || []).slice(-5).map(s => s.month),
        datasets: [{
            data: (data.historicalStats || []).slice(-5).map(s => s.income / 1000),
            color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
        }, {
            data: (data.historicalStats || []).slice(-5).map(s => s.expenses / 1000),
            color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
        }]
    };

    const chartConfig = {
        backgroundColor: "#fff",
        backgroundGradientFrom: "#fff",
        backgroundGradientTo: "#fff",
        color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        barPercentage: 0.6,
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: Colors.light.primary, letterSpacing: -0.5 }}>Nexus CashFlow</Text>
                    <Text style={{ fontSize: 12, color: '#666', fontWeight: '600' }}>Your Financial Command Center</Text>
                </View>
                {/* Bank Card */}
                <Animated.View entering={FadeInUp.delay(100)} style={styles.bankCard}>
                    <View style={styles.bankHeader}>
                        <Landmark color="#fff" size={20} />
                        <Text style={styles.bankTitle}>Aggregate Bank Balance</Text>
                        <TouchableOpacity onPress={() => setBankModalVisible(true)}>
                            <Plus color="#fff" size={20} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.totalBankAmt}>₹ {totalBankBalance.toLocaleString()}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bankList}>
                        {(data?.banks || []).map(bank => (
                            <View key={bank.id} style={styles.bankItem}>
                                <Text style={styles.bankItemName}>{bank.name}</Text>
                                <Text style={styles.bankItemBal}>₹{bank.balance.toLocaleString()}</Text>
                            </View>
                        ))}
                        {data?.banks?.length === 0 && <Text style={{ color: '#fff', opacity: 0.6 }}>No banks added</Text>}
                    </ScrollView>
                </Animated.View>

                {/* Savings & Debt Row */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryRowScroll}>
                    <Animated.View entering={FadeInUp.delay(200)} style={styles.summaryCardSmall}>
                        <Text style={styles.summaryTitle}>Liquid Cash</Text>
                        <Text style={styles.summaryAmount}>₹ {totalBankBalance.toLocaleString()}</Text>
                    </Animated.View>
                    <Animated.View entering={FadeInUp.delay(250)} style={styles.summaryCardSmall}>
                        <Text style={styles.summaryTitle}>Next Month Need</Text>
                        <Text style={[styles.summaryAmount, { color: Colors.light.accent }]}>₹ {nextMonthNeeded?.toLocaleString()}</Text>
                    </Animated.View>
                    <Animated.View entering={FadeInUp.delay(300)} style={styles.summaryCardSmall}>
                        <Text style={styles.summaryTitle}>Loan Debt</Text>
                        <Text style={[styles.summaryAmount, { color: Colors.light.danger }]}>₹ {totalEMIOutstanding?.toLocaleString()}</Text>
                    </Animated.View>
                    <View style={{ width: 20 }} />
                </ScrollView>

                {/* Daily Flux Row */}
                <Text style={styles.sectionTitle}>Daily Flux</Text>
                <View style={styles.dailyFluxRow}>
                    <Animated.View entering={FadeInRight.delay(400)} style={[styles.dailyCard, { borderLeftColor: Colors.light.success }]}>
                        <View style={styles.dailyHeader}>
                            <ArrowUpCircle size={16} color={Colors.light.success} />
                            <Text style={styles.dailyLabel}>Today's Income</Text>
                        </View>
                        <Text style={[styles.dailyAmount, { color: Colors.light.success }]}>+ ₹{dailyIncome.toLocaleString()}</Text>
                    </Animated.View>
                    <Animated.View entering={FadeInRight.delay(500)} style={[styles.dailyCard, { borderLeftColor: Colors.light.danger }]}>
                        <View style={styles.dailyHeader}>
                            <ArrowDownCircle size={16} color={Colors.light.danger} />
                            <Text style={styles.dailyLabel}>Today's Spent</Text>
                        </View>
                        <Text style={[styles.dailyAmount, { color: Colors.light.danger }]}>- ₹{dailyExpense.toLocaleString()}</Text>
                    </Animated.View>
                </View>

                {/* Quick Actions (Moved Top) */}
                <Text style={styles.sectionTitle}>Quick Income Entry</Text>
                <View style={styles.quickActionRow}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleQuickAdd('profit', 'Freelance Work')}>
                        <Activity color={Colors.light.primary} size={24} />
                        <Text style={styles.actionText}>Freelance</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleQuickAdd('daily', 'Software Gig')}>
                        <Briefcase color={Colors.light.secondary} size={24} />
                        <Text style={styles.actionText}>Eng. Gig</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleQuickAdd('daily', 'Taxi/Misc')}>
                        <TrendingUp color={Colors.light.accent} size={24} />
                        <Text style={styles.actionText}>Daily Gig</Text>
                    </TouchableOpacity>
                </View>

                {/* EMI Confirmation Section */}
                {pendingEMIs.length > 0 && (
                    <View style={styles.reminderContainer}>
                        <View style={styles.reminderHeader}>
                            <Bell color={Colors.light.accent} size={18} />
                            <Text style={styles.reminderTitle}>Upcoming EMIs (Next 15 Days)</Text>
                        </View>
                        {pendingEMIs.map(emi => {
                            const emiDay = parseInt(emi.date);
                            const daysUntilDue = emiDay - todayDay;
                            const isOverdue = daysUntilDue < 0;
                            const statusColor = isOverdue ? Colors.light.danger : Colors.light.accent;

                            // Tenure Progress Calculations
                            const total = parseInt(emi.tenure) || 1;
                            const current = parseInt(emi.remainingTenure) || 0;
                            const progress = Math.max(0, Math.min(1, (total - current) / total));

                            const getIcon = () => {
                                if (emi.type === 'debt') return <Shield size={18} color={Colors.light.danger} />;
                                if (emi.type === 'saving') return <PiggyBank size={18} color={Colors.light.primary} />;
                                return <HeartHandshake size={18} color={Colors.light.accent} />;
                            };

                            return (
                                <View key={emi.id} style={styles.premiumCard}>
                                    <View style={styles.cardHeader}>
                                        <View style={styles.iconBox}>{getIcon()}</View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={styles.cardTitle}>{emi.name}</Text>
                                            <Text style={styles.cardSub}>{emi.type === 'debt' ? 'System Debt' : 'Scheduled Transfer'}</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={styles.cardAmount}>₹{emi.amount.toLocaleString()}</Text>
                                            <Text style={[styles.dueText, { color: statusColor }]}>
                                                {isOverdue ? 'Overdue' : `Due in ${daysUntilDue} days`}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.progressSection}>
                                        <View style={styles.progressBarContainer}>
                                            <View style={[styles.progressBar, { width: `${progress * 100}%`, backgroundColor: statusColor }]} />
                                        </View>
                                        <View style={styles.progressLabels}>
                                            <Text style={styles.progressLabel}>Paid: {total - current} mo</Text>
                                            <Text style={styles.progressLabel}>Total: {total} mo</Text>
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.premiumPayBtn, { shadowColor: statusColor }]}
                                        onPress={() => {
                                            showPopup('confirm', 'Confirm Payment', `Mark ₹${emi.amount.toLocaleString()} as PAID? Tenure will decrease to ${current - 1} months.`, () => confirmEMIPayment(emi.id));
                                        }}
                                    >
                                        <Text style={styles.premiumPayBtnText}>Mark as Settled</Text>
                                        <ArrowRight size={16} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Analytics Gallery */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Financial Performance</Text>
                    <TouchableOpacity onPress={() => {
                        showPopup('confirm', 'Monthly Snapshot', 'Ready to archive this month\'s performance? This will update the historical trend graph.', () => takeMonthlySnapshot());
                    }}>
                        <Text style={styles.snapshotBtn}>Snapshot</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartGallery}>
                    <View style={styles.chartBox}>
                        <Text style={styles.chartTitle}>Resource Allocation</Text>
                        <BarChart
                            data={barData}
                            width={screenWidth - 80}
                            height={180}
                            yAxisLabel="₹"
                            chartConfig={chartConfig}
                            style={styles.chart}
                            fromZero
                        />
                    </View>

                    {data.historicalStats && data.historicalStats.length > 0 && (
                        <View style={styles.chartBox}>
                            <Text style={styles.chartTitle}>Monthly Trend (k)</Text>
                            <LineChart
                                data={lineData}
                                width={screenWidth - 80}
                                height={180}
                                chartConfig={chartConfig}
                                bezier
                            />
                        </View>
                    )}
                    {categoryData.length > 0 && (
                        <View style={styles.chartBox}>
                            <Text style={styles.chartTitle}>Expense Pie</Text>
                            <PieChart
                                data={categoryData}
                                width={screenWidth - 80}
                                height={180}
                                chartConfig={chartConfig}
                                accessor={"population"}
                                backgroundColor={"transparent"}
                            />
                        </View>
                    )}
                    <View style={{ width: 20 }} />
                </ScrollView>


                {/* Activities List */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Activities</Text>
                    <TouchableOpacity onPress={() => router.push('/activities')}>
                        <Text style={styles.viewMore}>View Full History</Text>
                    </TouchableOpacity>
                </View>

                {[...data.income, ...data.expenses]
                    .sort((a, b) => b.id - a.id)
                    .slice(0, 5)
                    .map(item => (
                        <Animated.View key={item.id} entering={FadeInRight} style={styles.item}>
                            <View style={styles.itemMain}>
                                <Text style={styles.itemName}>{item.name}</Text>
                                <Text style={styles.itemDate}>{new Date(Number(item.id)).toLocaleDateString()}</Text>
                            </View>
                            <Text style={[styles.itemAmt, { color: data.income.find(i => i.id === item.id) ? Colors.light.success : Colors.light.danger }]}>
                                {data.income.find(i => i.id === item.id) ? '+' : '-'} ₹{Number(item.amount).toLocaleString()}
                            </Text>
                        </Animated.View>
                    ))}

                <View style={{ height: 120 }} />

                {/* Modals */}
                <Modal visible={quickAddVisible} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity style={{ flex: 1 }} onPress={() => setQuickAddVisible(false)} />
                        <View style={styles.qModalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Quick Add: {quickTitle}</Text>
                                <TouchableOpacity onPress={() => setQuickAddVisible(false)}><X size={24} color="#000" /></TouchableOpacity>
                            </View>
                            <TextInput style={styles.qInput} placeholder="Amount ₹" keyboardType="numeric" autoFocus value={quickAmount} onChangeText={setQuickAmount} />
                            <TouchableOpacity style={styles.qBtn} onPress={submitQuickAdd}><Text style={styles.qBtnText}>Save Now</Text></TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                <Modal visible={bankModalVisible} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity style={{ flex: 1 }} onPress={() => setBankModalVisible(false)} />
                        <View style={styles.qModalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Link Bank Account</Text>
                                <TouchableOpacity onPress={() => setBankModalVisible(false)}><X size={24} color="#000" /></TouchableOpacity>
                            </View>
                            <TextInput style={styles.qInput} placeholder="Bank Name" value={bankName} onChangeText={setBankName} />
                            <TextInput style={styles.qInput} placeholder="Balance ₹" keyboardType="numeric" value={bankBal} onChangeText={setBankBal} />
                            <TouchableOpacity style={styles.qBtn} onPress={handleAddBank}><Text style={styles.qBtnText}>Add Bank</Text></TouchableOpacity>
                        </View>
                    </View>
                </Modal>
                <View style={styles.footer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Shield size={14} color="#999" />
                        <Text style={styles.footerText}>Biometric Encryption Active</Text>
                    </View>
                </View>
            </ScrollView>

            <CustomPopup
                visible={popup.visible}
                type={popup.type}
                title={popup.title}
                message={popup.message}
                onClose={() => setPopup({ ...popup, visible: false })}
                onConfirm={popup.confirmAction}
            />
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.light.background },
    content: { padding: 16 },
    bankCard: { backgroundColor: Colors.light.primary, padding: 20, borderRadius: 24, marginBottom: 16 },
    bankHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    bankTitle: { color: '#fff', fontSize: 13, flex: 1, marginLeft: 10, fontWeight: '600', opacity: 0.8 },
    totalBankAmt: { color: '#fff', fontSize: 32, fontWeight: '800', marginBottom: 15 },
    bankList: { flexDirection: 'row' },
    bankItem: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 12, borderRadius: 12, marginRight: 10, width: 120 },
    bankItemName: { color: '#fff', fontSize: 11 },
    bankItemBal: { color: '#fff', fontWeight: '700', marginTop: 4 },
    summaryRowScroll: { flexDirection: 'row', marginBottom: 20, marginHorizontal: -16, paddingLeft: 16 },
    summaryCardSmall: { backgroundColor: '#fff', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#f0f0f0', width: 160, marginRight: 12 },
    summaryTitle: { color: '#666', fontSize: 11, fontWeight: '600' },
    summaryAmount: { color: '#000', fontSize: 18, fontWeight: '800', marginTop: 4 },
    dailyFluxRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    dailyCard: { backgroundColor: '#fff', padding: 16, borderRadius: 16, width: '48%', borderLeftWidth: 4, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
    dailyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    dailyLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', marginLeft: 6 },
    dailyAmount: { fontSize: 18, fontWeight: '900' },
    reminderContainer: { backgroundColor: '#FFFBEB', padding: 16, borderRadius: 20, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: Colors.light.accent },
    reminderHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    reminderTitle: { marginLeft: 8, fontWeight: '700', color: '#92400E' },
    emiHighlight: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 8 },
    emiHighlightName: { fontWeight: '700', fontSize: 14 },
    statusTag: { fontSize: 8, fontWeight: '800', borderWidth: 1, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, marginLeft: 8 },
    typeTag: { fontSize: 8, fontWeight: '700', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, marginLeft: 6, color: '#444' },
    emiHighlightDate: { fontSize: 11, color: '#666' },
    payBtn: { backgroundColor: Colors.light.success, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    payBtnText: { color: '#fff', fontWeight: '800', fontSize: 11 },
    sectionTitle: { fontSize: 18, fontWeight: '800', marginVertical: 15 },
    chartGallery: { marginHorizontal: -16, paddingLeft: 16 },
    chartBox: { backgroundColor: '#fff', padding: 20, borderRadius: 20, marginRight: 15, width: screenWidth - 60, borderWidth: 1, borderColor: '#f0f0f0' },
    chartTitle: { fontWeight: '700', marginBottom: 12, fontSize: 14 },
    quickActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    actionBtn: { width: '31%', backgroundColor: '#fff', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
    actionText: { marginTop: 8, fontSize: 11, fontWeight: '700' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    viewMore: { color: Colors.light.primary, fontWeight: '700', fontSize: 12 },
    snapshotBtn: { color: Colors.light.primary, fontWeight: '700', fontSize: 12, marginRight: 5 },
    item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: '#f0f0f0' },
    itemMain: { flex: 1 },
    itemName: { fontWeight: '700', fontSize: 15 },
    itemDate: { fontSize: 12, color: '#999' },
    itemAmt: { fontWeight: '800', fontSize: 15 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    qModalContent: { backgroundColor: '#fff', padding: 24, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '800' },
    qInput: { backgroundColor: '#f5f5f5', padding: 16, borderRadius: 12, marginBottom: 16, fontSize: 18, fontWeight: '700' },
    qBtn: { backgroundColor: Colors.light.primary, padding: 18, borderRadius: 12, alignItems: 'center' },
    qBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

    // Premium EMI Card Styles
    premiumCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: '#f0f0f0', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontSize: 16, fontWeight: '800', color: '#000' },
    cardSub: { fontSize: 11, color: '#999', marginTop: 2 },
    cardAmount: { fontSize: 16, fontWeight: '900', color: '#000' },
    dueText: { fontSize: 10, fontWeight: '800', marginTop: 4 },
    progressSection: { marginTop: 20, marginBottom: 20 },
    progressBarContainer: { height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, overflow: 'hidden' },
    progressBar: { height: '100%', borderRadius: 3 },
    progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    progressLabel: { fontSize: 10, color: '#999', fontWeight: '700' },
    premiumPayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', paddingVertical: 14, borderRadius: 14, elevation: 6, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
    premiumPayBtnText: { color: '#fff', fontWeight: '800', fontSize: 14, marginRight: 8 },
    footer: { paddingVertical: 30, alignItems: 'center' },
    footerText: { color: '#999', fontSize: 11, fontWeight: '600', marginLeft: 6 }
});
