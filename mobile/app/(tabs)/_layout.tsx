import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [role, setRole] = useState('');

  useEffect(() => {
    const loadRole = async () => {
      const savedRole = await SecureStore.getItemAsync('userRole');
      setRole(savedRole || '');
    };
    loadRole();
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: '#8a94a6',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="student-dashboard"
        options={{
          title: 'Student',
          href: role === 'STUDENT' ? '/(tabs)/student-dashboard' : null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="books.vertical.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="teacher-dashboard"
        options={{
          title: 'Teacher',
          href: role === 'TEACHER' ? '/(tabs)/teacher-dashboard' : null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="briefcase.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin-dashboard"
        options={{
          title: 'Admin',
          href: role === 'ADMIN' ? '/(tabs)/admin-dashboard' : null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="building.columns.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
