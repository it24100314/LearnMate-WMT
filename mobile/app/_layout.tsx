import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="admin-dashboard" options={{ headerShown: true, title: 'Admin Dashboard' }} />
        <Stack.Screen name="parent-dashboard" options={{ headerShown: true, title: 'Parent Dashboard' }} />
        <Stack.Screen name="attendance" options={{ headerShown: true, title: 'Attendance' }} />
        <Stack.Screen name="materials" options={{ headerShown: true, title: 'Materials' }} />
        <Stack.Screen name="exams" options={{ headerShown: true, title: 'Exams' }} />
        <Stack.Screen name="marks" options={{ headerShown: true, title: 'Marks' }} />
        <Stack.Screen name="fees" options={{ headerShown: true, title: 'Fees' }} />
        <Stack.Screen name="notifications" options={{ headerShown: true, title: 'Notifications' }} />
        <Stack.Screen name="manage-notifications" options={{ headerShown: true, title: 'Manage Notifications' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
