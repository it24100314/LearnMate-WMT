import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter, useSegments } from 'expo-router';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import api from '@/utils/api';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        
        if (token) {
          // Token exists, verify it's still valid
          try {
            const response = await api.get('/users/me');
            
            if (response.status === 200) {
              // Token is valid
              setIsTokenValid(true);
              setIsLoading(false);
              return;
            }
          } catch (error: any) {
            // Token is invalid (401, 404, 500, etc.)
            console.error('Token validation failed:', error.status);
          }
        }
        
        // No token or token is invalid - clear storage
        await SecureStore.deleteItemAsync('userToken');
        await SecureStore.deleteItemAsync('userRole');
        await SecureStore.deleteItemAsync('userId');
        
        setIsTokenValid(false);
        setIsLoading(false);
        
        // Ensure user is on login screen
        if (segments[0] !== undefined && segments[0] !== 'index') {
          router.replace('/');
        }
      } catch (err) {
        console.error('Error verifying token:', err);
        // Clear storage on any error
        await SecureStore.deleteItemAsync('userToken');
        await SecureStore.deleteItemAsync('userRole');
        await SecureStore.deleteItemAsync('userId');
        
        setIsTokenValid(false);
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
