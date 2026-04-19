import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DashboardHeader from '../../components/dashboard-header';
import api from '../../utils/api';
import * as Storage from '../../utils/storage';

type ParentChildSummary = {
  name?: string;
  className?: string;
  attendanceRate?: string;
  averageScore?: string;
  feePending?: number;
  feeOverdue?: number;
};

type ParentDashboardResponse = {
  parentName?: string;
  childrenCount?: number;
  children?: ParentChildSummary[];
  message?: string;
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
  route: '/fees' | '/notifications' | '/results' | '/attendance' | '/(tabs)/profile';
  accent: string;
};

type Fee = {
  _id: string;
  status?: 'PAID' | 'PENDING' | 'OVERDUE' | 'PAID_PENDING';
};

type NotificationItem = {
  _id: string;
  read?: boolean;
};

const ACTION_CARDS: ActionCard[] = [
  {
    title: 'View Fees',
    description: 'Track pending payments and upload payment slips.',
    icon: 'cash-outline',
    buttonLabel: 'Open Fees',
    route: '/fees',
    accent: '#0f766e',
  },
  {
    title: 'View Notifications',
    description: 'Read announcements relevant to your child and class.',
    icon: 'notifications-outline',
    buttonLabel: 'Open Notifications',
    route: '/notifications',
    accent: '#b45309',
  },
  {
    title: 'View Child Results',
    description: 'Check published marks and recent academic updates.',
    icon: 'bar-chart-outline',
    buttonLabel: 'Open Results',
    route: '/results',
    accent: '#7c3aed',
  },
  {
    title: 'View Child Attendance',
    description: 'Review attendance records from available attendance logs.',
    icon: 'checkmark-done-outline',
    buttonLabel: 'Open Attendance',
    route: '/attendance',
    accent: '#16a34a',
  },
  {
    title: 'Child Profile',
    description: 'Open profile and linked account information quickly.',
    icon: 'person-outline',
    buttonLabel: 'Open Profile',
    route: '/(tabs)/profile',
    accent: '#2563eb',
  },
];

