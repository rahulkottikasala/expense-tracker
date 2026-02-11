import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FloatingLabelInput from '../../components/FloatingLabelInput';
import { Colors } from '../../constants/Theme';
import { useTransactions } from '../../hooks/useTransactions';
import { Database, Download, Upload, Trash2, Info, Edit2, Pencil, Landmark, Wallet, CreditCard, Clock, X, CircleAlert, FileText, History, Calendar } from 'lucide-react-native';
import { cacheDirectory, writeAsStringAsync, readAsStringAsync, StorageAccessFramework } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import CustomPopup from '../../components/CustomPopup';

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const {
        data, setInitialAmount, importData,
        editBank, deleteBank, editIncome, deleteIncome,
        editExpense, deleteExpense, editEMI, deleteEMI,
        forceCloseEMI, updateBusinessCycleDay
    } = useTransactions();

    const [importText, setImportText] = useState('');

    // Custom Popup State
    const [popup, setPopup] = useState({ visible: false, type: 'info', title: '', message: '', confirmAction: null });
    const showPopup = (type, title, message, confirmAction = null) => {
        setPopup({ visible: true, type, title, message, confirmAction });
    };

    // View state for Grid vs List
    const [activeSection, setActiveSection] = useState(null); // 'banks', 'income', 'expenses', 'emis'

    // Export Options Modal
    const [exportModalVisible, setExportModalVisible] = useState(false);
    const [pendingExportFormat, setPendingExportFormat] = useState('json'); // 'json' or 'csv'

    // Management Modals
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingType, setEditingType] = useState(''); // 'bank', 'income', 'expense', 'emi'
    const [selectedItem, setSelectedItem] = useState(null);

    // Force Close Modal
    const [closeModalVisible, setCloseModalVisible] = useState(false);
    const [closeEMI, setCloseEMI] = useState(null);
    const [closureAmt, setClosureAmt] = useState('');
    const [targetBankId, setTargetBankId] = useState('');

    const [tempCycleDay, setTempCycleDay] = useState(data.business?.cycleDay || 5);

    React.useEffect(() => {
        if (data.business?.cycleDay) {
            setTempCycleDay(data.business.cycleDay);
        }
    }, [data.business?.cycleDay]);

    const handleSaveInit = () => {
        setInitialAmount(parseFloat(initAmt) || 0);
        showPopup('success', 'Success', 'Initial balance updated!');
    };

    const confirmDelete = (type, id, name) => {
        showPopup('confirm', 'Confirm Delete', `Are you sure you want to delete "${name}"?`, () => {
            if (type === 'bank') deleteBank(id);
            if (type === 'income') deleteIncome(id);
            if (type === 'expense') deleteExpense(id);
            if (type === 'emi') deleteEMI(id);
        });
    };

    const handleEditSave = () => {
        if (!selectedItem) return;
        if (editingType === 'bank') editBank(selectedItem.id, selectedItem);
        if (editingType === 'income') editIncome(selectedItem.id, selectedItem);
        if (editingType === 'expense') editExpense(selectedItem.id, selectedItem);
        if (editingType === 'emi') editEMI(selectedItem.id, selectedItem);
        setEditModalVisible(false);
    };

    const handleForceClose = () => {
        if (!closeEMI || !targetBankId) {
            showPopup('error', 'Error', 'Please select a bank to deduct from.');
            return;
        }
        forceCloseEMI(closeEMI.id, parseFloat(closureAmt) || 0, targetBankId);
        setCloseModalVisible(false);
        showPopup('success', 'Closure Completed', `EMI for ${closeEMI.name} has been closed.`);
    };

    const handleExport = (format = 'json') => {
        setPendingExportFormat(format);
        setExportModalVisible(true);
    };

    const executeExport = async (action = 'share') => {
        setExportModalVisible(false);
        try {
            let content, filename, mimeType;
            if (pendingExportFormat === 'json') {
                content = JSON.stringify(data, null, 2);
                filename = `nexus_backup_${new Date().toISOString().split('T')[0]}.json`;
                mimeType = 'application/json';
            } else {
                const history = data.history || [];
                const headers = 'Date,Type,Title,Amount,Category\n';
                const rows = history.map(h => `${new Date(h.timestamp).toLocaleDateString()},${h.type},"${h.title}",${h.amount},${h.category}`).join('\n');
                content = headers + rows;
                filename = `nexus_history_${new Date().toISOString().split('T')[0]}.csv`;
                mimeType = 'text/csv';
            }

            const fileUri = (cacheDirectory || '').endsWith('/')
                ? cacheDirectory + filename
                : `${cacheDirectory}/${filename}`;
            await writeAsStringAsync(fileUri, content);

            if (action === 'share') {
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(fileUri, { mimeType, dialogTitle: `Export ${pendingExportFormat.toUpperCase()}` });
                } else {
                    showPopup('error', 'Error', 'Sharing not available on this device');
                }
            } else {
                // Download / Save to Device
                if (Platform.OS === 'android') {
                    const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
                    if (permissions.granted) {
                        const base64 = await readAsStringAsync(fileUri, { encoding: 'base64' });
                        await StorageAccessFramework.createFileAsync(permissions.directoryUri, filename, mimeType)
                            .then(async (uri) => {
                                await writeAsStringAsync(uri, base64, { encoding: 'base64' });
                                showPopup('success', 'Saved!', 'File has been saved to your selected directory.');
                            })
                            .catch(e => {
                                console.error(e);
                                showPopup('error', 'Save Failed', 'Could not save file to device.');
                            });
                    }
                } else {
                    // On iOS, shareAsync handles "Save to Files" natively
                    await Sharing.shareAsync(fileUri, { mimeType, dialogTitle: `Save ${pendingExportFormat.toUpperCase()}` });
                }
            }
        } catch (e) {
            console.error('Export Error:', e);
            showPopup('error', 'Export Failed', `Unable to generate backup. ${e.message || e.toString()}`);
        }
    };

    const handleImportFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
            if (result.canceled) return;

            const fileUri = result.assets[0].uri;
            console.log('Importing from:', fileUri);
            const content = await readAsStringAsync(fileUri);
            if (!content) throw new Error('File is empty');

            const parsed = JSON.parse(content);

            showPopup('confirm', 'Confirm Import', 'This will OVERWRITE all your current data with the backup file. Proceed?', async () => {
                const success = await importData(content);
                if (success) {
                    showPopup('success', 'Imported!', 'Your financial records have been restored.');
                } else {
                    showPopup('error', 'Invalid File', 'The selected file is not a valid Nexus CashFlow backup.');
                }
            });
        } catch (e) {
            showPopup('error', 'Import Failed', 'Failed to read the selected file.');
        }
    };

    const ManagementCard = ({ title, icon: Icon, color, onPress, count }) => (
        <TouchableOpacity style={styles.gridCard} onPress={onPress}>
            <View style={[styles.gridIcon, { backgroundColor: color + '15' }]}>
                <Icon size={24} color={color} />
            </View>
            <View>
                <Text style={styles.gridTitle}>{title}</Text>
                <Text style={styles.gridCount}>{count || 0} items</Text>
            </View>
        </TouchableOpacity>
    );

    const renderHeader = () => (
        <View style={styles.sectionHeaderCustom}>
            <Database size={24} color={Colors.light.primary} />
            <Text style={styles.sectionTitleHeader}>Global Control</Text>
        </View>
    );

    const renderGrid = () => (
        <View style={styles.gridContainer}>
            <Text style={styles.sectionTitle}>Financial Modules</Text>
            <View style={styles.grid}>
                <ManagementCard
                    title="Bank Accounts"
                    icon={Landmark}
                    color={Colors.light.primary}
                    count={data.banks.length}
                    onPress={() => setActiveSection('banks')}
                />
                <ManagementCard
                    title="Active EMIs"
                    icon={Clock}
                    color={Colors.light.accent}
                    count={data.emis.filter(e => e.status === 'active').length}
                    onPress={() => setActiveSection('emis')}
                />
                <ManagementCard
                    title="Income Logs"
                    icon={Wallet}
                    color={Colors.light.success}
                    count={data.income.length}
                    onPress={() => setActiveSection('income')}
                />
                <ManagementCard
                    title="Expense Logs"
                    icon={CreditCard}
                    color={Colors.light.danger}
                    count={data.expenses.length}
                    onPress={() => setActiveSection('expenses')}
                />
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Data & Security</Text>
            <View style={styles.dataGrid}>
                <TouchableOpacity style={styles.dataCard} onPress={() => handleExport('json')}>
                    <Download size={18} color={Colors.light.primary} />
                    <Text style={styles.dataCardText}>Backup JSON</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dataCard} onPress={handleImportFile}>
                    <Upload size={18} color={Colors.light.secondary} />
                    <Text style={styles.dataCardText}>Restore File</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dataCard} onPress={() => handleExport('csv')}>
                    <FileText size={18} color={Colors.light.info} />
                    <Text style={styles.dataCardText}>Export CSV</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderList = () => {
        let content = null;
        let title = "";
        let icon = null;

        switch (activeSection) {
            case 'banks':
                title = "Banks Management";
                icon = <Landmark size={20} color={Colors.light.primary} />;
                content = data.banks.map(bank => (
                    <View key={bank.id} style={styles.mgmtRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.rowName}>{bank.name}</Text>
                            <Text style={styles.rowVal}>₹{bank.balance.toLocaleString()}</Text>
                        </View>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => { setSelectedItem(bank); setEditingType('bank'); setEditModalVisible(true); }}>
                            <Edit2 size={18} color="#666" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => confirmDelete('bank', bank.id, bank.name)}>
                            <Trash2 size={18} color={Colors.light.danger} />
                        </TouchableOpacity>
                    </View>
                ));
                break;
            case 'emis':
                title = "EMI Management";
                icon = <Clock size={20} color={Colors.light.accent} />;
                content = data.emis.filter(e => e.status === 'active').map(emi => (
                    <View key={emi.id} style={styles.mgmtRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.rowName}>{emi.name}</Text>
                            <Text style={styles.rowVal}>₹{emi.amount.toLocaleString()} ({emi.type})</Text>
                        </View>
                        {emi.type === 'debt' && (
                            <TouchableOpacity
                                style={styles.forceCloseBtn}
                                onPress={() => { setCloseEMI(emi); setClosureAmt((emi.amount * (emi.remainingTenure || 0)).toString()); setCloseModalVisible(true); }}
                            >
                                <Text style={styles.forceCloseText}>Force Close</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.iconBtn} onPress={() => { setSelectedItem(emi); setEditingType('emi'); setEditModalVisible(true); }}>
                            <Edit2 size={18} color="#666" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => confirmDelete('emi', emi.id, emi.name)}>
                            <Trash2 size={18} color={Colors.light.danger} />
                        </TouchableOpacity>
                    </View>
                ));
                break;
            case 'income':
                title = "Recent Income";
                icon = <Wallet size={20} color={Colors.light.success} />;
                content = data.income.map(item => (
                    <View key={item.id} style={styles.mgmtRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.rowName}>{item.name}</Text>
                            <Text style={styles.rowVal}>₹{item.amount.toLocaleString()} • {item.date}</Text>
                        </View>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => { setSelectedItem(item); setEditingType('income'); setEditModalVisible(true); }}>
                            <Edit2 size={18} color="#666" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => confirmDelete('income', item.id, item.name)}>
                            <Trash2 size={18} color={Colors.light.danger} />
                        </TouchableOpacity>
                    </View>
                ));
                break;
            case 'expenses':
                title = "Recent Expenses";
                icon = <CreditCard size={20} color={Colors.light.danger} />;
                content = data.expenses.map(item => (
                    <View key={item.id} style={styles.mgmtRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.rowName}>{item.name}</Text>
                            <Text style={styles.rowVal}>₹{item.amount.toLocaleString()} • {item.category}</Text>
                        </View>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => { setSelectedItem(item); setEditingType('expense'); setEditModalVisible(true); }}>
                            <Edit2 size={18} color="#666" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => confirmDelete('expense', item.id, item.name)}>
                            <Trash2 size={18} color={Colors.light.danger} />
                        </TouchableOpacity>
                    </View>
                ));
                break;
        }

        return (
            <View style={styles.listContainer}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setActiveSection(null)}>
                    <X size={20} color="#666" />
                    <Text style={styles.backBtnText}>Back to Hub</Text>
                </TouchableOpacity>
                <View style={styles.headerRow}>
                    {icon}
                    <Text style={styles.sectionTitleWide}>{title}</Text>
                </View>
                {content}
                {(!content || content.length === 0) && (
                    <View style={styles.emptyState}>
                        <Info size={40} color="#eee" />
                        <Text style={styles.emptyStateText}>No records found in this section.</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView contentContainerStyle={styles.content}>
                {renderHeader()}
                {!activeSection ? renderGrid() : renderList()}

                {/* Modals for Editing */}
                <Modal visible={editModalVisible} transparent animationType="slide">
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Update Record</Text>
                                    <TouchableOpacity onPress={() => setEditModalVisible(false)}><X size={24} color="#000" /></TouchableOpacity>
                                </View>
                                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                    {selectedItem && (
                                        <View>
                                            <Text style={styles.label}>Title</Text>
                                            <TextInput style={styles.input} value={selectedItem.name} onChangeText={t => setSelectedItem({ ...selectedItem, name: t })} />

                                            <Text style={styles.label}>Amount (₹)</Text>
                                            <TextInput style={styles.input} keyboardType="numeric" value={(selectedItem.balance !== undefined ? selectedItem.balance : selectedItem.amount).toString()} onChangeText={t => setSelectedItem({ ...selectedItem, [selectedItem.balance !== undefined ? 'balance' : 'amount']: parseFloat(t) || 0 })} />

                                            {editingType === 'emi' && (
                                                <>
                                                    <Text style={styles.label}>Due Date (Day of Month)</Text>
                                                    <TextInput
                                                        style={styles.input}
                                                        value={selectedItem.date}
                                                        onChangeText={t => setSelectedItem({ ...selectedItem, date: t })}
                                                    />
                                                    {selectedItem.type === 'debt' && (
                                                        <>
                                                            <Text style={styles.label}>Pending Tenure (Months left)</Text>
                                                            <TextInput
                                                                style={styles.input}
                                                                keyboardType="numeric"
                                                                value={selectedItem.remainingTenure?.toString()}
                                                                onChangeText={t => setSelectedItem({ ...selectedItem, remainingTenure: parseInt(t) || 0 })}
                                                            />
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </View>
                                    )}
                                    <TouchableOpacity style={styles.btn} onPress={handleEditSave}><Text style={styles.btnText}>Save Changes</Text></TouchableOpacity>
                                </ScrollView>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>

                <Modal visible={closeModalVisible} transparent animationType="slide">
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Settle & Close EMI</Text>
                                    <TouchableOpacity onPress={() => setCloseModalVisible(false)}><X size={24} color="#000" /></TouchableOpacity>
                                </View>
                                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                    <Text style={styles.label}>Total Settlement Amount (Remaining Months * EMI)</Text>
                                    <TextInput style={styles.input} keyboardType="numeric" value={closureAmt} onChangeText={setClosureAmt} />

                                    <Text style={styles.label}>Select Payment Source</Text>
                                    <View style={styles.bankPicker}>
                                        {data.banks.map(b => (
                                            <TouchableOpacity
                                                key={b.id}
                                                style={[styles.bankChoice, targetBankId === b.id && styles.bankChoiceActive]}
                                                onPress={() => setTargetBankId(b.id)}
                                            >
                                                <Text style={[styles.bankChoiceText, targetBankId === b.id && styles.bankChoiceTextActive]}>{b.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    <TouchableOpacity style={[styles.btn, { backgroundColor: Colors.light.danger }]} onPress={handleForceClose}>
                                        <Text style={styles.btnText}>Close EMI Forever</Text>
                                    </TouchableOpacity>
                                </ScrollView>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>
                <View style={[styles.section, { marginTop: 20 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
                        <Text style={styles.sectionTitle}>Business Preferences</Text>
                        <View style={styles.badge}>
                            <Calendar size={12} color={Colors.light.primary} />
                            <Text style={styles.badgeText}>Cycle Reset</Text>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Monthly Start Day</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.dayPicker}
                            contentContainerStyle={{ paddingVertical: 10 }}
                        >
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                <TouchableOpacity
                                    key={day}
                                    style={[
                                        styles.dayItem,
                                        tempCycleDay === day && styles.dayItemActive
                                    ]}
                                    onPress={() => setTempCycleDay(day)}
                                >
                                    <Text style={[
                                        styles.dayText,
                                        tempCycleDay === day && styles.dayTextActive
                                    ]}>{day}</Text>
                                    {tempCycleDay === day && <View style={styles.activeDot} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.cycleInfoBox}>
                            <Info size={14} color={Colors.light.primary} />
                            <Text style={styles.cycleInfoText}>
                                Your financial month starts on the <Text style={{ fontWeight: '800' }}>{tempCycleDay}th</Text> and ends on the <Text style={{ fontWeight: '800' }}>{(tempCycleDay - 1 || 31)}th</Text> of next month.
                            </Text>
                        </View>

                        {tempCycleDay !== data.business?.cycleDay && (
                            <TouchableOpacity
                                style={[styles.submitBtnInCard, { marginTop: 15 }]}
                                onPress={() => {
                                    showPopup('confirm', 'Update Business Cycle?', `Your reports and profits will now reset on the ${tempCycleDay}th of every month.`, () => {
                                        updateBusinessCycleDay(tempCycleDay);
                                        showPopup('success', 'Cycle Updated', `Business cycle now starts on the ${tempCycleDay}th.`);
                                    });
                                }}
                            >
                                <Text style={styles.submitBtnTextInCard}>Update Calculation Day</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View style={styles.footer}>
                    <History size={16} color="#999" />
                    <Text style={styles.footerText}>Audit Trail Enabled • v2.3.0</Text>
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

            {/* Export Options Modal */}
            <Modal visible={exportModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setExportModalVisible(false)} />
                    <View style={styles.exportModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Export Options</Text>
                            <TouchableOpacity onPress={() => setExportModalVisible(false)}><X size={24} color="#000" /></TouchableOpacity>
                        </View>
                        <Text style={styles.exportSub}>How would you like to handle your {pendingExportFormat.toUpperCase()} file?</Text>

                        <View style={styles.exportOptionsRow}>
                            <TouchableOpacity style={styles.exportOption} onPress={() => executeExport('share')}>
                                <View style={[styles.exportIcon, { backgroundColor: Colors.light.primary + '15' }]}>
                                    <Upload size={24} color={Colors.light.primary} />
                                </View>
                                <Text style={styles.exportText}>Share File</Text>
                                <Text style={styles.exportTip}>Send via apps</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.exportOption} onPress={() => executeExport('download')}>
                                <View style={[styles.exportIcon, { backgroundColor: Colors.light.success + '15' }]}>
                                    <Download size={24} color={Colors.light.success} />
                                </View>
                                <Text style={styles.exportText}>{Platform.OS === 'android' ? 'Download' : 'Save to Files'}</Text>
                                <Text style={styles.exportTip}>Store locally</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.light.background },
    content: { padding: 16 },
    sectionHeaderCustom: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
    sectionTitleHeader: { fontSize: 24, fontWeight: '900', marginLeft: 12, letterSpacing: -0.5 },

    // Grid Styles
    gridContainer: { marginBottom: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    gridCard: { width: '48%', backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: '#f0f0f0', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
    gridIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    gridTitle: { fontSize: 14, fontWeight: '800', color: '#000' },
    gridCount: { fontSize: 11, color: '#999', marginTop: 2 },

    dataGrid: { flexDirection: 'row', justifyContent: 'space-between' },
    dataCard: { width: '31%', backgroundColor: '#fff', padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#f0f0f0' },
    dataCardText: { fontSize: 9, fontWeight: '800', marginTop: 6, color: '#666' },

    // List View Styles
    listContainer: { paddingBottom: 20 },
    backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: '#f0f0f0', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    backBtnText: { marginLeft: 6, fontSize: 13, fontWeight: '700', color: '#666' },
    emptyState: { padding: 40, alignItems: 'center' },
    emptyStateText: { marginTop: 10, color: '#999', fontSize: 13 },

    section: { marginBottom: 30 },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    sectionTitleWide: { fontSize: 18, fontWeight: '800', marginLeft: 10 },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#444' },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#f0f0f0' },
    label: { fontSize: 13, color: '#666', marginBottom: 8, fontWeight: '600' },
    input: { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 16, fontWeight: '600' },
    btn: { backgroundColor: Colors.light.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    btnRow: { backgroundColor: Colors.light.primary, padding: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    btnTextIcon: { color: '#fff', fontWeight: '700', fontSize: 15, marginLeft: 10 },
    mgmtRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
    rowName: { fontWeight: '700', fontSize: 15 },
    rowVal: { fontSize: 12, color: '#999', marginTop: 2 },
    iconBtn: { padding: 10, borderRadius: 10, backgroundColor: '#f5f5f5', marginLeft: 8 },
    forceCloseBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FEE2E2', marginLeft: 8 },
    forceCloseText: { color: Colors.light.danger, fontWeight: '700', fontSize: 11 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '800' },
    bankPicker: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
    bankChoice: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f5f5f5', marginRight: 10, marginBottom: 10 },
    bankChoiceActive: { backgroundColor: Colors.light.primary },
    bankChoiceText: { fontWeight: '700', fontSize: 13, color: '#666' },
    bankChoiceTextActive: { color: '#fff' },
    footer: { paddingVertical: 30, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    footerText: { color: '#999', fontSize: 11, fontWeight: '600', marginLeft: 6 },

    badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4 },
    badgeText: { fontSize: 10, fontWeight: '800', color: Colors.light.primary, textTransform: 'uppercase' },
    cardLabel: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 12 },
    dayPicker: { marginHorizontal: -5 },
    dayItem: { width: 48, height: 56, borderRadius: 16, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginRight: 10, borderWidth: 1, borderColor: '#F1F5F9' },
    dayItemActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary, elevation: 4, shadowColor: Colors.light.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    dayText: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    dayTextActive: { color: '#fff' },
    activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#fff', marginTop: 4 },
    cycleInfoBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.light.primary + '08', padding: 16, borderRadius: 20, marginTop: 20, borderLeftWidth: 4, borderLeftColor: Colors.light.primary },
    cycleInfoText: { flex: 1, fontSize: 12, color: Colors.light.primary, lineHeight: 18, fontWeight: '500' },

    submitBtnInCard: { backgroundColor: Colors.light.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    submitBtnTextInCard: { color: '#fff', fontWeight: '800', fontSize: 13 },

    // Export Modal Styles
    exportModalContent: { backgroundColor: '#fff', padding: 24, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: 40 },
    exportSub: { color: '#64748B', fontSize: 13, marginBottom: 25, lineHeight: 18 },
    exportOptionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    exportOption: { width: '48%', backgroundColor: '#F8FAFC', borderRadius: 24, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
    exportIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    exportText: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
    exportTip: { fontSize: 10, color: '#94A3B8', marginTop: 4, fontWeight: '600' }
});
