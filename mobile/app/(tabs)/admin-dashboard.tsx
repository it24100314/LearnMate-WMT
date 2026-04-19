import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Storage from '../../utils/storage';
import api from '../../utils/api';
import DashboardHeader from '../../components/dashboard-header';

type AdminDashboardResponse = {
  totalUsers?: number;
  feeStats?: {
    totalRevenue?: number;
  };
  examStats?: {
    total?: number;
  };
  alerts?: {
    lowAttendanceCount?: number;
  };
};

type SummaryStat = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
};

type ActionCard = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  buttonLabel: string;
  route: '/exams' | '/fees' | '/notifications' | '/users' | '/manage-timetable' | '/attendance';
  accent: string;
};

const ACTION_CARDS: ActionCard[] = [
  {
    title: 'Exams',
    description: 'Review schedules, monitor exams, and manage files.',
    icon: 'document-text-outline',
    buttonLabel: 'Open Exams',
    route: '/exams',
    accent: '#2563eb',
  },
  {
    title: 'Fees',
    description: 'Track payments, verify slips, and manage pending records.',
    icon: 'cash-outline',
    buttonLabel: 'Manage Fees',
    route: '/fees',
    accent: '#0f766e',
  },
  {
    title: 'Notifications',
    description: 'Broadcast important updates to classes and user roles.',
    icon: 'notifications-outline',
    buttonLabel: 'Open Notifications',
    route: '/notifications',
    accent: '#b45309',
  },
  {
    title: 'User Management',
    description: 'View users, update roles, and control account access.',
    icon: 'people-outline',
    buttonLabel: 'Manage Users',
    route: '/users',
    accent: '#7c3aed',
  },
  {
    title: 'Time Table',
    description: 'Organize weekly schedules, subjects, and class timing slots.',
    icon: 'calendar-outline',
    buttonLabel: 'Manage Timetable',
    route: '/manage-timetable',
    accent: '#0ea5e9',
  },
  {
    title: 'Attendance',
    description: 'Review attendance records and monitor class-wise participation.',
    icon: 'checkmark-done-outline',
    buttonLabel: 'Open Attendance',
    route: '/attendance',
    accent: '#16a34a',
  },
];

export default function AdminDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState<SummaryStat[]>([
    { label: 'Total Users', value: '--', icon: 'people', tint: '#2563eb' },
    { label: 'Total Exams', value: '--', icon: 'document-text', tint: '#0f766e' },
    { label: 'Revenue', value: '--', icon: 'wallet', tint: '#7c3aed' },
    { label: 'Alerts', value: '--', icon: 'warning', tint: '#b45309' },
  ]);

  const isTablet = width >= 768 && width < 1200;
  const isDesktop = width >= 1200;

  const statWidth = useMemo(() => {
    if (width < 520) return '100%';
    if (isDesktop) return '24%';
    return '48.5%';
  }, [isDesktop, width]);

  const actionCardWidth = useMemo(() => {
    if (width < 520) return '100%';
    if (isDesktop) return '32.2%';
    if (isTablet) return '48.8%';
    return '100%';
  }, [isDesktop, isTablet, width]);

  useEffect(() => {
    const checkRole = async () => {
      const role = await Storage.getItemAsync('userRole');
      setIsAdmin(role === 'ADMIN');
    };
    checkRole();
  }, []);

  useEffect(() => {
    const loadDashboard = async () => {
      if (!isAdmin) return;
      setStatsLoading(true);
      try {
        const response = await api.get<AdminDashboardResponse>('/dashboard/admin');
        const data = response.data || {};
        const totalUsers = data.totalUsers ?? 0;
        const totalExams = data.examStats?.total ?? 0;
        const totalRevenue = data.feeStats?.totalRevenue ?? 0;
        const alerts = data.alerts?.lowAttendanceCount ?? 0;

        setStats([
          { label: 'Total Users', value: String(totalUsers), icon: 'people', tint: '#2563eb' },
          { label: 'Total Exams', value: String(totalExams), icon: 'document-text', tint: '#0f766e' },
          { label: 'Revenue', value: `$${Number(totalRevenue).toFixed(2)}`, icon: 'wallet', tint: '#7c3aed' },
          { label: 'Alerts', value: String(alerts), icon: 'warning', tint: '#b45309' },
        ]);
      } catch {
        // Keep fallback stats if dashboard request fails.
      } finally {
        setStatsLoading(false);
      }
    };
    loadDashboard();
  }, [isAdmin]);

  if (isAdmin === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1d4ed8" />
        <Text style={styles.helperText}>Checking access...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={styles.deniedTitle}>Access Denied</Text>
        <Text style={styles.helperText}>Only admins can access this dashboard.</Text>
        <Pressable style={styles.backBtn} onPress={() => router.replace('/')}>
          <Text style={styles.backBtnText}>Go to Login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <DashboardHeader
        title="Admin Dashboard"
        subtitle="Track key metrics and manage core academic modules."
      />

      <View style={styles.statsGrid}>
        {stats.map((item) => (
          <View key={item.label} style={[styles.statCard, { width: statWidth }]}>
            <View style={[styles.statIconWrap, { backgroundColor: `${item.tint}20` }]}>
              <Ionicons name={item.icon} size={18} color={item.tint} />
            </View>
            <Text style={styles.statLabel}>{item.label}</Text>
            <Text style={styles.statValue}>{statsLoading ? '...' : item.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Management Modules</Text>
        <Text style={styles.sectionNote}>Use these cards to access admin workflows quickly.</Text>
      </View>

      <View style={styles.modulesGrid}>
        {ACTION_CARDS.map((card) => (
          <Pressable
            key={card.title}
            onPress={() => router.push(card.route)}
            style={({ hovered }) => [
              styles.moduleCard,
              { width: actionCardWidth, borderColor: `${card.accent}30` },
              hovered && styles.moduleCardHover,
            ]}
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.cardIconWrap, { backgroundColor: `${card.accent}1A` }]}>
                <Ionicons name={card.icon} size={22} color={card.accent} />
              </View>
            </View>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardText}>{card.description}</Text>
            <View style={styles.cardFooter}>
              <View style={[styles.cardButton, { backgroundColor: card.accent }]}>
                <Text style={styles.cardButtonText}>{card.buttonLabel}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  container: {
    padding: 18,
    paddingBottom: 30,
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f1f5f9',
  },
  deniedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 8,
  },
  helperText: {
    color: '#475569',
    marginTop: 10,
    marginBottom: 14,
    textAlign: 'center',
    fontSize: 14,
  },
  backBtn: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    columnGap: 10,
    rowGap: 10,
    marginBottom: 18,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  sectionNote: {
    color: '#64748b',
    fontSize: 13,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    columnGap: 12,
    rowGap: 12,
  },
  moduleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    minHeight: 180,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
    minWidth: 0,
  },
  moduleCardHover: {
    transform: [{ translateY: -2 }],
    shadowOpacity: 0.12,
    borderColor: '#93c5fd',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  cardText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 16,
  },
  cardFooter: {
    marginTop: 'auto',
    alignItems: 'flex-start',
  },
  cardButton: {
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  cardButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
