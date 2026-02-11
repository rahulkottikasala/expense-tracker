import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Theme';
import { useTransactions } from '../../hooks/useTransactions';
import { Plus, X, Briefcase, Code, Terminal, TrendingUp, Calendar, CheckCircle2 } from 'lucide-react-native';
import CustomPopup from '../../components/CustomPopup';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function IncomeScreen() {
    const { data, addIncome, totalIncome } = useTransactions();
    const [modalVisible, setModalVisible] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState('job');
    const [date, setDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [successVisible, setSuccessVisible] = useState(false);
    const [bankId, setBankId] = useState('');

    const incomeTypes = [
        { id: 'job', label: 'Salary/Job', icon: Briefcase },
        { id: 'daily', label: 'Freelance', icon: Code },
        { id: 'profit', label: 'Biz Profit', icon: TrendingUp },
    ];

    const handleAdd = () => {
        if (!name || !amount) return;
        addIncome({
            name,
            amount: parseFloat(amount),
            type,
            date: date.toLocaleDateString(),
            isVariable: type !== 'job'
        }, bankId);
        resetForm();
        setModalVisible(false);
        setSuccessVisible(true);
    };

    const resetForm = () => {
        setName('');
        setAmount('');
        setType('job');
        setDate(new Date());
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
                    <Text style={styles.title}>Earnings Hub</Text>
                    <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
                        <Plus color="#fff" size={24} />
                    </TouchableOpacity>
                </View>

                <View style={[styles.summaryCard, { backgroundColor: Colors.light.primary }]}>
                    <Text style={styles.summaryLabel}>Cumulative Earnings</Text>
                    <Text style={styles.summaryValue}>₹ {totalIncome.toLocaleString()}</Text>
                </View>

                <Text style={styles.sectionTitle}>Transaction History</Text>
                {data.income.length === 0 ? (
                    <View style={styles.empty}><Text style={{ color: '#999' }}>No income recorded yet.</Text></View>
                ) : (
                    data.income.map((item) => (
                        <View key={item.id} style={styles.card}>
                            <View style={[styles.iconBox, { backgroundColor: item.type === 'job' ? '#E0E7FF' : '#DCFCE7' }]}>
                                {item.type === 'job' ? <Briefcase size={20} color="#4338CA" /> :
                                    item.type === 'daily' ? <Code size={20} color="#15803D" /> : <TrendingUp size={20} color="#15803D" />}
                            </View>
                            <View style={styles.cardInfo}>
                                <Text style={styles.cardName}>{item.name}</Text>
                                <Text style={styles.cardType}>{item.type.toUpperCase()} • {item.date}</Text>
                            </View>
                            <Text style={styles.cardAmount}>+ ₹{Number(item.amount).toLocaleString()}</Text>
                        </View>
                    ))
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
                                <Text style={styles.modalTitle}>Add Income</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}><X color="#000" size={24} /></TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                <Text style={styles.label}>Category</Text>
                                <View style={styles.typeSelector}>
                                    {incomeTypes.map(t => (
                                        <TouchableOpacity
                                            key={t.id}
                                            style={[styles.typeBtn, type === t.id && styles.typeBtnActive]}
                                            onPress={() => setType(t.id)}
                                        >
                                            <t.icon size={18} color={type === t.id ? '#fff' : '#666'} />
                                            <Text style={[styles.typeBtnText, type === t.id && styles.typeBtnTextActive]}>{t.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <TextInput style={styles.input} placeholder="Source (e.g. Freelance project, Salary)" value={name} onChangeText={setName} />
                                <TextInput style={styles.input} placeholder="Amount ₹" keyboardType="numeric" value={amount} onChangeText={setAmount} />

                                <Text style={styles.label}>Deposit To</Text>
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

                                <TouchableOpacity style={styles.dateSelector} onPress={() => setShowPicker(true)}>
                                    <Calendar color="#666" size={20} />
                                    <Text style={styles.dateText}>Transaction Date: {date.toLocaleDateString()}</Text>
                                </TouchableOpacity>

                                {showPicker && (
                                    <DateTimePicker value={date} mode="date" display="default" onChange={onDateChange} />
                                )}

                                <TouchableOpacity style={styles.submitButton} onPress={handleAdd}>
                                    <Text style={styles.submitButtonText}>Confirm Earning</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
            <CustomPopup
                visible={successVisible}
                type="success"
                title="Income Added"
                message={`₹${parseFloat(amount).toLocaleString()} has been recorded in your Earnings Hub.`}
                onClose={() => setSuccessVisible(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.light.background },
    content: { padding: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 24, fontWeight: '800' },
    addButton: { backgroundColor: Colors.light.primary, padding: 10, borderRadius: 12 },
    summaryCard: { padding: 24, borderRadius: 24, marginBottom: 24 },
    summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
    summaryValue: { color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 4 },
    sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 15 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f0f0f0' },
    iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    cardInfo: { flex: 1 },
    cardName: { fontWeight: '700', fontSize: 15 },
    cardType: { color: '#999', fontSize: 11, marginTop: 2 },
    cardAmount: { fontWeight: '800', color: Colors.light.success, fontSize: 15 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', padding: 24, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
    swipeBar: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 15 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 20, fontWeight: '800' },
    label: { fontSize: 13, fontWeight: '700', marginBottom: 10, color: '#666' },
    typeSelector: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    typeBtn: { width: '31%', padding: 14, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#eee', backgroundColor: '#f9f9f9' },
    typeBtnActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
    typeBtnText: { fontSize: 10, marginTop: 4, color: '#666', fontWeight: '700' },
    typeBtnTextActive: { color: '#fff' },
    input: { backgroundColor: '#f5f5f5', padding: 18, borderRadius: 12, marginBottom: 16, fontSize: 16, fontWeight: '600' },
    dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', padding: 18, borderRadius: 12, marginBottom: 20 },
    dateText: { marginLeft: 10, color: '#666', fontWeight: '600' },
    submitButton: { backgroundColor: Colors.light.primary, padding: 20, borderRadius: 12, alignItems: 'center' },
    submitButtonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
    bankSelector: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
    bankChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#eee', marginRight: 8, marginBottom: 8, backgroundColor: '#f9f9f9' },
    bankChipActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
    bankChipText: { fontSize: 12, color: '#666', fontWeight: '700' },
    bankChipTextActive: { color: '#fff' },
    empty: { padding: 60, alignItems: 'center' }
});
