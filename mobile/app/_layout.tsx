import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import api from '@/utils/api';
import { storage } from '@/utils/storage';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const verifyToken = async () => {
      // On web, skip the SSR context (useEffect only runs in browser, so this is browser-safe)
      // We still check: if Platform.OS === 'web', use localStorage via storage utility
      try {
        const token = await storage.getItem('userToken');

        if (token) {
          // Token exists, verify it's still valid
          try {
            const response = await api.get('/users/me');
            if (response.status === 200) {
              setIsLoading(false);
              return;
            }
          } catch (error: any) {
            const status = error?.response?.status;
            if (status !== 401 && status !== 403) {
              console.warn('Token validation failed:', status ?? error?.message ?? 'Network error');
            }
          }
        }

        // No token or invalid — clear storage
        await storage.deleteItem('userToken');
        await storage.deleteItem('userRole');
        await storage.deleteItem('userId');

        setIsLoading(false);

        if (segments.length > 0 && segments[0] !== '(tabs)') {
          router.replace('/');
        }
      } catch (err) {
        console.warn('Error verifying token:', err);
        await storage.deleteItem('userToken');
        await storage.deleteItem('userRole');
        await storage.deleteItem('userId');
        setIsLoading(false);
        router.replace('/');
      }
    };

    verifyToken();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
        <ActivityIndicator size="large" color="#3f51b5" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: '#ffffff' },
          headerTintColor: '#1f2937',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#f8f9fa' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="attendance" options={{ headerShown: true, title: 'Attendance' }} />
        <Stack.Screen name="materials" options={{ headerShown: true, title: 'Materials' }} />
        <Stack.Screen name="exams" options={{ headerShown: true, title: 'Exams' }} />
        <Stack.Screen name="results" options={{ headerShown: true, title: 'Results' }} />
        <Stack.Screen name="fees" options={{ headerShown: true, title: 'Fees' }} />
        <Stack.Screen name="notifications" options={{ headerShown: true, title: 'Notifications' }} />
        <Stack.Screen name="manage-notifications" options={{ headerShown: true, title: 'Manage Notifications' }} />
        <Stack.Screen name="create-exam" options={{ headerShown: true, title: 'Create Exam' }} />
        <Stack.Screen name="grade-submissions" options={{ headerShown: true, title: 'Grade Submissions' }} />
        <Stack.Screen name="enter-marks" options={{ headerShown: true, title: 'Enter Marks' }} />
        <Stack.Screen name="mark-attendance" options={{ headerShown: true, title: 'Mark Attendance' }} />
        <Stack.Screen name="upload-materials" options={{ headerShown: true, title: 'Upload Materials' }} />
        <Stack.Screen name="manage-timetable" options={{ headerShown: true, title: 'Manage Timetable' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
