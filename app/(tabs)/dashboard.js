import React, { useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FloatingLabelInput from '../../components/FloatingLabelInput';
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
        addIncome, addExpense, confirmEMIPayment, addBank, takeMonthlySnapshot, loading
    } = useTransactions();
    const router = useRouter();
    const [quickAddVisible, setQuickAddVisible] = useState(false);
    const [quickTitle, setQuickTitle] = useState('');
    const [quickAmount, setQuickAmount] = useState('');
    const [quickType, setQuickType] = useState('daily');

    const [bankModalVisible, setBankModalVisible] = useState(false);
    const [bankName, setBankName] = useState('');
    const [bankBal, setBankBal] = useState('');

    const [bankSelectionModalVisible, setBankSelectionModalVisible] = useState(false);
    const [pendingEmiId, setPendingEmiId] = useState(null);
    const [selectedBankId, setSelectedBankId] = useState('');

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
        if (quickType === 'expense') {
            addExpense({
                name: quickTitle,
                amount: parseFloat(quickAmount),
                category: 'Other',
                date: new Date().toLocaleDateString(),
            }, selectedBankId);
        } else {
            addIncome({
                name: quickTitle,
                amount: parseFloat(quickAmount),
                type: quickType,
                date: new Date().toLocaleDateString(),
            }, selectedBankId);
        }
        setQuickAmount('');
        setSelectedBankId('');
        setQuickAddVisible(false);
    };

    const handleConfirmEMI = (id) => {
        const emi = data.emis.find(e => e.id === id);
        if (emi && emi.bankId) {
            confirmEMIPayment(id, emi.bankId);
        } else {
            setPendingEmiId(id);
            setBankSelectionModalVisible(true);
        }
    };

    const submitEmiWithBank = () => {
        if (!selectedBankId) {
            Alert.alert("Error", "Please select a bank account");
            return;
        }
        confirmEMIPayment(pendingEmiId, selectedBankId);
        setBankSelectionModalVisible(false);
        setPendingEmiId(null);
        setSelectedBankId('');
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
        // Skip if it's a business car EMI (handled in Business screen)
        if (e.type === 'business' || e.category === 'Fleet') return false;

        if (e.startNextMonth && e.lastPaidMonth === undefined) return false;

        const isPaidThisMonth = e.lastPaidMonth === currentMonthYear;
        if (isPaidThisMonth) return false;
        const emiDay = parseInt(e.date);
        const daysUntilDue = emiDay - todayDay;
        return daysUntilDue <= 15;
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
                        <Text style={styles.summaryTitle}>Business Profit</Text>
                        <Text style={[styles.summaryAmount, { color: Colors.light.success }]}>₹ {((data.business?.entries || []).reduce((sum, e) => sum + e.myPortion, 0)).toLocaleString()}</Text>
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

                {/* Redesigned Daily Flux Card */}
                <Animated.View entering={FadeInUp.delay(350)} style={styles.fluxCardPremium}>
                    <View style={styles.fluxHeaderPremium}>
                        <Activity size={20} color="#fff" />
                        <Text style={styles.fluxTitlePremium}>Today's Cash Flow</Text>
                        <View style={styles.fluxDateBadge}>
                            <Text style={styles.fluxDateText}>{todayStr}</Text>
                        </View>
                    </View>

                    <View style={styles.fluxBodyPremium}>
                        <View style={styles.fluxStatItem}>
                            <View style={[styles.fluxIconBox, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                                <ArrowUpCircle size={20} color="#4ADE80" />
                            </View>
                            <View>
                                <Text style={styles.fluxStatLabel}>Income</Text>
                                <Text style={[styles.fluxStatValue, { color: '#4ADE80' }]}>+ ₹{dailyIncome.toLocaleString()}</Text>
                            </View>
                        </View>

                        <View style={styles.fluxDivider} />

                        <View style={styles.fluxStatItem}>
                            <View style={[styles.fluxIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                                <ArrowDownCircle size={20} color="#F87171" />
                            </View>
                            <View>
                                <Text style={styles.fluxStatLabel}>Spent</Text>
                                <Text style={[styles.fluxStatValue, { color: '#F87171' }]}>- ₹{dailyExpense.toLocaleString()}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.fluxFooterPremium}>
                        <View style={styles.fluxProgressBarContainer}>
                            <View style={[styles.fluxProgressBar, {
                                width: `${Math.min(100, (dailyExpense / (dailyIncome || 1)) * 100)}% `,
                                backgroundColor: dailyExpense > dailyIncome ? '#F87171' : '#60A5FA'
                            }]} />
                        </View>
                        <Text style={styles.fluxNetText}>
                            Net: <Text style={{ fontWeight: '900', color: dailyIncome - dailyExpense >= 0 ? '#4ADE80' : '#F87171' }}>
                                ₹{(dailyIncome - dailyExpense).toLocaleString()}
                            </Text>
                        </Text>
                    </View>
                </Animated.View>

                {/* Unified Quick Log Card */}
                <Animated.View entering={FadeInUp.delay(400)} style={styles.quickLogCard}>
                    <Text style={styles.quickLogTitle}>Quick Settlements</Text>

                    <View style={styles.quickLogGrid}>
                        {/* Income Row */}
                        <View style={styles.quickLogGroup}>
                            <Text style={styles.groupLabel}>Income</Text>
                            <View style={styles.groupRow}>
                                <TouchableOpacity style={[styles.quickBtn, styles.incomeBtn]} onPress={() => handleQuickAdd('profit', 'Freelance Work')}>
                                    <Activity color="#22C55E" size={20} />
                                    <Text style={styles.quickBtnText}>Freelance</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.quickBtn, styles.incomeBtn]} onPress={() => handleQuickAdd('daily', 'Software Gig')}>
                                    <Briefcase color="#10B981" size={20} />
                                    <Text style={styles.quickBtnText}>Gig</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.quickBtn, styles.incomeBtn]} onPress={() => handleQuickAdd('daily', 'Taxi/Misc')}>
                                    <TrendingUp color="#34D399" size={20} />
                                    <Text style={styles.quickBtnText}>Daily</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Expense Row */}
                        <View style={styles.quickLogGroup}>
                            <Text style={styles.groupLabel}>Expenses</Text>
                            <View style={styles.groupRow}>
                                <TouchableOpacity style={[styles.quickBtn, styles.expenseBtn]} onPress={() => handleQuickAdd('expense', 'Food & Drinks')}>
                                    <HeartHandshake color="#EF4444" size={20} />
                                    <Text style={styles.quickBtnText}>Food</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.quickBtn, styles.expenseBtn]} onPress={() => handleQuickAdd('expense', 'Transport')}>
                                    <TrendingDown color="#F43F5E" size={20} />
                                    <Text style={styles.quickBtnText}>Travel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.quickBtn, styles.expenseBtn]} onPress={() => handleQuickAdd('expense', 'Shopping')}>
                                    <Plus color="#FB7185" size={20} />
                                    <Text style={styles.quickBtnText}>Buy</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Animated.View>


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
                                height={220}
                                chartConfig={{
                                    backgroundColor: "#fff",
                                    backgroundGradientFrom: "#fff",
                                    backgroundGradientTo: "#fff",
                                    decimalPlaces: 0,
                                    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                                    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                                    style: { borderRadius: 16 },
                                    propsForDots: { r: "4", strokeWidth: "2", stroke: Colors.light.primary }
                                }}
                                bezier
                                style={{ marginVertical: 8, borderRadius: 16 }}
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

                <Modal visible={quickAddVisible} transparent animationType="fade">
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                        <View style={styles.modalOverlay}>
                            <TouchableOpacity style={{ flex: 1 }} onPress={() => setQuickAddVisible(false)} />
                            <View style={styles.qModalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Quick Add: {quickTitle}</Text>
                                    <TouchableOpacity onPress={() => setQuickAddVisible(false)}><X size={24} color="#000" /></TouchableOpacity>
                                </View>
                                <FloatingLabelInput label="Amount ₹" value={quickAmount} onChangeText={setQuickAmount} keyboardType="numeric" autoFocus />

                                <Text style={styles.modalLabelSmall}>Select Bank Account</Text>
                                <View style={styles.bankPickerSmall}>
                                    {(data.banks || []).map(b => (
                                        <TouchableOpacity
                                            key={b.id}
                                            style={[styles.bankChipSmall, selectedBankId === b.id && styles.bankChipSmallActive]}
                                            onPress={() => setSelectedBankId(b.id)}
                                        >
                                            <Text style={[styles.bankChipTextSmall, selectedBankId === b.id && styles.bankChipTextSmallActive]}>{b.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <TouchableOpacity style={styles.qBtn} onPress={submitQuickAdd}><Text style={styles.qBtnText}>Save Now</Text></TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>

                <Modal visible={bankModalVisible} transparent animationType="fade">
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                        <View style={styles.modalOverlay}>
                            <TouchableOpacity style={{ flex: 1 }} onPress={() => setBankModalVisible(false)} />
                            <View style={styles.qModalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Link Bank Account</Text>
                                    <TouchableOpacity onPress={() => setBankModalVisible(false)}><X size={24} color="#000" /></TouchableOpacity>
                                </View>
                                <FloatingLabelInput label="Bank Name" value={bankName} onChangeText={setBankName} />
                                <FloatingLabelInput label="Balance ₹" value={bankBal} onChangeText={setBankBal} keyboardType="numeric" />
                                <TouchableOpacity style={styles.qBtn} onPress={handleAddBank}><Text style={styles.qBtnText}>Add Bank</Text></TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>

                <Modal visible={bankSelectionModalVisible} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity style={{ flex: 1 }} onPress={() => setBankSelectionModalVisible(false)} />
                        <View style={styles.qModalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Confirm EMI Payment</Text>
                                <TouchableOpacity onPress={() => setBankSelectionModalVisible(false)}><X size={24} color="#000" /></TouchableOpacity>
                            </View>
                            <Text style={styles.modalLabelSmall}>Select Bank to DEDUCT from:</Text>
                            <View style={styles.bankPickerSmall}>
                                {(data.banks || []).map(b => (
                                    <TouchableOpacity
                                        key={b.id}
                                        style={[styles.bankChipSmall, selectedBankId === b.id && styles.bankChipSmallActive]}
                                        onPress={() => setSelectedBankId(b.id)}
                                    >
                                        <Text style={[styles.bankChipTextSmall, selectedBankId === b.id && styles.bankChipTextSmallActive]}>{b.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TouchableOpacity style={styles.qBtn} onPress={submitEmiWithBank}><Text style={styles.qBtnText}>Confirm Settlement</Text></TouchableOpacity>
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
    footerText: { color: '#999', fontSize: 11, fontWeight: '600', marginLeft: 6 },

    // Redesigned Flux Card Styles
    fluxCardPremium: { backgroundColor: '#1E293B', borderRadius: 24, padding: 24, marginBottom: 20, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10 },
    fluxHeaderPremium: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    fluxTitlePremium: { color: '#fff', fontSize: 16, fontWeight: '800', marginLeft: 10, flex: 1 },
    fluxDateBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    fluxDateText: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700' },
    fluxBodyPremium: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    fluxStatItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    fluxIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    fluxStatLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600' },
    fluxStatValue: { fontSize: 16, fontWeight: '900', marginTop: 2 },
    fluxDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 15 },
    fluxFooterPremium: { paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    fluxProgressBarContainer: { height: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, marginBottom: 12 },
    fluxProgressBar: { height: '100%', borderRadius: 2 },
    fluxNetText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700', textAlign: 'right' },

    modalLabelSmall: { fontSize: 12, fontWeight: '700', color: '#666', marginBottom: 10 },
    bankPickerSmall: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
    bankChipSmall: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#f5f5f5', marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
    bankChipSmallActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
    bankChipTextSmall: { fontSize: 11, fontWeight: '700', color: '#666' },
    bankChipTextSmallActive: { color: '#fff' },

    // Combined Quick Log Card Styles
    quickLogCard: { backgroundColor: '#fff', borderRadius: 28, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9', elevation: 4, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 15 },
    quickLogTitle: { fontSize: 16, fontWeight: '900', color: '#1E293B', marginBottom: 20, letterSpacing: -0.5 },
    quickLogGrid: { gap: 20 },
    quickLogGroup: {},
    groupLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 },
    groupRow: { flexDirection: 'row', justifyContent: 'space-between' },
    quickBtn: { width: '31%', paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
    incomeBtn: { borderBottomWidth: 3, borderBottomColor: '#22C55E' },
    expenseBtn: { borderBottomWidth: 3, borderBottomColor: '#EF4444' },
    quickBtnText: { marginTop: 6, fontSize: 10, fontWeight: '800', color: '#475569' }
});
