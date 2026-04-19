import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import * as Storage from '../../utils/storage';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [role, setRole] = useState('');

  useEffect(() => {
    const loadRole = async () => {
      const savedRole = await Storage.getItemAsync('userRole');
      setRole(savedRole || '');
    };
    loadRole();
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="student-dashboard"
        options={{
          title: 'Student',
          href: role === 'STUDENT' ? '/(tabs)/student-dashboard' : null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="books.vertical.fill" color={color} />,
          tabBarLabelStyle: { fontSize: 12 },
        }}
      />
      <Tabs.Screen
        name="teacher-dashboard"
        options={{
          title: 'Teacher',
          href: role === 'TEACHER' ? '/(tabs)/teacher-dashboard' : null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="briefcase.fill" color={color} />,
          tabBarLabelStyle: { fontSize: 12 },
        }}
      />
      <Tabs.Screen
        name="parent-dashboard"
        options={{
          title: 'Parent',
          href: role === 'PARENT' ? '/(tabs)/parent-dashboard' : null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.2.fill" color={color} />,
          tabBarLabelStyle: { fontSize: 12 },
        }}
      />
      <Tabs.Screen
        name="admin-dashboard"
        options={{
          title: 'Admin',
          href: role === 'ADMIN' ? '/(tabs)/admin-dashboard' : null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="building.columns.fill" color={color} />,
          tabBarLabelStyle: { fontSize: 12 },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
          tabBarLabelStyle: { fontSize: 12 },
        }}
      />
    </Tabs>
  );
}
