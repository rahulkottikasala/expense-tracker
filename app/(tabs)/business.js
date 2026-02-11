import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Modal, Switch, KeyboardAvoidingView, Platform, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Theme';
import { useTransactions } from '../../hooks/useTransactions';
import { Plus, Car, Calendar, Info, Trash2, X, Users, Edit2, Check, Briefcase, TrendingUp, Bell, FileText, Clock } from 'lucide-react-native';
import CustomPopup from '../../components/CustomPopup';
import FloatingLabelInput from '../../components/FloatingLabelInput';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

const { width } = Dimensions.get('window');

// Resilient date parser for stored dates
const parseDate = (dateStr) => {
    if (!dateStr) return new Date();
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;

    // Try manual parse for DD/MM/YYYY or MM/DD/YYYY if standard fails
    const parts = dateStr.split(/[/.-]/);
    if (parts.length === 3) {
        // Assume DD/MM/YYYY if first part > 12 or if it looks like that
        const p0 = parseInt(parts[0]);
        const p1 = parseInt(parts[1]);
        const p2 = parseInt(parts[2]);

        if (p0 > 12) return new Date(p2, p1 - 1, p0); // DD/MM/YYYY
        return new Date(p2, p0 - 1, p1); // MM/DD/YYYY
    }
    return new Date();
};

const formatDateForStorage = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toLocaleDateString();
    return dateStr; // Fallback
};

