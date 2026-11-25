import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { isDemoMode } from './src/services/api/mode';
import { queryClient } from './src/services/queryClient';
import { sessionStorage } from './src/services/storage/session';
import { colors, fonts } from './src/design-system/theme';
import { useAppStore } from './src/store/appStore';

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.brand,
    background: colors.canvas,
    card: colors.nav,
    text: colors.text,
    border: colors.border,
  },
};

export default function App() {
  const hydrateSession = useAppStore((state) => state.hydrateSession);
  const hydrated = useAppStore((state) => state.hydrated);
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    sessionStorage.read().then(hydrateSession);
  }, [hydrateSession]);

  if (!fontsLoaded || !hydrated) {
    return (
      <View style={styles.loader}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  if (!isDemoMode() && !process.env.EXPO_PUBLIC_API_URL) {
    return (
      <View style={styles.loader}>
        <StatusBar style="light" />
        <Text style={styles.offline}>Aplikasi belum terhubung ke server.</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer theme={navigationTheme}>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
  offline: { color: colors.text, fontFamily: fonts.medium, fontSize: 16, textAlign: 'center', paddingHorizontal: 24 },
});
