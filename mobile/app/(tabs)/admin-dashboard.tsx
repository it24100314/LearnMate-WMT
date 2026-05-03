import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../utils/api';
import { handleApiError } from '../../utils/auth';

export default function AdminDashboard() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isFocused) {
      verifyAuth();
    }
  }, [isFocused]);

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
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>Control exams, fees, and institute-wide communications.</Text>
      </View>

      <View style={styles.grid}>
        <TouchableOpacity style={styles.card} onPress={() => router.push('/admin-exams' as any)}>
          <View style={styles.iconWrap}>
            <Ionicons name="document-text-outline" size={30} color="#3f51b5" />
          </View>
          <Text style={styles.cardTitle}>Exams</Text>
          <Text style={styles.cardText}>Review all exam schedules.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/fees')}>
          <View style={styles.iconWrap}>
            <Ionicons name="wallet-outline" size={30} color="#3f51b5" />
          </View>
          <Text style={styles.cardTitle}>Fees</Text>
          <Text style={styles.cardText}>Manage records and payment slips.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/manage-notifications?mode=compose' as any)}>
          <View style={styles.iconWrap}>
            <Ionicons name="megaphone-outline" size={30} color="#3f51b5" />
          </View>
          <Text style={styles.cardTitle}>Send Global Alert</Text>
          <Text style={styles.cardText}>Create and send new announcements quickly.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/manage-notifications?mode=manage' as any)}>
          <View style={styles.iconWrap}>
            <Ionicons name="list-outline" size={30} color="#3f51b5" />
          </View>
          <Text style={styles.cardTitle}>Manage Alerts</Text>
          <Text style={styles.cardText}>Edit or delete previously sent announcements.</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.card} onPress={() => router.push('/manage-users' as any)}>
          <View style={styles.iconWrap}>
            <Ionicons name="people-outline" size={30} color="#3f51b5" />
          </View>
          <Text style={styles.cardTitle}>Manage Users</Text>
          <Text style={styles.cardText}>Approve registrations, edit roles, or remove accounts.</Text>
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
    flexGrow: 1,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 6,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    width: '48%',
    borderRadius: 18,
    padding: 16,
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
  cardText: {
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