export default function BusinessScreen() {
    const { data, addCar, updateCar, deleteCar, addBusinessEntry, editBusinessEntry, deleteBusinessEntry, addDriver, deleteDriver, updateDriver, exportData } = useTransactions();

    // Modals
    const [carModalVisible, setCarModalVisible] = useState(false);
    const [entryModalVisible, setEntryModalVisible] = useState(false);
    const [driverModalVisible, setDriverModalVisible] = useState(false);
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);

    // State
    const [editingDriver, setEditingDriver] = useState(null);
    const [editingEntry, setEditingEntry] = useState(null);
    const [selectedCar, setSelectedCar] = useState(null);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [filterType, setFilterType] = useState('monthly'); // Default to monthly as requested for reset logic

    // Car Form State
    const [carName, setCarName] = useState('');
    const [carBrand, setCarBrand] = useState('');
    const [carYear, setCarYear] = useState('');
    const [carEmi, setCarEmi] = useState('');
    const [carEmiDate, setCarEmiDate] = useState(new Date());
    const [carTotalTenure, setCarTotalTenure] = useState('');
    const [carRemainingTenure, setCarRemainingTenure] = useState('');
    const [emiStartNextMonth, setEmiStartNextMonth] = useState(false);
    const [hasPartner, setHasPartner] = useState(false);
    const [partnerName, setPartnerName] = useState('');
    const [partnerShare, setPartnerShare] = useState('50');
    const [showEmiDatePicker, setShowEmiDatePicker] = useState(false);

    // Entry Form State
    const [entryCarId, setEntryCarId] = useState('');
    const [entryType, setEntryType] = useState('rent');
    const [entryAmount, setEntryAmount] = useState('');
    const [entryCng, setEntryCng] = useState('');
    const [entryDrivers, setEntryDrivers] = useState('1');
    const [entryUberComm, setEntryUberComm] = useState('');
    const [entryUberCommType, setEntryUberCommType] = useState('percentage'); // 'percentage' or 'fixed'
    const [entryDate, setEntryDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [entryDriverId, setEntryDriverId] = useState('');
    const [newDriverName, setNewDriverName] = useState('');

    const [popup, setPopup] = useState({ visible: false, type: 'info', title: '', message: '', onConfirm: null });
    const showPopup = (type, title, message, onConfirm = null) => setPopup({ visible: true, type, title, message, onConfirm });

    // Handle Forms
    const handleAddCar = () => {
        if (!carName || !carEmi) return;

        let finalEmiDate = new Date(carEmiDate);
        if (emiStartNextMonth && !selectedCar) {
            finalEmiDate.setMonth(finalEmiDate.getMonth() + 1);
        }

        const carData = {
            name: carName,
            brand: carBrand,
            year: carYear,
            emi: parseFloat(carEmi),
            emiDate: formatDateForStorage(finalEmiDate),
            totalTenure: parseInt(carTotalTenure) || 0,
            remainingTenure: parseInt(carRemainingTenure) || parseInt(carTotalTenure) || 0,
            emiStartNextMonth,
            hasPartner,
            partnerName: hasPartner ? partnerName : '',
            partnerShare: hasPartner ? parseFloat(partnerShare) : 0,
            status: 'active'
        };

        if (selectedCar) {
            updateCar(selectedCar.id, carData);
            showPopup('success', 'Car Updated', `${carName} details have been updated.`);
        } else {
            addCar(carData);
            showPopup('success', 'Car Added', `${carName} has been added to your business.`);
        }
        setCarModalVisible(false);
        resetCarForm();
    };

    const resetCarForm = () => {
        setCarName('');
        setCarBrand('');
        setCarYear('');
        setCarEmi('');
        setCarEmiDate(new Date());
        setCarTotalTenure('');
        setCarRemainingTenure('');
        setEmiStartNextMonth(false);
        setHasPartner(false);
        setPartnerName('');
        setPartnerShare('50');
        setSelectedCar(null);
    };

    const handleAddEntry = () => {
        if (!entryCarId || !entryAmount) return;

        const car = data.business.cars.find(c => c.id === entryCarId);
        if (!car) return;

        const amount = parseFloat(entryAmount);
        const cng = parseFloat(entryCng) || 0;
        const driversCount = parseInt(entryDrivers) || 1;
        const platformFee = 100 * driversCount;

        let profit = 0;
        let driverPortion = 0;

        if (entryType === 'rent') {
            profit = amount;
        } else if (entryType === 'commission') {
            driverPortion = (amount - cng) / 2;
            profit = (driverPortion * driversCount) - platformFee;
        } else { // maintenance
            profit = -amount;
        }

        let partnerPortion = 0;
        let myPortion = 0;

        if (car.hasPartner) {
            partnerPortion = (profit * car.partnerShare) / 100;
            myPortion = profit - partnerPortion;
        } else {
            myPortion = profit;
        }

        const entryData = {
            carId: entryCarId,
            carName: car.name,
            date: entryDate.toLocaleDateString(),
            type: entryType,
            amount,
            cng,
            drivers: driversCount,
            driverId: entryDriverId,
            driverName: data.business?.drivers?.find(d => d.id === entryDriverId)?.name || '',
            driverPortion,
            uberCommission: entryUberComm,
            uberCommissionType: entryUberCommType,
            platformFee: entryType === 'commission' ? platformFee : 0,
            profit,
            partnerPortion,
            myPortion
        };

        if (editingEntry) {
            editBusinessEntry(editingEntry.id, entryData);
            showPopup('success', 'Entry Updated', `Updated entry for ${car.name}.`);
        } else {
            addBusinessEntry(entryData);
            showPopup('success', 'Entry Recorded', `Profit recorded for ${car.name}.`);
        }

        setEntryModalVisible(false);
        resetEntryForm();
    };

    const resetEntryForm = () => {
        setEntryCarId('');
        setEntryType('rent');
        setEntryAmount('');
        setEntryCng('');
        setEntryDrivers('1');
        setEntryUberComm('');
        setEntryUberCommType('percentage');
        setEntryDate(new Date());
        setEntryDriverId('');
        setEditingEntry(null);
    };

    // Calculations
    const getFilteredEntries = () => {
        const entries = data.business?.entries || [];
        const now = new Date();
        const cycleDay = data.business?.cycleDay || 5;

        return entries.filter(e => {
            const entryDate = new Date(e.date);
            if (filterType === 'daily') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return entryDate >= today;
            } else if (filterType === 'weekly') {
                const weekAgo = new Date();
                weekAgo.setDate(now.getDate() - 7);
                return entryDate >= weekAgo;
            } else if (filterType === 'monthly') {
                let cycleStartDate = new Date(now.getFullYear(), now.getMonth(), cycleDay);
                if (now.getDate() < cycleDay) {
                    cycleStartDate.setMonth(cycleStartDate.getMonth() - 1);
                }
                cycleStartDate.setHours(0, 0, 0, 0);
                return entryDate >= cycleStartDate;
            }
            return true;
        });
    };

    const cycleEntries = useMemo(() => {
        const entries = data.business?.entries || [];
        const now = new Date();
        const cycleDay = data.business?.cycleDay || 5;

        let cycleStartDate = new Date(now.getFullYear(), now.getMonth(), cycleDay);
        if (now.getDate() < cycleDay) {
            cycleStartDate.setMonth(cycleStartDate.getMonth() - 1);
        }
        cycleStartDate.setHours(0, 0, 0, 0);

        return entries.filter(e => new Date(e.date) >= cycleStartDate);
    }, [data.business?.entries, data.business?.cycleDay]);

    const filteredEntries = getFilteredEntries();

    // Profit Stats
    const profitStats = useMemo(() => {
        const entries = cycleEntries; // Always based on current cycle

        // Total Fleet Gross Profit (Before partner share and EMIs)
        const totalFleetGross = entries.reduce((sum, e) => sum + (e.profit || 0), 0);

        // My Total Share (Sum of myPortion from entries)
        const totalMyPortion = entries.reduce((sum, e) => sum + (e.myPortion || 0), 0);

        // Calculate EMIs paid in this cycle
        const now = new Date();
        const cycleDay = data.business?.cycleDay || 5;
        let cycleStartDate = new Date(now.getFullYear(), now.getMonth(), cycleDay);
        if (now.getDate() < cycleDay) {
            cycleStartDate.setMonth(cycleStartDate.getMonth() - 1);
        }
        cycleStartDate.setHours(0, 0, 0, 0);

        const paidEMIsThisCycle = (data.history || []).filter(h =>
            h.type === 'emi_payment' &&
            new Date(h.timestamp) >= cycleStartDate
        ).reduce((sum, h) => sum + (h.amount || 0), 0);

        return {
            myProfit: totalMyPortion - paidEMIsThisCycle,
            totalFleetProfit: totalFleetGross - paidEMIsThisCycle
        };
    }, [cycleEntries, data.history, data.business?.cycleDay]);

    // EMI Payables Logic
    const businessEMIs = useMemo(() => {
        // Find EMIs paid in this cycle
        const now = new Date();
        const cycleDay = data.business?.cycleDay || 5;
        let cycleStartDate = new Date(now.getFullYear(), now.getMonth(), cycleDay);
        if (now.getDate() < cycleDay) {
            cycleStartDate.setMonth(cycleStartDate.getMonth() - 1);
        }
        cycleStartDate.setHours(0, 0, 0, 0);

        return (data.business?.cars || []).map(car => {
            const isPaid = (data.history || []).some(h =>
                h.type === 'emi_payment' &&
                h.title.includes(car.name) &&
                new Date(h.timestamp) >= cycleStartDate
            );
            return { ...car, isPaid };
        });
    }, [data.business?.cars, data.history, data.business?.cycleDay]);

    const handleConfirmEMIPayment = (car) => {
        showPopup('confirm', 'Confirm Payment', `Mark EMI as PAID for ${car.name}? ₹${car.emi.toLocaleString()}`, () => {
            const currentEmiDate = parseDate(car.emiDate);
            const nextEmiDate = new Date(currentEmiDate);
            nextEmiDate.setMonth(nextEmiDate.getMonth() + 1);

            const updatedCar = {
                ...car,
                remainingTenure: Math.max(0, (car.remainingTenure || 0) - 1),
                lastPaidMonth: new Date().toLocaleString('default', { month: 'short', year: 'numeric' }),
                emiDate: formatDateForStorage(nextEmiDate)
            };

            // Record in history for profit calculation
            // We use editBusinessEntry or some mechanism to ensure it's tracked locally
            // But since TransactionContext handles history, we should ensure history is updated.
            // confirmEMIPayment in context already does this.

            updateCar(car.id, updatedCar);
            showPopup('success', 'Payment Confirmed', `EMI for ${car.name} marked as paid. Next due: ${nextEmiDate.toLocaleDateString()}`);
        });
    };

    // Reports & Exports
    const handleExportMonth = async () => {
        try {
            const monthStatus = `Business Report - Cycle starting ${data.business?.cycleDay || 5}th\n\n` +
                `My Net Profit: ₹${profitStats.myProfit.toLocaleString()}\n` +
                `Total Fleet Profit: ₹${profitStats.totalFleetProfit.toLocaleString()}\n\n` +
                `Entries:\n` +
                filteredEntries.map(e => `${e.date} - ${e.carName}: ₹${e.myPortion}`).join('\n');

            const fileName = `Business_Report_${Date.now()}.txt`;
            const filePath = FileSystem.cacheDirectory.endsWith('/')
                ? `${FileSystem.cacheDirectory}${fileName}`
                : `${FileSystem.cacheDirectory}/${fileName}`;

            await FileSystem.writeAsStringAsync(filePath, monthStatus);

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(filePath, { mimeType: 'text/plain', dialogTitle: 'Share Business Report' });
            } else {
                Alert.alert("Error", "Sharing is not available on this device.");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Could not generate or share report.");
        }
    };

    // Deletion Handlers
    const confirmDeleteEntry = (id) => {
        showPopup('confirm', 'Delete Entry', 'ARE YOU ABSOLUTELY SURE? This will remove this profit record permanently.', () => {
            deleteBusinessEntry(id);
            setDetailsModalVisible(false);
        });
    };

    const confirmDeleteCar = (id) => {
        showPopup('confirm', 'Remove Car', 'Deleting this car will also delete ALL related records. Proceed?', () => {
            deleteCar(id);
        });
    };

    const confirmDeleteDriver = (id) => {
        showPopup('confirm', 'Remove Driver', 'Are you sure you want to remove this driver from your records?', () => {
            deleteDriver(id);
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Business Fleet</Text>
                        <Text style={styles.subtitle}>Taxi Management System</Text>
                    </View>
                    <View style={styles.headerIcons}>
                        <TouchableOpacity style={styles.headerBtn} onPress={() => setDriverModalVisible(true)}>
                            <Users color="#fff" size={24} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerBtn} onPress={() => { resetCarForm(); setCarModalVisible(true); }}>
                            <Plus color="#fff" size={24} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Consolidated Profit Card */}
                <View style={[styles.profitCard, { width: '100%', backgroundColor: Colors.light.primary, marginBottom: 25, minHeight: 140 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View>
                            <Text style={[styles.profitLabel, { color: 'rgba(255,255,255,0.7)', fontSize: 13 }]}>My Net Profit</Text>
                            <Text style={[styles.profitValue, { color: '#fff', fontSize: 42, marginBottom: 10 }]}>₹{profitStats.myProfit.toLocaleString()}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700' }}>Total Fleet Profit: </Text>
                                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900' }}>₹{profitStats.totalFleetProfit.toLocaleString()}</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.reportBtn} onPress={handleExportMonth}>
                            <FileText color="#fff" size={20} />
                            <Text style={styles.reportBtnText}>Report</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.cycleBadge}>
                        <Clock size={12} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.cycleBadgeText}>
                            Current Cycle: {data.business?.cycleDay || 5}th - {(data.business?.cycleDay || 5) - 1 || 31}th
                        </Text>
                    </View>
                </View>

                {/* Upcoming EMIs */}
                <View style={styles.sectionHeader}>
                    <Bell size={18} color={Colors.light.accent} />
                    <Text style={styles.sectionTitle}>Fleet EMI Status</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carList}>
                    {businessEMIs.map(car => (
                        <View key={car.id} style={styles.carCard}>
                            <View style={styles.carHeaderCard}>
                                <View style={styles.carIcon}><Car color="#fff" size={18} /></View>
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <Text style={styles.carNameText}>{car.name}</Text>
                                    <Text style={styles.carSubText}>EMI: ₹{car.emi.toLocaleString()}</Text>
                                </View>
                                <View style={styles.carActions}>
                                    <TouchableOpacity onPress={() => { setSelectedCar(car); setCarName(car.name); setCarBrand(car.brand || ''); setCarYear(car.year || ''); setCarEmi(car.emi.toString()); setCarEmiDate(new Date(car.emiDate || Date.now())); setCarTotalTenure(car.totalTenure?.toString() || ''); setCarRemainingTenure(car.remainingTenure?.toString() || ''); setEmiStartNextMonth(car.emiStartNextMonth || false); setHasPartner(car.hasPartner); setPartnerName(car.partnerName || ''); setPartnerShare(car.partnerShare?.toString() || '50'); setCarModalVisible(true); }}><Edit2 size={14} color={Colors.light.primary} /></TouchableOpacity>
                                    <TouchableOpacity onPress={() => confirmDeleteCar(car.id)}><Trash2 size={14} color={Colors.light.danger} /></TouchableOpacity>
                                </View>
                            </View>
                            <View style={styles.emiStatusRow}>
                                <View>
                                    <Text style={styles.tenureText}>Remaining: {car.remainingTenure || 0} / {car.totalTenure || 0}</Text>
                                    <Text style={styles.emiDayText}>Next Due: {formatDateForDisplay(car.emiDate)}</Text>
                                </View>
                                <TouchableOpacity
                                    style={[styles.payBtn, car.isPaid && { backgroundColor: '#F0FDF4' }]}
                                    onPress={() => !car.isPaid && handleConfirmEMIPayment(car)}
                                    disabled={car.isPaid}
                                >
                                    <Text style={[styles.payBtnText, car.isPaid && { color: Colors.light.success }]}>{car.isPaid ? 'PAID' : 'PAY'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                    {businessEMIs.length === 0 && <Text style={styles.emptyText}>No cars in fleet.</Text>}
                </ScrollView>

                <View style={[styles.sectionHeader, { marginTop: 25, justifyContent: 'space-between' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TrendingUp size={20} color={Colors.light.primary} />
                        <Text style={styles.sectionTitle}>Recent Entries</Text>
                    </View>
                    <TouchableOpacity style={styles.addEntryHighlight} onPress={() => { resetEntryForm(); setEntryModalVisible(true); }}>
                        <Plus size={20} color="#fff" />
                        <Text style={styles.addEntryHText}>Daily Entry</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.filterBar}>
                    {['all', 'daily', 'weekly', 'monthly'].map(t => (
                        <TouchableOpacity
                            key={t}
                            style={[styles.filterBtn, filterType === t && styles.filterBtnActive]}
                            onPress={() => setFilterType(t)}
                        >
                            <Text style={[styles.filterBtnText, filterType === t && styles.filterBtnTextActive]}>{t.toUpperCase()}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.entryList}>
                    {filteredEntries.map(entry => (
                        <TouchableOpacity key={entry.id} style={styles.entryItem} onPress={() => { setSelectedEntry(entry); setDetailsModalVisible(true); }}>
                            <View style={[styles.entryTypeIcon, { backgroundColor: entry.type === 'maintenance' ? '#FEE2E2' : '#F0FDF4' }]}>
                                {entry.type === 'maintenance' ? <Briefcase size={16} color={Colors.light.danger} /> : <TrendingUp size={16} color={Colors.light.success} />}
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.entryCarName}>{entry.carName}</Text>
                                <Text style={styles.entryMeta}>{entry.date} • {entry.driverName || 'N/A'}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={[styles.entryValue, { color: entry.myPortion >= 0 ? Colors.light.success : Colors.light.danger }]}>
                                    {entry.myPortion >= 0 ? '+' : ''}₹{entry.myPortion.toLocaleString()}
                                </Text>
                                <Text style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                                    {entry.type === 'maintenance' ? 'Cost' : 'Fleet Profit'}: ₹{entry.profit.toLocaleString()}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            {/* Car Modal */}
            <Modal visible={carModalVisible} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setCarModalVisible(false)} />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{selectedCar ? 'Edit Car' : 'Add New Car'}</Text>
                            <TouchableOpacity onPress={() => setCarModalVisible(false)}><X size={24} color="#000" /></TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <FloatingLabelInput label="Car Name (e.g. Swift 001)" value={carName} onChangeText={setCarName} />
                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 10 }}>
                                    <FloatingLabelInput label="Brand" value={carBrand} onChangeText={setCarBrand} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <FloatingLabelInput label="Year" value={carYear} onChangeText={setCarYear} keyboardType="numeric" />
                                </View>
                            </View>
                            <FloatingLabelInput label="EMI Amount ₹" value={carEmi} onChangeText={setCarEmi} keyboardType="numeric" />
                            <View style={styles.row}>
                                <TouchableOpacity style={[styles.input, { flex: 1, justifyContent: 'center' }]} onPress={() => setShowEmiDatePicker(true)}>
                                    <Text style={{ color: '#000' }}>{carEmiDate.toLocaleDateString()}</Text>
                                </TouchableOpacity>
                            </View>
                            {!selectedCar && (
                                <View style={styles.switchBox}>
                                    <Text style={{ fontWeight: '600' }}>EMI Starts Next Month?</Text>
                                    <Switch value={emiStartNextMonth} onValueChange={setEmiStartNextMonth} />
                                </View>
                            )}
                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 10 }}>
                                    <FloatingLabelInput label="Total Tenure" value={carTotalTenure} onChangeText={setCarTotalTenure} keyboardType="numeric" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <FloatingLabelInput label="Remaining" value={carRemainingTenure} onChangeText={setCarRemainingTenure} keyboardType="numeric" />
                                </View>
                            </View>
                            <View style={styles.switchBox}>
                                <Text style={{ fontWeight: '600' }}>Business Partner?</Text>
                                <Switch value={hasPartner} onValueChange={setHasPartner} />
                            </View>
                            {hasPartner && (
                                <View style={styles.row}>
                                    <View style={{ flex: 1, marginRight: 10 }}>
                                        <FloatingLabelInput label="Partner Name" value={partnerName} onChangeText={setPartnerName} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <FloatingLabelInput label="Share %" value={partnerShare} onChangeText={setPartnerShare} keyboardType="numeric" />
                                    </View>
                                </View>
                            )}
                            <TouchableOpacity style={styles.submitBtn} onPress={handleAddCar}>
                                <Text style={styles.submitBtnText}>{selectedCar ? 'Update Car' : 'Save Car Fleet'}</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
                {showEmiDatePicker && (
                    <DateTimePicker
                        value={carEmiDate}
                        onChange={(e, d) => { setShowEmiDatePicker(false); if (d) setCarEmiDate(d); }}
                    />
                )}
            </Modal>

            {/* Entry Modal */}
            <Modal visible={entryModalVisible} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setEntryModalVisible(false)} />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingEntry ? 'Edit Entry' : 'Daily Fleet Entry'}</Text>
                            <TouchableOpacity onPress={() => setEntryModalVisible(false)}><X size={24} color="#000" /></TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.label}>Select Car</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                                {data.business?.cars?.map(c => (
                                    <TouchableOpacity key={c.id} style={[styles.chip, entryCarId === c.id && styles.chipActive, { marginRight: 8 }]} onPress={() => setEntryCarId(c.id)}>
                                        <Text style={[styles.chipText, entryCarId === c.id && styles.chipTextActive]}>{c.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <View style={styles.typeToggle}>
                                {['rent', 'commission', 'maintenance'].map(t => (
                                    <TouchableOpacity key={t} style={[styles.typeBtn, entryType === t && styles.typeBtnActive]} onPress={() => setEntryType(t)}>
                                        <Text style={[styles.typeBtnText, entryType === t && styles.typeBtnTextActive]}>{t.toUpperCase()}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {entryType === 'commission' && (
                                <View style={styles.formulaBox}>
                                    <Info size={14} color={Colors.light.primary} />
                                    <Text style={styles.formulaText}>Formula: (Earnings - CNG) / 2 - ₹100 Fee</Text>
                                </View>
                            )}

                            <FloatingLabelInput
                                label={entryType === 'commission' ? "Total Earnings ₹" : "Amount ₹"}
                                value={entryAmount}
                                onChangeText={setEntryAmount}
                                keyboardType="numeric"
                            />

                            {entryType === 'commission' && (
                                <>
                                    <View style={styles.uberCommRow}>
                                        <View style={{ flex: 1 }}>
                                            <FloatingLabelInput
                                                label={entryUberCommType === 'percentage' ? "Uber Commission %" : "Uber Commission ₹"}
                                                value={entryUberComm}
                                                onChangeText={setEntryUberComm}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                        <View style={styles.commTypeToggleSmall}>
                                            <TouchableOpacity
                                                style={[styles.commTypeBtn, entryUberCommType === 'percentage' && styles.commTypeBtnActive]}
                                                onPress={() => setEntryUberCommType('percentage')}
                                            >
                                                <Text style={[styles.commTypeBtnText, entryUberCommType === 'percentage' && styles.commTypeBtnTextActive]}>%</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.commTypeBtn, entryUberCommType === 'fixed' && styles.commTypeBtnActive]}
                                                onPress={() => setEntryUberCommType('fixed')}
                                            >
                                                <Text style={[styles.commTypeBtnText, entryUberCommType === 'fixed' && styles.commTypeBtnTextActive]}>₹</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <View style={styles.row}>
                                        <View style={{ flex: 1, marginRight: 10 }}>
                                            <FloatingLabelInput
                                                label="CNG Cost ₹"
                                                value={entryCng}
                                                onChangeText={setEntryCng}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <FloatingLabelInput
                                                label="Drivers Count"
                                                value={entryDrivers}
                                                onChangeText={setEntryDrivers}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                    </View>
                                </>
                            )}

                            <Text style={styles.label}>Driver</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                                {data.business?.drivers?.map(d => (
                                    <TouchableOpacity key={d.id} style={[styles.chip, entryDriverId === d.id && styles.chipActive, { marginRight: 8 }]} onPress={() => setEntryDriverId(d.id)}>
                                        <Text style={[styles.chipText, entryDriverId === d.id && styles.chipTextActive]}>{d.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowPicker(true)}>
                                <Calendar size={18} color="#666" />
                                <Text style={{ fontWeight: '600' }}>{entryDate.toLocaleDateString()}</Text>
                            </TouchableOpacity>
                            {showPicker && <DateTimePicker value={entryDate} onChange={(e, d) => { setShowPicker(false); if (d) setEntryDate(d); }} />}

                            <TouchableOpacity style={styles.submitBtn} onPress={handleAddEntry}>
                                <Text style={styles.submitBtnText}>Confirm Entry</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Drivers Modal */}
            <Modal visible={driverModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setDriverModalVisible(false)} />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Fleet Drivers</Text>
                            <TouchableOpacity onPress={() => setDriverModalVisible(false)}><X size={24} color="#000" /></TouchableOpacity>
                        </View>
                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 10 }}>
                                <FloatingLabelInput label="Driver Name" value={newDriverName} onChangeText={setNewDriverName} />
                            </View>
                            <TouchableOpacity style={styles.addIconBtn} onPress={() => { if (!newDriverName) return; if (editingDriver) { updateDriver(editingDriver.id, newDriverName); setEditingDriver(null); } else { addDriver(newDriverName); } setNewDriverName(''); }}>
                                {editingDriver ? <Check color="#fff" /> : <Plus color="#fff" size={24} />}
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 300, marginTop: 15 }}>
                            {data.business?.drivers?.map(d => (
                                <View key={d.id} style={styles.driverRow}>
                                    <Text style={styles.driverName}>{d.name}</Text>
                                    <View style={styles.row}>
                                        <TouchableOpacity onPress={() => { setEditingDriver(d); setNewDriverName(d.name); }}><Edit2 size={18} color={Colors.light.primary} /></TouchableOpacity>
                                        <TouchableOpacity onPress={() => confirmDeleteDriver(d.id)}><Trash2 size={18} color={Colors.light.danger} /></TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Breakdown Modal */}
            <Modal visible={detailsModalVisible} transparent animationType="fade">
                <View style={[styles.modalOverlay, { justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }]}>
                    <TouchableOpacity style={{ flex: 1, position: 'absolute', width: '100%', height: '100%' }} onPress={() => setDetailsModalVisible(false)} />
                    <View style={styles.detailsContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Entry Breakdown</Text>
                            <TouchableOpacity onPress={() => setDetailsModalVisible(false)}><X size={24} color="#000" /></TouchableOpacity>
                        </View>
                        {selectedEntry && (
                            <View>
                                <View style={styles.detailRow}><Text style={styles.detailL}>Date</Text><Text style={styles.detailV}>{selectedEntry.date}</Text></View>
                                <View style={styles.detailRow}><Text style={styles.detailL}>Entry Type</Text><Text style={[styles.detailV, { textTransform: 'uppercase' }]}>{selectedEntry.type}</Text></View>
                                <View style={styles.detailRow}><Text style={styles.detailL}>Car</Text><Text style={styles.detailV}>{selectedEntry.carName}</Text></View>
                                <View style={styles.divider} />
                                <View style={styles.detailRow}><Text style={styles.detailL}>Driver</Text><Text style={styles.detailV}>{selectedEntry.driverName || 'N/A'}</Text></View>
                                <View style={styles.detailRow}><Text style={styles.detailL}>{selectedEntry.type === 'commission' ? 'Total Earnings' : 'Amount'}</Text><Text style={styles.detailV}>₹{selectedEntry.amount.toLocaleString()}</Text></View>
                                {selectedEntry.type === 'commission' && (
                                    <>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailL}>Uber Commission</Text>
                                            <Text style={[styles.detailV, { color: '#666' }]}>
                                                ₹{(selectedEntry.uberCommissionType === 'percentage' ? (selectedEntry.amount * selectedEntry.uberCommission / 100) : parseFloat(selectedEntry.uberCommission)).toLocaleString()}
                                                <Text style={{ fontSize: 10, fontWeight: '400' }}> ({selectedEntry.uberCommission}{selectedEntry.uberCommissionType === 'percentage' ? '%' : '₹'})</Text>
                                            </Text>
                                        </View>
                                        <View style={[styles.detailRow, { marginTop: -8, marginBottom: 8 }]}><Text style={styles.detailL}></Text><Text style={{ fontSize: 10, color: '#999' }}>* Already deducted from payout</Text></View>
                                        <View style={styles.detailRow}><Text style={styles.detailL}>CNG</Text><Text style={[styles.detailV, { color: Colors.light.danger }]}>-₹{(selectedEntry.cng || 0).toLocaleString()}</Text></View>
                                        <View style={styles.detailRow}><Text style={styles.detailL}>Driver Share</Text><Text style={[styles.detailV, { color: Colors.light.primary }]}>₹{(selectedEntry.driverPortion || 0).toLocaleString()}</Text></View>
                                        <View style={styles.detailRow}><Text style={styles.detailL}>Platform Fee</Text><Text style={[styles.detailV, { color: Colors.light.danger }]}>-₹{(selectedEntry.platformFee || 0).toLocaleString()}</Text></View>
                                    </>
                                )}
                                <View style={styles.divider} />
                                <View style={styles.detailRow}><Text style={[styles.detailL, { fontWeight: '800' }]}>My Net Share</Text><Text style={[styles.detailV, { fontWeight: '800', color: Colors.light.success }]}>₹{selectedEntry.myPortion.toLocaleString()}</Text></View>
                                <View style={styles.actionRow}>
                                    <TouchableOpacity style={styles.editBtn} onPress={() => { setEditingEntry(selectedEntry); setEntryCarId(selectedEntry.carId); setEntryType(selectedEntry.type); setEntryAmount(selectedEntry.amount.toString()); setEntryCng(selectedEntry.cng?.toString() || ''); setEntryDrivers(selectedEntry.drivers?.toString() || '1'); setEntryUberComm(selectedEntry.uberCommission?.toString() || ''); setEntryUberCommType(selectedEntry.uberCommissionType || 'percentage'); setEntryDate(new Date(selectedEntry.date)); setEntryDriverId(selectedEntry.driverId || ''); setDetailsModalVisible(false); setEntryModalVisible(true); }}><Text style={styles.btnText}>Edit</Text></TouchableOpacity>
                                    <TouchableOpacity style={styles.delBtn} onPress={() => confirmDeleteEntry(selectedEntry.id)}><Text style={styles.btnText}>Delete</Text></TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            <CustomPopup visible={popup.visible} type={popup.type} title={popup.title} message={popup.message} onClose={() => setPopup({ ...popup, visible: false })} onConfirm={popup.onConfirm} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfc80' },
    content: { padding: 20, paddingBottom: 100 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    title: { fontSize: 32, fontWeight: '900', color: '#1a1a1a', letterSpacing: -1 },
    subtitle: { fontSize: 13, color: '#666', marginTop: 2, fontWeight: '600' },
    headerIcons: { flexDirection: 'row', gap: 12 },
    headerBtn: { width: 50, height: 50, borderRadius: 15, backgroundColor: Colors.light.primary, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowOpacity: 0.2, shadowRadius: 8 },

    profitCard: { flex: 1, padding: 20, borderRadius: 25, elevation: 2, shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: '#f0f0f0' },
    profitLabel: { fontSize: 12, fontWeight: '800', marginBottom: 5, color: '#666' },
    profitValue: { fontSize: 24, fontWeight: '900' },

    reportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
    reportBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

    cycleBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 10 },
    cycleBadgeText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700' },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 },
    sectionTitle: { fontSize: 20, fontWeight: '900', color: '#1a1a1a' },

    carList: { marginBottom: 10 },
    carCard: { backgroundColor: '#fff', width: 260, padding: 18, borderRadius: 24, marginRight: 15, backgroundColor: Colors.light.primary + '10' },
    carHeaderCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    carIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.light.primary, alignItems: 'center', justifyContent: 'center' },
    carNameText: { fontSize: 15, fontWeight: '800' },
    carSubText: { fontSize: 11, color: '#666', fontWeight: '600' },
    carActions: { flexDirection: 'row', gap: 12 },
    emiStatusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f5f5f5' },
    tenureText: { fontSize: 10, fontWeight: '700', color: '#999' },
    emiDayText: { fontSize: 12, fontWeight: '800', color: '#333', marginTop: 2 },
    payBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
    payBtnText: { color: '#fff', fontSize: 11, fontWeight: '900' },

    addEntryHighlight: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.light.success, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 15, elevation: 4 },
    addEntryHText: { color: '#fff', fontWeight: '800', fontSize: 14 },

    filterBar: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    filterBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, backgroundColor: '#f0f0f0' },
    filterBtnActive: { backgroundColor: Colors.light.primary },
    filterBtnText: { fontSize: 11, fontWeight: '800', color: '#666' },
    filterBtnTextActive: { color: '#fff' },

    entryList: { gap: 12 },
    entryItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 20, elevation: 0, shadowOpacity: 0.05, shadowRadius: 5 },
    entryTypeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    entryCarName: { fontWeight: '800', fontSize: 16 },
    entryMeta: { fontSize: 12, color: '#999', marginTop: 2, fontWeight: '600' },
    entryValue: { fontWeight: '900', fontSize: 18 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: '900' },
    label: { fontSize: 14, fontWeight: '800', color: '#666', marginBottom: 10 },
    input: { backgroundColor: '#f8f9fa', padding: 18, borderRadius: 18, marginBottom: 15, fontSize: 16, color: '#000', fontWeight: '600' },
    row: { flexDirection: 'row', gap: 12, marginBottom: 5 },
    switchBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: 15, backgroundColor: '#f8f9fa', borderRadius: 18 },
    submitBtn: { backgroundColor: Colors.light.primary, padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 15, elevation: 5 },
    submitBtnText: { color: '#fff', fontSize: 18, fontWeight: '900' },

    chipRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 15, backgroundColor: '#f0f0f0', minWidth: 80, alignItems: 'center' },
    chipActive: { backgroundColor: Colors.light.primary },
    chipText: { fontSize: 13, color: '#666', fontWeight: '700' },
    chipTextActive: { color: '#fff' },

    typeToggle: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 18, padding: 5, marginBottom: 20 },
    typeBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 14 },
    typeBtnActive: { backgroundColor: '#fff', elevation: 3 },
    typeBtnText: { fontSize: 11, fontWeight: '900', color: '#999' },
    typeBtnTextActive: { color: Colors.light.primary },

    formulaBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EFF6FF', padding: 12, borderRadius: 12, marginBottom: 15 },
    formulaText: { fontSize: 12, color: Colors.light.primary, fontWeight: '700' },

    commTypeToggle: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 12, padding: 3 },
    commTypeToggleSmall: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 12, padding: 3, height: 40, width: 80, marginLeft: 10, marginTop: 10 },
    commTypeBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 10, justifyContent: 'center' },
    commTypeBtnActive: { backgroundColor: '#fff', elevation: 2 },
    commTypeBtnText: { fontSize: 10, fontWeight: '900', color: '#999' },
    commTypeBtnTextActive: { color: Colors.light.primary },

    uberCommRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },

    dateBtn: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#f8f9fa', padding: 18, borderRadius: 18, marginBottom: 20 },

    addIconBtn: { width: 56, height: 56, borderRadius: 15, backgroundColor: Colors.light.primary, alignItems: 'center', justifyContent: 'center' },
    driverRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, backgroundColor: '#f9f9f9', borderRadius: 20, marginBottom: 10 },
    driverName: { fontWeight: '800', fontSize: 16 },

    detailsContent: { backgroundColor: '#fff', borderRadius: 30, padding: 30, width: '92%', alignSelf: 'center' },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
    detailL: { color: '#666', fontWeight: '600' },
    detailV: { fontWeight: '800' },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 15 },
    actionRow: { flexDirection: 'row', gap: 12, marginTop: 25 },
    editBtn: { flex: 1, backgroundColor: Colors.light.primary, padding: 15, borderRadius: 15, alignItems: 'center' },
    delBtn: { flex: 1, backgroundColor: Colors.light.danger, padding: 15, borderRadius: 15, alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: '900' },
    emptyText: { textAlign: 'center', color: '#999', marginVertical: 30, fontSize: 13, fontWeight: '600' }
});
