import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider } from '@/template';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { HealthProvider } from '@/contexts/HealthContext';

export default function RootLayout() {
  return (
    <AlertProvider>
      <SafeAreaProvider>
        <LanguageProvider>
          <HealthProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="recipe" options={{ presentation: 'modal', headerShown: false }} />
              <Stack.Screen name="add-analysis" options={{ presentation: 'modal', headerShown: false }} />
              <Stack.Screen name="workout-detail" options={{ presentation: 'modal', headerShown: false }} />
            </Stack>
          </HealthProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}
