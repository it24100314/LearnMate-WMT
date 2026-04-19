import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import * as Storage from '../utils/storage';
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
      const userId = await Storage.getItemAsync('userId');
      if (!userId) throw new Error('User not found.');

      // Check current user role to hit correct endpoint
      const role = await Storage.getItemAsync('userRole');

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
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>Loading Schedule...</Text>
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
    <ScrollView style={styles.container}>
      <Text style={styles.header}>My Weekly Timetable</Text>
      
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
              <Text style={styles.timeText}>🕒 {session.startTime} - {session.endTime}</Text>
              <Text style={styles.metaText}>🧑‍🏫 {session.teacher?.name || 'TBA'} | Class: {session.schoolClass?.name || 'TBA'}</Text>
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
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 40,
    color: '#333',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 30,
    fontSize: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    padding: 15,
    elevation: 2,
  },
  dayBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    minWidth: 80,
  },
  dayText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  details: {
    flex: 1,
    justifyContent: 'center',
  },
  subjectText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  timeText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 3,
  },
  metaText: {
    fontSize: 13,
    color: '#888',
  },
});

