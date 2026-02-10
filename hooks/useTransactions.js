import { useTransactions as useGlobalTransactions } from '../context/TransactionContext';

export function useTransactions() {
    return useGlobalTransactions();
}
