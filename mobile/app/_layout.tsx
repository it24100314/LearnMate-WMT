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
