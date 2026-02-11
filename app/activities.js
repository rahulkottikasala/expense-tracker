import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Colors, Spacing } from '../constants/Theme';
import { useTransactions } from '../hooks/useTransactions';
import { ArrowUpCircle, ArrowDownCircle, Search, ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function ActivitiesScreen() {
    const { data } = useTransactions();
    const router = useRouter();
    const [search, setSearch] = useState('');

    const allTransactions = [...data.income, ...data.expenses]
        .sort((a, b) => b.id - a.id);

    const filtered = allTransactions.filter(t =>
        (t.name || t.category || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft color="#000" size={24} />
                    <Text style={styles.title}>All Activities</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
                <Search color="#999" size={20} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name..."
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            <FlatList
                data={filtered}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <View style={styles.item}>
                        <View style={styles.iconBox}>
                            {data.income.find(i => i.id === item.id) ?
                                <ArrowUpCircle color={Colors.light.success} size={24} /> :
                                <ArrowDownCircle color={Colors.light.danger} size={24} />}
                        </View>
                        <View style={styles.info}>
                            <Text style={styles.name}>{item.name || item.category}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={styles.date}>{new Date(Number(item.id)).toLocaleDateString()} • </Text>
                                <Text style={styles.bankTag}>
                                    {data.banks.find(b => b.id === item.bankId)?.name || 'Cash/Other'}
                                </Text>
                            </View>
                        </View>
                        <Text style={[styles.amount, { color: data.income.find(i => i.id === item.id) ? Colors.light.success : Colors.light.danger }]}>
                            {data.income.find(i => i.id === item.id) ? '+' : '-'} ₹{Number(item.amount).toLocaleString()}
                        </Text>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.light.background },
    header: { padding: 16, paddingTop: 60, backgroundColor: '#fff' },
    backBtn: { flexDirection: 'row', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: '800', marginLeft: 8 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', margin: 16, padding: 12, borderRadius: 12 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
    list: { padding: 16 },
    item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f0f0f0' },
    iconBox: { marginRight: 16 },
    info: { flex: 1 },
    name: { fontWeight: '700', fontSize: 16 },
    date: { fontSize: 12, color: '#999', marginTop: 2 },
    bankTag: { fontSize: 11, color: Colors.light.primary, fontWeight: '700', marginTop: 2 },
    amount: { fontWeight: '800', fontSize: 16 }
});
