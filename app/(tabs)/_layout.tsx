import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight } from '@/constants/theme';
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
          height: Platform.select({ ios: insets.bottom + 62, android: 64, default: 68 }),
          paddingBottom: Platform.select({ ios: insets.bottom + 6, android: 6, default: 10 }),
          paddingTop: 8,
          paddingHorizontal: 4,
        },
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: FontSize.micro + 1,
          fontWeight: FontWeight.semibold,
          marginTop: 2,
          letterSpacing: 0.2,
        },
        tabBarItemStyle: {
          borderRadius: 12,
          marginHorizontal: 2,
          marginBottom: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab_dashboard'),
          tabBarIcon: ({ color, focused }) => (
            <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
              <MaterialIcons name="dashboard" size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: t('tab_nutrition'),
          tabBarIcon: ({ color, focused }) => (
            <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
              <MaterialIcons name="restaurant-menu" size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="analysis"
        options={{
          title: t('tab_analysis'),
          tabBarIcon: ({ color, focused }) => (
            <View style={[tabStyles.iconWrap, focused && { ...tabStyles.iconWrapActive, backgroundColor: Colors.primary + '20' }]}>
              <MaterialIcons name="biotech" size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="training"
        options={{
          title: t('tab_training'),
          tabBarIcon: ({ color, focused }) => (
            <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
              <MaterialIcons name="fitness-center" size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tab_profile'),
          tabBarIcon: ({ color, focused }) => (
            <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
              <MaterialIcons name="person" size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  iconWrap: {
    width: 40,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: Colors.primaryMuted,
  },
});
