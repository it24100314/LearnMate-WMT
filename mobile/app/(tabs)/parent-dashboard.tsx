import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../utils/api';
import { handleApiError } from '../../utils/auth';

export default function ParentDashboard() {
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
      <Text style={styles.title}>Parent Dashboard</Text>
      <Text style={styles.subtitle}>Track your children&apos;s progress, fees, and notifications.</Text>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/fees' as any)}>
        <Text style={styles.cardTitle}>Fees</Text>
        <Text style={styles.cardText}>Review pending fees and submit payment slips.</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/notifications' as any)}>
        <Text style={styles.cardTitle}>Notifications</Text>
        <Text style={styles.cardText}>View announcements sent to your family.</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/results' as any)}>
        <Text style={styles.cardTitle}>Results</Text>
        <Text style={styles.cardText}>Review published marks for linked children.</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    color: '#111827',
  },
  cardText: {
    color: '#4b5563',
    fontSize: 14,
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
