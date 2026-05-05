// VitalCore AI — Tab Layout v3 — Premium Navigation
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';

function TabIcon({ name, color, focused }: { name: any; color: string; focused: boolean }) {
  return (
    <MaterialIcons
      name={name}
      size={focused ? 26 : 23}
      color={color}
    />
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const tabBarHeight = Platform.select({ ios: insets.bottom + 64, android: insets.bottom + 64, default: 70 });
  const paddingBottom = Platform.select({ ios: insets.bottom + 8, android: insets.bottom + 8, default: 10 });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.tabBar,
          borderTopColor: Colors.tabBorder,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom,
          paddingHorizontal: 4,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
        },
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: FontSize.micro,
          fontWeight: FontWeight.semibold,
          marginTop: 2,
          letterSpacing: 0.2,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('dashboard'),
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'home' : 'home'} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: t('nutrition'),
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'restaurant-menu' : 'restaurant'} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="analysis"
        options={{
          title: t('analysis'),
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'biotech' : 'biotech'} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="training"
        options={{
          title: t('training'),
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'fitness-center' : 'fitness-center'} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile'),
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'person' : 'person-outline'} color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
