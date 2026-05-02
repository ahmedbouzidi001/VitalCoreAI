import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider } from '@/template';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { HealthProvider } from '@/contexts/HealthContext';

export default function RootLayout() {
  return (
    <AlertProvider>
      <SafeAreaProvider>
        <LanguageProvider>
          <AuthProvider>
            <HealthProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="login" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="recipe" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="recipes" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="food-logger" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="premium" options={{ headerShown: false }} />
        <Stack.Screen name="achievements" options={{ presentation: 'card', headerShown: false }} />
                <Stack.Screen name="chat" options={{ headerShown: false }} />
                <Stack.Screen name="weight-tracker" options={{ headerShown: false }} />
              </Stack>
            </HealthProvider>
          </AuthProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}