export default function ParentDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [parentName, setParentName] = useState('Parent');
  const [firstChild, setFirstChild] = useState<ParentChildSummary | null>(null);
  const [noChildMessage, setNoChildMessage] = useState('');
  const [stats, setStats] = useState<SummaryStat[]>([
    { label: 'Linked Children', value: '--', icon: 'people-outline', tint: '#2563eb' },
    { label: 'Pending Fees', value: '--', icon: 'cash-outline', tint: '#b45309' },
    { label: 'Recent Results', value: '--', icon: 'bar-chart-outline', tint: '#7c3aed' },
    { label: 'Unread Notifications', value: '--', icon: 'notifications-outline', tint: '#16a34a' },
  ]);

  const isTablet = width >= 768 && width < 1200;
  const isDesktop = width >= 1200;
  const statWidth = useMemo(() => {
    if (width < 520) return '100%';
    if (isDesktop) return '24%';
    return '48.5%';
  }, [isDesktop, width]);
  const cardWidth = useMemo(() => {
    if (width < 520) return '100%';
    if (isDesktop) return '32.2%';
    if (isTablet) return '48.8%';
    return '100%';
  }, [isDesktop, isTablet, width]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const savedRole = await Storage.getItemAsync('userRole');
        setRole(savedRole);

        if (savedRole !== 'PARENT') {
          return;
        }

        const requests = await Promise.allSettled([
          api.get<ParentDashboardResponse>('/dashboard/parent'),
          api.get('/fees/list'),
          api.get('/marks'),
          api.get('/notifications/visible'),
        ]);

        const dashboard = requests[0].status === 'fulfilled' ? requests[0].value.data : {};
        const fees: Fee[] = requests[1].status === 'fulfilled' ? requests[1].value.data?.fees ?? [] : [];
        const marks = requests[2].status === 'fulfilled' ? requests[2].value.data?.marks ?? [] : [];
        const notifications: NotificationItem[] = requests[3].status === 'fulfilled' ? requests[3].value.data?.notifications ?? [] : [];

        const children = dashboard?.children ?? [];
        const pendingFees = fees.filter((fee) => fee.status === 'PENDING' || fee.status === 'OVERDUE' || fee.status === 'PAID_PENDING').length;
        const unreadNotifications = notifications.filter((item) => !item.read).length;

        setParentName(dashboard?.parentName || 'Parent');
        setFirstChild(children.length > 0 ? children[0] : null);
        setNoChildMessage(children.length === 0 ? (dashboard?.message || 'No child is linked to this account yet.') : '');

        setStats([
          {
            label: 'Linked Children',
            value: String(dashboard?.childrenCount ?? children.length ?? 0),
            icon: 'people-outline',
            tint: '#2563eb',
          },
          {
            label: 'Pending Fees',
            value: String(pendingFees),
            icon: 'cash-outline',
            tint: '#b45309',
          },
          {
            label: 'Recent Results',
            value: String(marks.length ?? 0),
            icon: 'bar-chart-outline',
            tint: '#7c3aed',
          },
          {
            label: 'Unread Notifications',
            value: String(unreadNotifications),
            icon: 'notifications-outline',
            tint: '#16a34a',
          },
        ]);

        if (requests.every((result) => result.status === 'rejected')) {
          setError('Dashboard summary is temporarily unavailable. Quick actions are still ready.');
        }
      } catch {
        setError('Unable to load parent dashboard summary. Quick actions are still available.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (role === null || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.helperText}>Loading parent dashboard...</Text>
      </View>
    );
  }

  if (role !== 'PARENT') {
    return (
      <View style={styles.center}>
        <Text style={styles.deniedTitle}>Access Restricted</Text>
        <Text style={styles.helperText}>This dashboard is available only for parent accounts.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <DashboardHeader
        title="Parent Dashboard"
        subtitle={`Welcome, ${parentName}. Monitor child progress, fees, and announcements.`}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.statsGrid}>
        {stats.map((item) => (
          <View key={item.label} style={[styles.statCard, { width: statWidth }]}>
            <View style={[styles.statIconWrap, { backgroundColor: `${item.tint}1F` }]}>
              <Ionicons name={item.icon} size={18} color={item.tint} />
            </View>
            <Text style={styles.statLabel}>{item.label}</Text>
            <Text style={styles.statValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.childCard}>
        <Text style={styles.childCardTitle}>Child Summary</Text>
        {firstChild ? (
          <>
            <View style={styles.childRow}>
              <Text style={styles.childLabel}>Name</Text>
              <Text style={styles.childValue}>{firstChild.name || '-'}</Text>
            </View>
            <View style={styles.childRow}>
              <Text style={styles.childLabel}>Class</Text>
              <Text style={styles.childValue}>{firstChild.className || '-'}</Text>
            </View>
            <View style={styles.childRow}>
              <Text style={styles.childLabel}>Attendance</Text>
              <Text style={styles.childValue}>{firstChild.attendanceRate || 'N/A'}</Text>
            </View>
            <View style={styles.childRow}>
              <Text style={styles.childLabel}>Average Score</Text>
              <Text style={styles.childValue}>{firstChild.averageScore || 'N/A'}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.emptyChildText}>{noChildMessage || 'Child information will appear here when available.'}</Text>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Parent Modules</Text>
        <Text style={styles.sectionNote}>Use these modules to monitor child academics and school updates.</Text>
      </View>

      <View style={styles.modulesGrid}>
        {ACTION_CARDS.map((card) => (
          <Pressable
            key={card.title}
            onPress={() => router.push(card.route as any)}
            style={({ hovered }) => [
              styles.moduleCard,
              { width: cardWidth, borderColor: `${card.accent}33` },
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
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 14,
  },
  errorText: {
    color: '#b91c1c',
    marginBottom: 10,
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    columnGap: 10,
    rowGap: 10,
    marginBottom: 14,
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
  childCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 14,
  },
  childCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  childRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  childLabel: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  childValue: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyChildText: {
    color: '#64748b',
    fontSize: 13,
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
