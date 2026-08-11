import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { EventProvider, useEvent } from './src/contexts/EventContext';
import { colors, shared } from './src/lib/theme';

import LoginScreen from './src/screens/LoginScreen';
import JoinEventScreen from './src/screens/JoinEventScreen';
import ArrivalScreen from './src/screens/ArrivalScreen';
import HomeScreen from './src/screens/HomeScreen';
import ShoppingListScreen from './src/screens/ShoppingListScreen';
import ExpensesScreen from './src/screens/ExpensesScreen';
import ProgramScreen from './src/screens/ProgramScreen';
import RecommendationsScreen from './src/screens/RecommendationsScreen';
import EquipmentScreen from './src/screens/EquipmentScreen';

const Tab = createBottomTabNavigator();

const TABS = [
  { name: 'Home', title: 'בית', icon: '🏠', component: HomeScreen },
  { name: 'Shopping', title: 'קניות', icon: '🛒', component: ShoppingListScreen },
  { name: 'Expenses', title: 'הוצאות', icon: '💸', component: ExpensesScreen },
  { name: 'Program', title: 'תוכנית', icon: '🎭', component: ProgramScreen },
  { name: 'Equipment', title: 'ציוד', icon: '🎒', component: EquipmentScreen },
  { name: 'Recs', title: 'המלצות', icon: '⭐', component: RecommendationsScreen },
];

function Loading() {
  return (
    <View style={[shared.screen, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

function EventTabs() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerTitleAlign: 'center',
          headerTintColor: colors.text,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          tabBarLabelStyle: { fontSize: 12 },
        }}
      >
        {TABS.map((t) => (
          <Tab.Screen
            key={t.name}
            name={t.name}
            component={t.component}
            options={{
              title: t.title,
              tabBarIcon: ({ focused }) => (
                <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>{t.icon}</Text>
              ),
            }}
          />
        ))}
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// כל המשתמשים נכנסים ישירות לעמוד הבית; אין מסך התחברות/הרשמה בכניסה
function Root() {
  const { loading: authLoading } = useAuth();
  const { event, membership, loading: eventLoading } = useEvent();

  if (authLoading || eventLoading) return <Loading />;
  if (!event) return <JoinEventScreen />;
  if (!membership?.arrival_at) return <ArrivalScreen />;
  return <EventTabs />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <EventProvider>
          <StatusBar style="dark" />
          <Root />
        </EventProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
