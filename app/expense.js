import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Modal, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, X, CreditCard, Calendar, Clock, DollarSign, AlertCircle, CheckCircle2, ChevronLeft } from 'lucide-react-native';
import FloatingLabelInput from '../components/FloatingLabelInput';
import { Colors } from '../constants/Theme';
import { useTransactions } from '../hooks/useTransactions';
import CustomPopup from '../components/CustomPopup';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';

export default function ExpensesScreen() {
    const { data, addExpense, addEMI } = useTransactions();
    const [modalVisible, setModalVisible] = useState(false);
    const [activeTab, setActiveTab] = useState('expense');
    const router = useRouter();

    // Form State
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Food');
    const [emiType, setEmiType] = useState('debt'); // 'debt', 'family', 'saving'
    const [tenure, setTenure] = useState('');
    const [date, setDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [startNextMonth, setStartNextMonth] = useState(false);
    const [bankId, setBankId] = useState('');
    const [popup, setPopup] = useState({ visible: false, type: 'info', title: '', message: '' });
    const showPopup = (type, title, message) => setPopup({ visible: true, type, title, message });

    const categories = ['Home', 'Food', 'Service', 'Personal', 'Rent', 'Loans', 'Other'];
    const emiTypes = [
        { id: 'debt', label: 'Loan Debt' },
        { id: 'family', label: 'Family Support' },
        { id: 'saving', label: 'Recurring Saving' }
    ];

    const handleAdd = () => {
        if (!name || !amount) return;

        if (activeTab === 'expense') {
            addExpense({ name, amount: parseFloat(amount), category, date: date.toLocaleDateString() }, bankId);
            showPopup('success', 'Expense Added', `₹${parseFloat(amount).toLocaleString()} spent on ${category}.`);
        } else {
            const isLoan = emiType === 'debt';
            if (isLoan && !tenure) {
                showPopup('error', 'Tenure Required', 'Please enter the number of months for this loan.');
                return;
            }
            addEMI({
                name,
                amount: parseFloat(amount),
                type: emiType,
                tenure: isLoan ? parseInt(tenure) : 999,
                date: date.getDate() + (date.getDate() % 10 === 1 && date.getDate() !== 11 ? 'st' : date.getDate() % 10 === 2 && date.getDate() !== 12 ? 'nd' : 'th'), // e.g., 5th
                fullDate: date.toLocaleDateString(),
                remainingTenure: isLoan ? parseInt(tenure) : 999,
                status: 'active',
                startNextMonth: startNextMonth,
                bankId: bankId // Preferred bank for this EMI
            });
            showPopup('success', 'EMI Scheduled', `${name} has been added to your recurring payments.`);
        }

        resetForm();
        setModalVisible(false);
    };

    const resetForm = () => {
        setName('');
        setAmount('');
        setCategory('Food');
        setEmiType('debt');
        setTenure('');
        setDate(new Date());
        setStartNextMonth(false);
        setBankId('');
    };

    const onDateChange = (event, selectedDate) => {
        setShowPicker(false);
        if (selectedDate) setDate(selectedDate);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ChevronLeft color={Colors.light.text} size={28} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Nexus CashFlow</Text>
                    <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
                        <Plus color="#fff" size={24} />
                    </TouchableOpacity>
                </View>

                <View style={styles.tabSwitcher}>
                    <TouchableOpacity
                        style={[styles.smallTab, activeTab === 'expense' && styles.smallTabActive]}
                        onPress={() => setActiveTab('expense')}
                    >
                        <Text style={[styles.smallTabText, activeTab === 'expense' && styles.smallTabTextActive]}>Daily Expenses</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.smallTab, activeTab === 'emi' && styles.smallTabActive]}
                        onPress={() => setActiveTab('emi')}
                    >
                        <Text style={[styles.smallTabText, activeTab === 'emi' && styles.smallTabTextActive]}>EMIs & Monthly Fixed</Text>
                    </TouchableOpacity>
                </View>

                {activeTab === 'expense' ? (
                    data.expenses.map((item) => (
                        <View key={item.id} style={styles.card}>
                            <View style={styles.cardIcon}><CreditCard color={Colors.light.danger} size={20} /></View>
                            <View style={styles.cardInfo}>
                                <Text style={styles.cardName}>{item.name}</Text>
                                <Text style={styles.cardType}>{item.category} • {item.date}</Text>
                            </View>
                            <Text style={styles.cardAmount}>- ₹{Number(item.amount).toLocaleString()}</Text>
                        </View>
                    ))
                ) : (
                    data.emis.filter(e => e.status !== 'closed').map((item) => (
                        <View key={item.id} style={styles.card}>
                            <View style={styles.cardIcon}><Clock color={Colors.light.accent} size={20} /></View>
                            <View style={styles.cardInfo}>
                                <Text style={styles.cardName}>{item.name}</Text>
                                <Text style={styles.cardType}>
                                    {item.type === 'debt' ? `Loan | ${item.remainingTenure}m left` : 'Fixed Monthly'} | Due: {item.date}
                                </Text>
                            </View>
                            <Text style={styles.cardAmount}>- ₹{Number(item.amount).toLocaleString()}</Text>
                        </View>
                    ))
                )}
                {((activeTab === 'expense' && data.expenses.length === 0) || (activeTab === 'emi' && data.emis.filter(e => e.status !== 'closed').length === 0)) && (
                    <View style={styles.empty}><Text style={{ color: '#999' }}>Everything looks clear!</Text></View>
                )}
            </ScrollView>

            <Modal visible={modalVisible} transparent animationType="slide">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity style={{ flex: 1 }} onPress={() => setModalVisible(false)} />
                        <View style={styles.modalContent}>
                            <View style={styles.swipeBar} />
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>New {activeTab === 'expense' ? 'Expense' : 'EMI Plan'}</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}><X color="#000" size={24} /></TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                <FloatingLabelInput label="Title (e.g. Grocery, Car Loan)" value={name} onChangeText={setName} />
                                <FloatingLabelInput label="Amount ₹" value={amount} onChangeText={setAmount} keyboardType="numeric" />

                                <Text style={styles.label}>Impact Bank Account</Text>
                                <View style={styles.bankSelector}>
                                    {(data.banks || []).map(bank => (
                                        <TouchableOpacity
                                            key={bank.id}
                                            style={[styles.bankChip, bankId === bank.id && styles.bankChipActive]}
                                            onPress={() => setBankId(bank.id)}
                                        >
                                            <Text style={[styles.bankChipText, bankId === bank.id && styles.bankChipTextActive]}>{bank.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {activeTab === 'expense' ? (
                                    <View style={styles.categoryContainer}>
                                        {categories.map((cat) => (
                                            <TouchableOpacity
                                                key={cat}
                                                style={[styles.catChip, category === cat && styles.catChipActive]}
                                                onPress={() => setCategory(cat)}
                                            >
                                                <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>{cat}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                ) : (
                                    <>
                                        <View style={styles.categoryContainer}>
                                            {emiTypes.map((type) => (
                                                <TouchableOpacity
                                                    key={type.id}
                                                    style={[styles.catChip, emiType === type.id && styles.catChipActive]}
                                                    onPress={() => setEmiType(type.id)}
                                                >
                                                    <Text style={[styles.catChipText, emiType === type.id && styles.catChipTextActive]}>{type.label}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                        {emiType === 'debt' && (
                                            <FloatingLabelInput
                                                label="Tenure (e.g. 12 months)"
                                                value={tenure}
                                                onChangeText={setTenure}
                                                keyboardType="numeric"
                                            />
                                        )}
                                        <View style={styles.switchRow}>
                                            <View>
                                                <Text style={styles.switchLabel}>Start Next Month</Text>
                                                <Text style={styles.switchSub}>Exclude from current dashboard remit</Text>
                                            </View>
                                            <Switch
                                                value={startNextMonth}
                                                onValueChange={setStartNextMonth}
                                                trackColor={{ false: '#767577', true: Colors.light.primary }}
                                            />
                                        </View>
                                    </>
                                )}

                                <TouchableOpacity style={styles.dateSelector} onPress={() => setShowPicker(true)}>
                                    <Calendar color="#666" size={20} />
                                    <Text style={styles.dateText}>
                                        {activeTab === 'expense' ? 'Expense Date' : 'EMI Start/Due Date'}: {date.toLocaleDateString()}
                                    </Text>
                                </TouchableOpacity>

                                {showPicker && (
                                    <DateTimePicker value={date} mode="date" display="default" onChange={onDateChange} />
                                )}

                                <TouchableOpacity style={styles.submitButton} onPress={handleAdd}>
                                    <Text style={styles.submitButtonText}>Confirm Entry</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
            <CustomPopup
                visible={popup.visible}
                type={popup.type}
                title={popup.title}
                message={popup.message}
                onClose={() => setPopup({ ...popup, visible: false })}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.light.background },
    content: { padding: 16 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backButton: { marginRight: 12 },
    title: { fontSize: 24, fontWeight: '800', flex: 1 },
    addButton: { backgroundColor: Colors.light.primary, padding: 10, borderRadius: 12 },
    tabSwitcher: { flexDirection: 'row', backgroundColor: '#f0f0f0', padding: 5, borderRadius: 14, marginBottom: 20 },
    smallTab: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 10 },
    smallTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    smallTabText: { color: '#666', fontWeight: '700' },
    smallTabTextActive: { color: Colors.light.primary },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f0f0f0' },
    cardIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f9f9f9', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    cardInfo: { flex: 1 },
    cardName: { fontWeight: '700', fontSize: 16 },
    cardType: { color: '#999', fontSize: 11, marginTop: 2 },
    cardAmount: { fontWeight: '800', color: Colors.light.danger, fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', padding: 24, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
    swipeBar: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 15 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 20, fontWeight: '800' },
    input: { backgroundColor: '#f5f5f5', padding: 18, borderRadius: 12, marginBottom: 16, fontSize: 16, fontWeight: '600' },
    categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
    catChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#eee', marginRight: 8, marginBottom: 8, backgroundColor: '#f9f9f9' },
    catChipActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
    catChipText: { fontSize: 12, color: '#666', fontWeight: '700' },
    catChipTextActive: { color: '#fff' },
    dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', padding: 18, borderRadius: 12, marginBottom: 20 },
    dateText: { marginLeft: 10, color: '#666', fontWeight: '600' },
    submitButton: { backgroundColor: Colors.light.primary, padding: 20, borderRadius: 12, alignItems: 'center' },
    submitButtonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
    bankSelector: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
    bankChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#eee', marginRight: 8, marginBottom: 8, backgroundColor: '#f9f9f9' },
    bankChipActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
    bankChipText: { fontSize: 12, color: '#666', fontWeight: '700' },
    bankChipTextActive: { color: '#fff' },
    label: { fontSize: 13, fontWeight: '700', marginBottom: 10, color: '#666' },
    empty: { padding: 60, alignItems: 'center' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#eee' },
    switchLabel: { fontWeight: '700', fontSize: 14, color: '#333' },
    switchSub: { fontSize: 11, color: '#999', marginTop: 2 }
});
