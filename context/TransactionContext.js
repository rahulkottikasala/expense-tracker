import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TransactionContext = createContext();

const STORAGE_KEY = 'EXPENSE_TRACKER_DATA';

export function TransactionProvider({ children }) {
    const [data, setData] = useState({
        balance: 0,
        income: [],
        expenses: [],
        emis: [],
        banks: [], // { id, name, balance }
        investments: {
            stocks: 0,
            gold: 0,
            crypto: 0,
            mutualFunds: 0,
        },
        initialAmount: 0,
        historicalStats: [], // For past month graphs
        history: [], // Transaction audit log
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const storedData = await AsyncStorage.getItem(STORAGE_KEY);
            if (storedData) {
                const parsed = JSON.parse(storedData);
                setData(parsed);
            }
        } catch (e) {
            console.error('Failed to load data', e);
        } finally {
            setLoading(false);
        }
    };

    const saveData = async (newData) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
            setData(newData);
        } catch (e) {
            console.error('Failed to save data', e);
        }
    };

    const logTransaction = (type, title, amount, category = '', metadata = {}) => {
        const entry = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString(),
            type, // 'income', 'expense', 'emi', 'transfer', 'adjustment'
            title,
            amount: parseFloat(amount) || 0,
            category,
            ...metadata
        };
        return entry;
    };

    const addIncome = (item, bankId) => {
        const historyEntry = logTransaction('income', item.name, item.amount, item.type, { bankId });

        let updatedBanks = data.banks || [];
        if (bankId) {
            updatedBanks = updatedBanks.map(b =>
                b.id === bankId ? { ...b, balance: b.balance + parseFloat(item.amount) } : b
            );
        }

        const newData = {
            ...data,
            banks: updatedBanks,
            income: [{ ...item, id: Date.now().toString(), bankId }, ...data.income],
            history: [historyEntry, ...(data.history || [])]
        };
        saveData(newData);
    };

    const addExpense = (item, bankId) => {
        const historyEntry = logTransaction('expense', item.name, item.amount, item.category, { bankId });

        let updatedBanks = data.banks || [];
        if (bankId) {
            updatedBanks = updatedBanks.map(b =>
                b.id === bankId ? { ...b, balance: b.balance - parseFloat(item.amount) } : b
            );
        }

        const newData = {
            ...data,
            banks: updatedBanks,
            expenses: [{ ...item, id: Date.now().toString(), bankId }, ...data.expenses],
            history: [historyEntry, ...(data.history || [])]
        };
        saveData(newData);
    };

    const editIncome = (id, item) => {
        const newData = { ...data, income: data.income.map(i => i.id === id ? { ...item, id } : i) };
        saveData(newData);
    };

    const deleteIncome = (id) => {
        const newData = { ...data, income: data.income.filter(i => i.id !== id) };
        saveData(newData);
    };

    const editExpense = (id, item) => {
        const newData = { ...data, expenses: data.expenses.map(e => e.id === id ? { ...item, id } : e) };
        saveData(newData);
    };

    const deleteExpense = (id) => {
        const newData = { ...data, expenses: data.expenses.filter(e => e.id !== id) };
        saveData(newData);
    };

    const addEMI = (item) => {
        const historyEntry = logTransaction('emi_created', item.name, item.amount, item.type);
        const newData = {
            ...data,
            emis: [{ ...item, id: Date.now().toString() }, ...data.emis],
            history: [historyEntry, ...(data.history || [])]
        };
        saveData(newData);
    };

    const editEMI = (id, item) => {
        const newData = { ...data, emis: data.emis.map(e => e.id === id ? { ...item, id } : e) };
        saveData(newData);
    };

    const deleteEMI = (id) => {
        const newData = { ...data, emis: data.emis.filter(e => e.id !== id) };
        saveData(newData);
    };

    const updateInvestments = (type, amount) => {
        const investments = data.investments || {};
        const currentVal = investments[type] || 0;
        logTransaction('Investment', `Adjusted ${type}`, amount, 'Portfolio', { action: 'rebase', previous: currentVal });
        const newData = {
            ...data,
            investments: { ...investments, [type]: amount },
        };
        saveData(newData);
    };

    const topUpInvestment = (type, amount) => {
        const investments = data.investments || {};
        logTransaction('Investment', `Topped up ${type}`, amount, 'Portfolio', { action: 'topup' });
        const newData = {
            ...data,
            investments: { ...investments, [type]: (investments[type] || 0) + amount },
        };
        saveData(newData);
    };

    const setInitialAmount = (amount) => {
        const newData = { ...data, initialAmount: amount };
        saveData(newData);
    };

    const addBank = (name, initialBalance) => {
        const newData = { ...data, banks: [...(data.banks || []), { id: Date.now().toString(), name, balance: parseFloat(initialBalance) }] };
        saveData(newData);
    };

    const editBank = (id, updatedBank) => {
        const newData = { ...data, banks: data.banks.map(b => b.id === id ? { ...updatedBank, id } : b) };
        saveData(newData);
    };

    const deleteBank = (id) => {
        const newData = { ...data, banks: data.banks.filter(b => b.id !== id) };
        saveData(newData);
    };

    const updateBankBalance = (id, newBalance) => {
        const newData = {
            ...data,
            banks: data.banks.map(b => b.id === id ? { ...b, balance: parseFloat(newBalance) } : b)
        };
        saveData(newData);
    };

    const confirmEMIPayment = (id, bankId) => {
        const emi = data.emis.find(e => e.id === id);
        if (!emi) return;

        const nextTenure = (emi.remainingTenure || emi.tenure) - 1;
        const currentMonthYear = new Date().toLocaleString('default', { month: 'short', year: 'numeric' });

        let updatedBanks = data.banks || [];
        if (bankId) {
            updatedBanks = updatedBanks.map(b =>
                b.id === bankId ? { ...b, balance: b.balance - parseFloat(emi.amount) } : b
            );
        }

        const historyEntry = logTransaction('emi_payment', emi.name, emi.amount, emi.type, { emiId: id, bankId });
        const newData = {
            ...data,
            banks: updatedBanks,
            emis: data.emis.map(e => {
                if (e.id === id) {
                    return {
                        ...e,
                        remainingTenure: (e.type === 'family' || e.type === 'saving') ? 1 : nextTenure,
                        status: (e.type !== 'family' && e.type !== 'saving' && nextTenure <= 0) ? 'closed' : 'active',
                        lastPaidMonth: currentMonthYear
                    };
                }
                return e;
            }),
            history: [historyEntry, ...(data.history || [])]
        };
        saveData(newData);
    };

    const forceCloseEMI = (id, closureAmount, bankId) => {
        const emi = data.emis.find(e => e.id === id);
        if (!emi) return;

        let updatedBanks = data.banks || [];
        if (closureAmount > 0) {
            updatedBanks = updatedBanks.map(b =>
                b.id === bankId ? { ...b, balance: b.balance - closureAmount } : b
            );
        }

        const historyEntry = logTransaction('emi_force_close', emi.name, closureAmount, 'debt', { emiId: id });
        const newData = {
            ...data,
            banks: updatedBanks,
            emis: data.emis.map(e => e.id === id ? { ...e, status: 'closed', remainingTenure: 0 } : e),
            history: [historyEntry, ...(data.history || [])]
        };
        saveData(newData);
    };

    const importData = async (jsonString) => {
        try {
            const parsed = JSON.parse(jsonString);

            // Basic validation to ensure it's our data
            const requiredKeys = ['income', 'expenses', 'emis', 'banks'];
            const hasAllKeys = requiredKeys.every(key => Object.prototype.hasOwnProperty.call(parsed, key));

            if (!hasAllKeys) {
                console.error('Import failed: Missing required keys in backup file');
                return false;
            }

            // Ensure arrays are arrays
            if (!Array.isArray(parsed.income) || !Array.isArray(parsed.expenses) || !Array.isArray(parsed.emis) || !Array.isArray(parsed.banks)) {
                console.error('Import failed: Data structure is not valid (arrays expected)');
                return false;
            }

            await saveData(parsed);
            return true;
        } catch (e) {
            console.error('Import failed: Invalid JSON string', e);
            return false;
        }
    };

    const replaceData = async (newData) => {
        await saveData(newData);
    };

    const takeMonthlySnapshot = () => {
        const totals = calculateTotals();
        const snapshot = {
            month: new Date().toLocaleString('default', { month: 'short', year: '2-digit' }),
            income: totals.totalIncome,
            expenses: totals.totalExpenses,
            investments: totals.totalInvestments,
        };
        const newData = { ...data, historicalStats: [...(data.historicalStats || []), snapshot].slice(-12) };
        saveData(newData);
    };

    const calculateTotals = () => {
        const totalIncome = data.income.reduce((sum, item) => sum + Number(item.amount), 0);
        const totalExpenses = data.expenses.reduce((sum, item) => sum + Number(item.amount), 0);

        const activeEMIs = (data?.emis || []).filter(e => e.status !== 'closed');
        const totalEMIs = activeEMIs.reduce((sum, item) => sum + Number(item.amount), 0);

        // Total Loan Debt = Amount * Remaining Tenure (Outstanding)
        const totalEMIOutstanding = activeEMIs
            .filter(e => e.type === 'debt')
            .reduce((sum, item) => sum + (Number(item.amount) * (Number(item.remainingTenure) ?? Number(item.tenure))), 0);

        // Amount needed for next month (all active recurring payments)
        const nextMonthNeeded = activeEMIs.reduce((sum, item) => sum + Number(item.amount), 0);

        const totalInvestments = Object.values(data.investments).reduce((sum, val) => sum + Number(val), 0);
        const totalBankBalance = (data.banks || []).reduce((sum, b) => sum + Number(b.balance), 0);

        return {
            totalIncome,
            totalExpenses,
            totalEMIs,
            totalEMIOutstanding,
            nextMonthNeeded,
            totalInvestments,
            totalBankBalance,
            // Net Balance = (Sum of Income) - (Sum of Expenses + EMIs Paid + Investments)
            // But usually bank balance is the source of truth for "Total Money"
        };
    };

    return (
        <TransactionContext.Provider value={{
            data,
            loading,
            addIncome,
            editIncome,
            deleteIncome,
            addExpense,
            editExpense,
            deleteExpense,
            addEMI,
            editEMI,
            deleteEMI,
            updateInvestments,
            setInitialAmount,
            importData,
            takeMonthlySnapshot,
            addBank,
            editBank,
            deleteBank,
            updateBankBalance,
            confirmEMIPayment,
            forceCloseEMI,
            replaceData,
            ...calculateTotals(),
        }}>
            {children}
        </TransactionContext.Provider>
    );
}

export const useTransactions = () => useContext(TransactionContext);
