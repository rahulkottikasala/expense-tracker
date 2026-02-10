import { Tabs } from 'expo-router';
import { LayoutDashboard, Wallet, CreditCard, PieChart, Settings } from 'lucide-react-native';
import { Colors } from '../../constants/Theme';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors.light.primary,
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: Colors.light.card,
                    borderTopWidth: 1,
                    borderTopColor: Colors.light.border,
                    height: 70,
                    paddingBottom: 12,
                },
                headerStyle: {
                    backgroundColor: Colors.light.background,
                },
                headerTitleStyle: {
                    fontWeight: '700',
                    color: Colors.light.text,
                },
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="income"
                options={{
                    title: 'Income',
                    tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="expenses"
                options={{
                    title: 'Expenses',
                    tabBarIcon: ({ color, size }) => <CreditCard color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="investments"
                options={{
                    title: 'Invest',
                    tabBarIcon: ({ color, size }) => <PieChart color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
                }}
            />
        </Tabs>
    );
}
