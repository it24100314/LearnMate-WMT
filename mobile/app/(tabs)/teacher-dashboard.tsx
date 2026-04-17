import React, { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../utils/api';
import { handleApiError } from '../../utils/auth';

export default function TeacherDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    verifyAuth();
  }, []);

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
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>⚠️</Text>
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
      <Text style={styles.header}>Teacher Dashboard</Text>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/classes')}>
        <Text style={styles.cardTitle}>My Classes</Text>
        <Text style={styles.cardDesc}>Manage your assigned classes</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/manage-timetable')}>
        <Text style={styles.cardTitle}>Manage Timetable</Text>
        <Text style={styles.cardDesc}>View your schedule and add new sessions</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/create-exam')}>
        <Text style={styles.cardTitle}>Create Exam</Text>
        <Text style={styles.cardDesc}>Schedule and manage exams for your subjects</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/mark-attendance')}>
        <Text style={styles.cardTitle}>Mark Attendance</Text>
        <Text style={styles.cardDesc}>Take daily attendance for your classes</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.card} onPress={() => router.push('/enter-marks')}>
        <Text style={styles.cardTitle}>Enter Marks</Text>
        <Text style={styles.cardDesc}>Submit bulk exam scores</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/upload-materials')}>
        <Text style={styles.cardTitle}>Upload Materials</Text>
        <Text style={styles.cardDesc}>Share study materials and resources</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    marginTop: 20,
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 5,
    borderLeftColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardDesc: {
    color: '#666',
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
