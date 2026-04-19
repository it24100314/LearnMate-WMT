import 'react-native-reanimated';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, useRouter, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Storage from '../utils/storage';

const ROLE_ALLOWED_ROUTES: Record<string, string[]> = {
  ADMIN: [
    '/attendance',
    '/materials',
    '/exams',
    '/results',
    '/fees',
    '/notifications',
    '/manage-notifications',
    '/users',
    '/classes',
    '/manage-timetable',
    '/mark-attendance',
    '/enter-marks',
    '/create-exam',
    '/upload-materials',
    '/grade-submissions',
    '/timetable',
  ],
  TEACHER: [
    '/classes',
    '/manage-timetable',
    '/mark-attendance',
    '/enter-marks',
    '/create-exam',
    '/upload-materials',
    '/grade-submissions',
    '/exams',
    '/materials',
    '/attendance',
    '/notifications',
    '/manage-notifications',
    '/results',
    '/timetable',
  ],
  STUDENT: [
    '/timetable',
    '/attendance',
    '/exams',
    '/results',
    '/materials',
    '/notifications',
  ],
  PARENT: [
    '/fees',
    '/notifications',
    '/results',
    '/attendance',
  ],
};

const normalizePath = (path: string) => {
  const withoutGroup = path.replace('/(tabs)', '');
  if (withoutGroup.length > 1 && withoutGroup.endsWith('/')) {
    return withoutGroup.slice(0, -1);
  }
  return withoutGroup || '/';
};

const getRoleDashboardPath = (role: string | null) => {
  switch (role) {
    case 'STUDENT':
      return '/student-dashboard';
    case 'TEACHER':
      return '/teacher-dashboard';
    case 'PARENT':
      return '/parent-dashboard';
    case 'ADMIN':
      return '/admin-dashboard';
    default:
      return '/';
  }
};

const canAccessRoute = (role: string | null, path: string) => {
  if (!role) return false;
  if (path === '/profile') return true;
  const allowed = ROLE_ALLOWED_ROUTES[role] ?? [];
  return allowed.some((routePrefix) => path === routePrefix || path.startsWith(`${routePrefix}/`));
};

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#b91c1c', marginBottom: 8 }}>
        App Error
      </Text>
      <Text style={{ color: '#334155', textAlign: 'center', marginBottom: 12 }}>
        {error?.message || 'Unknown runtime error'}
      </Text>
      <Text onPress={retry} style={{ color: '#2563eb', fontWeight: '700' }}>
        Tap to retry
      </Text>
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const pathname = usePathname();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const syncSession = async () => {
      try {
        const token = await Storage.getItemAsync('userToken');
        const role = await Storage.getItemAsync('userRole');
        const currentPath = normalizePath(pathname);
        const expectedRoute = getRoleDashboardPath(role);
        const isRoleDashboardRoute =
          currentPath === '/student-dashboard' ||
          currentPath === '/teacher-dashboard' ||
          currentPath === '/parent-dashboard' ||
          currentPath === '/admin-dashboard';

        const isPublicRoute = currentPath === '/' || currentPath === '/register' || currentPath === '/forgot-password';
        const isProfileRoute = currentPath === '/profile';

        if (!token) {
          if (!isPublicRoute) {
            router.replace('/');
          }
          if (isMounted) setCheckingSession(false);
          return;
        }

        if (!role) {
          await Storage.clearSessionAsync();
          router.replace('/');
          if (isMounted) setCheckingSession(false);
          return;
        }

        if (isPublicRoute) {
          if (currentPath !== expectedRoute) {
            router.replace(expectedRoute);
          }
          if (isMounted) setCheckingSession(false);
          return;
        }

        if (isRoleDashboardRoute && !isProfileRoute) {
          const isCurrentRoleRoute = currentPath === expectedRoute;

          if (!isCurrentRoleRoute) {
            router.replace(expectedRoute);
          }
        }

        if (!isRoleDashboardRoute && !isPublicRoute) {
          const allowed = canAccessRoute(role, currentPath);
          if (!allowed) {
            if (currentPath !== expectedRoute) {
              router.replace(expectedRoute);
            }
            if (isMounted) setCheckingSession(false);
            return;
          }
        }
      } catch {
        await Storage.clearSessionAsync();
        router.replace('/');
      } finally {
        if (isMounted) setCheckingSession(false);
      }
    };

    syncSession();

    const fallbackTimer = setTimeout(() => {
      if (isMounted) setCheckingSession(false);
    }, 3000);

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
    };
  }, [pathname, router]);

  if (checkingSession) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 10, color: '#475569' }}>Loading app...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="attendance" options={{ headerShown: true, title: 'Attendance' }} />
        <Stack.Screen name="classes" options={{ headerShown: true, title: 'Classes' }} />
        <Stack.Screen name="create-exam" options={{ headerShown: true, title: 'Create Exam' }} />
        <Stack.Screen name="enter-marks" options={{ headerShown: true, title: 'Enter Marks' }} />
        <Stack.Screen name="materials" options={{ headerShown: true, title: 'Materials' }} />
        <Stack.Screen name="exams" options={{ headerShown: true, title: 'Exams' }} />
        <Stack.Screen name="results" options={{ headerShown: true, title: 'Results' }} />
        <Stack.Screen name="fees" options={{ headerShown: true, title: 'Fees' }} />
        <Stack.Screen name="notifications" options={{ headerShown: true, title: 'Notifications' }} />
        <Stack.Screen name="manage-timetable" options={{ headerShown: true, title: 'Manage Timetable' }} />
        <Stack.Screen name="mark-attendance" options={{ headerShown: true, title: 'Mark Attendance' }} />
        <Stack.Screen name="timetable" options={{ headerShown: true, title: 'Timetable' }} />
        <Stack.Screen name="upload-materials" options={{ headerShown: true, title: 'Upload Materials' }} />
        <Stack.Screen name="grade-submissions" options={{ headerShown: true, title: 'Grade Submissions' }} />
        <Stack.Screen name="manage-notifications" options={{ headerShown: true, title: 'Manage Notifications' }} />
        <Stack.Screen name="users" options={{ headerShown: true, title: 'User Management' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
