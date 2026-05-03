import React, { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet, TouchableOpacity, ActivityIndicator, View } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../utils/api';
import { handleApiError } from '../../utils/auth';

export default function TeacherDashboard() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    import('../../utils/storage').then(({ storage }) => {
      storage.getItem('userRole').then(r => setRole(r || ''));
    });
  }, []);

  useEffect(() => {
    if (isFocused && role === 'TEACHER') {
      verifyAuth();
    }
  }, [isFocused, role]);

  if (role === 'ADMIN') return <Redirect href="/(tabs)/admin-dashboard" />;
  if (role === 'STUDENT') return <Redirect href="/(tabs)/student-dashboard" />;

  const verifyAuth = async () => {
    try {
      setError(null);
      // Quick auth verification
      await api.get('/users/me');
      setLoading(false);
    } catch (err: any) {
      console.error('Auth verification failed:', err);
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        await handleApiError(err, router, 'Your session has expired');
        return;
      }
      setError('Failed to verify session. Please try again.');
      setLoading(false);
    }
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
        <Text style={styles.errorTitle}>Session Error</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={verifyAuth}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.header}>Teacher Dashboard</Text>
        <Text style={styles.subtitle}>Manage classes, schedule, exams, attendance, marks, materials, and announcements.</Text>
      </View>

      <View style={styles.grid}>
        <TouchableOpacity style={styles.card} onPress={() => router.push('/classes')}>
          <View style={styles.iconWrap}>
            <Ionicons name="people-outline" size={30} color="#3f51b5" />
          </View>
          <Text style={styles.cardTitle}>My Classes</Text>
          <Text style={styles.cardDesc}>Manage assigned classrooms.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/manage-timetable')}>
          <View style={styles.iconWrap}>
            <Ionicons name="calendar-outline" size={30} color="#3f51b5" />
          </View>
          <Text style={styles.cardTitle}>Manage Timetable</Text>
          <Text style={styles.cardDesc}>Plan your class schedule.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/exams-hub')}>
          <View style={styles.iconWrap}>
            <Ionicons name="document-text-outline" size={30} color="#3f51b5" />
          </View>
          <Text style={styles.cardTitle}>Exams</Text>
          <Text style={styles.cardDesc}>Create and manage exams.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/mark-attendance')}>
          <View style={styles.iconWrap}>
            <Ionicons name="checkmark-done-outline" size={30} color="#3f51b5" />
          </View>
          <Text style={styles.cardTitle}>Mark Attendance</Text>
          <Text style={styles.cardDesc}>Record daily attendance.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/enter-marks')}>
          <View style={styles.iconWrap}>
            <Ionicons name="create-outline" size={30} color="#3f51b5" />
          </View>
          <Text style={styles.cardTitle}>Enter Marks</Text>
          <Text style={styles.cardDesc}>Submit exam scores quickly.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/upload-materials')}>
          <View style={styles.iconWrap}>
            <Ionicons name="cloud-upload-outline" size={30} color="#3f51b5" />
          </View>
          <Text style={styles.cardTitle}>Upload Materials</Text>
          <Text style={styles.cardDesc}>Share files with students.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/manage-notifications?mode=compose' as any)}>
          <View style={styles.iconWrap}>
            <Ionicons name="megaphone-outline" size={30} color="#3f51b5" />
          </View>
          <Text style={styles.cardTitle}>Create Announcement</Text>
          <Text style={styles.cardDesc}>Send announcements to selected classes and subjects.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/notifications' as any)}>
          <View style={styles.iconWrap}>
            <Ionicons name="mail-unread-outline" size={30} color="#3f51b5" />
          </View>
          <Text style={styles.cardTitle}>Inbox</Text>
          <Text style={styles.cardDesc}>Read incoming notifications and alerts.</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 26,
    backgroundColor: '#f8f9fa',
    minHeight: '100%',
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
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  subtitle: {
    marginTop: 6,
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  header: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
  },
  card: {
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
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#e8edff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    color: '#1f2937',
  },
  cardDesc: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 17,
    minHeight: 34,
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
