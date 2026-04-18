import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../utils/api';
import { handleApiError } from '../../utils/auth';

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [stats, setStats] = useState({
    examsCount: 0,
    marksCount: 0,
    notificationsCount: 0,
    totalOutstanding: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setError(null);
      const [examsRes, marksRes, notificationsRes, feesRes] = await Promise.all([
        api.get('/exams/list'),
        api.get('/marks'),
        api.get('/notifications/visible'),
        api.get('/fees/my-fees'),
      ]);

      setStats({
        examsCount: examsRes.data?.exams?.length ?? 0,
        marksCount: marksRes.data?.marks?.length ?? 0,
        notificationsCount: notificationsRes.data?.unreadCount ?? 0,
        totalOutstanding: Number(feesRes.data?.totalOutstanding ?? 0),
      });
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      
      // Check if it's an auth error
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        await handleApiError(error, router, 'Your session has expired');
        return;
      }
      
      // For other errors, show a message
      const errorMessage = error?.response?.data?.message || 'Failed to load dashboard. Please try again.';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }

  const onRetry = () => {
    setLoading(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3f51b5" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#ff5252" style={styles.errorIcon} />
        <Text style={styles.errorTitle}>Unable to Load Dashboard</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.pageTitle}>Student Dashboard</Text>
        <Text style={styles.subText}>Access your exams, timetable, attendance, and study resources.</Text>
      </View>

      <View style={styles.tileGrid}>
        <TouchableOpacity style={styles.tileCard} onPress={() => router.push('/exams' as any)}>
          <View style={styles.iconWrap}>
            <Ionicons name="document-text-outline" size={28} color="#3f51b5" />
          </View>
          <Text style={styles.tileTitle}>Exams</Text>
          <Text style={styles.tileDesc}>Upcoming exams and answer uploads.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tileCard} onPress={() => router.push('/timetable' as any)}>
          <View style={styles.iconWrap}>
            <Ionicons name="calendar-outline" size={28} color="#3f51b5" />
          </View>
          <Text style={styles.tileTitle}>Timetable</Text>
          <Text style={styles.tileDesc}>Your weekly class schedule.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tileCard} onPress={() => router.push('/attendance' as any)}>
          <View style={styles.iconWrap}>
            <Ionicons name="checkmark-done-outline" size={28} color="#3f51b5" />
          </View>
          <Text style={styles.tileTitle}>Attendance</Text>
          <Text style={styles.tileDesc}>Your daily attendance records.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tileCard} onPress={() => router.push('/materials' as any)}>
          <View style={styles.iconWrap}>
            <Ionicons name="library-outline" size={28} color="#3f51b5" />
          </View>
          <Text style={styles.tileTitle}>Study Materials</Text>
          <Text style={styles.tileDesc}>Resources shared by teachers.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tileCard} onPress={() => router.push('/results' as any)}>
          <View style={styles.iconWrap}>
            <Ionicons name="bar-chart-outline" size={28} color="#3f51b5" />
          </View>
          <Text style={styles.tileTitle}>My Results</Text>
          <Text style={styles.tileDesc}>Published marks and remarks.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tileCard} onPress={() => router.push('/fees' as any)}>
          <View style={styles.iconWrap}>
            <Ionicons name="wallet-outline" size={28} color="#3f51b5" />
          </View>
          <Text style={styles.tileTitle}>My Fees</Text>
          <Text style={styles.tileDesc}>Check outstanding balance and upload slips.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tileCard} onPress={() => router.push('/notifications' as any)}>
          <View style={styles.iconWrap}>
            <Ionicons name="notifications-outline" size={28} color="#3f51b5" />
          </View>
          <Text style={styles.tileTitle}>Notifications</Text>
          <Text style={styles.tileDesc}>Read announcements from teachers and admin.</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.surfaceCard}>
        <Text style={styles.sectionTitle}>Quick Overview</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Assigned Exams</Text>
          <Text style={styles.statValue}>{stats.examsCount}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Published Marks</Text>
          <Text style={styles.statValue}>{stats.marksCount}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Unread Notifications</Text>
          <Text style={styles.statValue}>{stats.notificationsCount}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Outstanding Fees</Text>
          <Text style={styles.statValue}>${stats.totalOutstanding.toFixed(2)}</Text>
        </View>
      </View>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 24,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    marginTop: 20,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
  },
  subText: {
    color: '#64748b',
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tileCard: {
    backgroundColor: '#ffffff',
    width: '48%',
    padding: 16,
    borderRadius: 18,
    marginBottom: 14,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#edf0f5',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8edff',
    marginBottom: 12,
  },
  tileTitle: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 6,
    color: '#1f2937',
  },
  tileDesc: {
    fontSize: 12,
    color: '#64748b',
    minHeight: 34,
    lineHeight: 17,
  },
  surfaceCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 20,
    marginBottom: 15,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#edf0f5',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 15,
    color: '#1f2937',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eef1f5',
  },
  statLabel: {
    color: '#475569',
    fontWeight: '600',
  },
  statValue: {
    color: '#3f51b5',
    fontWeight: '700',
  },
  errorIcon: {
    marginBottom: 14,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ff5252',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3f51b5',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 10,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
