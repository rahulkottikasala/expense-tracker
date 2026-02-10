import { Stack } from 'expo-router';
import { TransactionProvider } from '../context/TransactionContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <TransactionProvider>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="activities" />
                </Stack>
            </TransactionProvider>
        </SafeAreaProvider>
    );
}
