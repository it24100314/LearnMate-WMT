import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import api from '../utils/api';

interface AttendanceRecord {
  _id: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  student: { name: string };
  subject?: { name: string };
  schoolClass?: { name: string };
  notes?: string;
}

export default function StudentAttendanceScreen() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [error, setError] = useState('');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
  });

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const userId = await SecureStore.getItemAsync('userId');
      if (!userId) throw new Error('User not found.');

      const role = await SecureStore.getItemAsync('userRole');
      
      let response;
      if (role === 'STUDENT') {
        response = await api.get(`/attendance/student/${userId}`);
      } else {
        response = await api.get(`/attendance`);
      }

      const attendances: AttendanceRecord[] = response.data?.attendances || [];
      setRecords(attendances);

      // Compute stats
      const total = attendances.length;
      const present = attendances.filter(a => a.status === 'PRESENT').length;
      const absent = attendances.filter(a => a.status === 'ABSENT').length;

      setStats({ total, present, absent });
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Failed to load attendance.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT': return '#16a34a';
      case 'ABSENT': return '#dc2626';
      case 'LATE': return '#ca8a04';
      default: return '#4b5563';
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
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.header}>Your Attendance Summary</Text>
        <Text style={styles.heroText}>Track your consistency, presence, and classroom participation.</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#3f51b5' }]}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Days</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#16a34a' }]}>{stats.present}</Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#ff5252' }]}>{stats.absent}</Text>
          <Text style={styles.statLabel}>Absent</Text>
        </View>
      </View>

      <Text style={styles.subHeader}>Recent Records</Text>

      {records.length === 0 ? (
        <Text style={styles.emptyText}>No attendance records found.</Text>
      ) : (
        <View style={styles.list}>
          {records.map((item) => {
            const dateStr = item.date ? new Date(item.date).toLocaleDateString() : 'Unknown Date';
            return (
              <View key={item._id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.dateText}>{dateStr}</Text>
                  <Text style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    {item.status}
                  </Text>
                </View>
                <View style={styles.cardBody}>
                  {item.subject && <Text style={styles.detailText}>Subject: {item.subject.name}</Text>}
                  {item.schoolClass && <Text style={styles.detailText}>Class: {item.schoolClass.name}</Text>}
                  {item.notes && <Text style={styles.notesText}>Notes: {item.notes}</Text>}
                </View>
              </View>
            );
          })}
        </View>
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
    fontSize: 22,
    fontWeight: '800',
    color: '#1f2937',
  },
  heroText: {
    marginTop: 6,
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
  },
  subHeader: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    color: '#334155',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 15,
    marginBottom: 16,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#edf0f5',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  list: {
    paddingBottom: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#edf0f5',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  cardBody: {},
  detailText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 3,
  },
  notesText: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 5,
  },
  errorText: {
    color: '#ff5252',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    fontSize: 15,
    marginTop: 4,
  },
});
