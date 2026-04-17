import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
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
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setError(null);
      const [examsRes, marksRes, notificationsRes] = await Promise.all([
        api.get('/exams/list'),
        api.get('/marks'),
        api.get('/notifications/list'),
      ]);

      setStats({
        examsCount: examsRes.data?.exams?.length ?? 0,
        marksCount: marksRes.data?.marks?.length ?? 0,
        notificationsCount: notificationsRes.data?.unreadNotificationCount ?? 0,
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
  };;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>⚠️</Text>
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
      <View style={styles.headerSection}>
        <Text style={styles.pageTitle}>Student Dashboard</Text>
        <Text style={styles.subText}>Access your exams, results, materials, and notifications.</Text>
      </View>

      <View style={styles.tileGrid}>
        <TouchableOpacity style={styles.tileCard} onPress={() => router.push('/exams' as any)}>
          <Text style={styles.tileIcon}>📝</Text>
          <Text style={styles.tileTitle}>Exams</Text>
          <Text style={styles.tileDesc}>View upcoming exams and upload answers.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tileCard} onPress={() => router.push('/timetable' as any)}>
          <Text style={styles.tileIcon}>📅</Text>
          <Text style={styles.tileTitle}>Timetable</Text>
          <Text style={styles.tileDesc}>View your weekly class schedule.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tileCard} onPress={() => router.push('/attendance' as any)}>
          <Text style={styles.tileIcon}>✅</Text>
          <Text style={styles.tileTitle}>Attendance</Text>
          <Text style={styles.tileDesc}>Check your daily attendance records.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tileCard} onPress={() => router.push('/materials' as any)}>
          <Text style={styles.tileIcon}>📚</Text>
          <Text style={styles.tileTitle}>Study Materials</Text>
          <Text style={styles.tileDesc}>Browse resources from teachers.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tileCard} onPress={() => router.push('/results' as any)}>
          <Text style={styles.tileIcon}>📊</Text>
          <Text style={styles.tileTitle}>My Results</Text>
          <Text style={styles.tileDesc}>Track your marks and comments.</Text>
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
      </View>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    padding: 15,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    marginTop: 35,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  subText: {
    color: '#6c757d',
    marginTop: 5,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tileCard: {
    backgroundColor: '#fff',
    width: '48%',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tileIcon: {
    fontSize: 28,
    marginBottom: 10,
  },
  tileTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  tileDesc: {
    fontSize: 12,
    color: '#666',
    minHeight: 40,
  },
  surfaceCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statLabel: {
    color: '#4b5563',
    fontWeight: '600',
  },
  statValue: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  errorText: {
    fontSize: 60,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#d32f2f',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
