import { Tabs } from 'expo-router';
import { LayoutDashboard, PieChart, Briefcase, Settings, Plus } from 'lucide-react-native';
import { Colors } from '../../constants/Theme';
import FloatingAddButton from '../../components/FloatingAddButton';
import { View } from 'react-native';

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
                    height: 75,
                    paddingBottom: 20,
                    paddingTop: 5,
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
                name="investments"
                options={{
                    title: 'Invest',
                    tabBarIcon: ({ color, size }) => <PieChart color={color} size={size} />,
                }}
            />
            {/* Custom Add Button in the middle */}
            <Tabs.Screen
                name="plus"
                options={{
                    title: '',
                    tabBarButton: () => (
                        <View style={{ width: 80, height: 80, alignItems: 'center', justifyContent: 'center' }}>
                            <FloatingAddButton />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="business"
                options={{
                    title: 'Business',
                    tabBarIcon: ({ color, size }) => <Briefcase color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
                }}
            />
            {/* Hide the old tabs if they still exist in the directory but aren't in the layout */}
            <Tabs.Screen name="income" options={{ href: null }} />
            <Tabs.Screen name="expenses" options={{ href: null }} />
        </Tabs>
    );
}
