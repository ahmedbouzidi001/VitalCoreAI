import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.tabBar,
          borderTopColor: Colors.tabBorder,
          borderTopWidth: 1,
          height: Platform.select({ ios: insets.bottom + 60, android: 60, default: 64 }),
          paddingBottom: Platform.select({ ios: insets.bottom + 4, android: 4, default: 8 }),
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab_dashboard'),
          tabBarIcon: ({ color, size }) => <MaterialIcons name="dashboard" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: t('tab_nutrition'),
          tabBarIcon: ({ color, size }) => <MaterialIcons name="restaurant-menu" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analysis"
        options={{
          title: t('tab_analysis'),
          tabBarIcon: ({ color, size }) => <MaterialIcons name="biotech" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="training"
        options={{
          title: t('tab_training'),
          tabBarIcon: ({ color, size }) => <MaterialIcons name="fitness-center" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tab_profile'),
          tabBarIcon: ({ color, size }) => <MaterialIcons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
