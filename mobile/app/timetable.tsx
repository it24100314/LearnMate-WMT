import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';

interface TimetableEntry {
  _id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subject: { name: string };
  teacher: { name: string };
  schoolClass: { name: string };
}

export default function TimetableScreen() {
  const [loading, setLoading] = useState(true);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      const userId = await SecureStore.getItemAsync('userId');
      if (!userId) throw new Error('User not found.');

      // Check current user role to hit correct endpoint
      const role = await SecureStore.getItemAsync('userRole');

      let response;
      if (role === 'STUDENT') {
        response = await api.get(`/timetables/student/${userId}`);
      } else {
        // Fallback for admins or teachers viewing personal schedule
        response = await api.get(`/timetables/list`);
      }
      
      setTimetable(response.data?.timetables || response.data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Failed to load timetable.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3f51b5" />
        <Text style={styles.loadingText}>Loading Schedule...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.header}>My Weekly Timetable</Text>
        <Text style={styles.heroText}>Your complete class schedule for the week.</Text>
      </View>
      
      {timetable.length === 0 ? (
        <Text style={styles.emptyText}>No classes scheduled.</Text>
      ) : (
        timetable.map((session) => (
          <View key={session._id} style={styles.card}>
            <View style={styles.dayBadge}>
              <Text style={styles.dayText}>{session.dayOfWeek}</Text>
            </View>
            <View style={styles.details}>
              <Text style={styles.subjectText}>{session.subject?.name || 'Unknown Subject'}</Text>
              <View style={styles.inlineMeta}>
                <Ionicons name="time-outline" size={14} color="#64748b" />
                <Text style={styles.timeText}>{session.startTime} - {session.endTime}</Text>
              </View>
              <View style={styles.inlineMeta}>
                <Ionicons name="person-outline" size={14} color="#64748b" />
                <Text style={styles.metaText}>{session.teacher?.name || 'TBA'} | Class: {session.schoolClass?.name || 'TBA'}</Text>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 28,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    color: '#64748b',
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  header: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
  },
  heroText: {
    marginTop: 6,
    color: '#64748b',
    lineHeight: 20,
    fontSize: 14,
  },
  errorText: {
    color: '#ff5252',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 30,
    fontSize: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    marginBottom: 15,
    padding: 15,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#edf0f5',
  },
  dayBadge: {
    backgroundColor: '#3f51b5',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    minWidth: 80,
  },
  dayText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  details: {
    flex: 1,
    justifyContent: 'center',
  },
  subjectText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 5,
  },
  inlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timeText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 3,
  },
  metaText: {
    fontSize: 13,
    color: '#64748b',
  },
});
