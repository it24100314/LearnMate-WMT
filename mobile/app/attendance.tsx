import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import * as Storage from '../utils/storage';
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
      const userId = await Storage.getItemAsync('userId');
      if (!userId) throw new Error('User not found.');

      const role = await Storage.getItemAsync('userRole');
      
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
        <ActivityIndicator size="large" color="#007AFF" />
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
    <View style={styles.container}>
      <Text style={styles.header}>Your Attendance Summary</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#007AFF' }]}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Days</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#16a34a' }]}>{stats.present}</Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#dc2626' }]}>{stats.absent}</Text>
          <Text style={styles.statLabel}>Absent</Text>
        </View>
      </View>

      <Text style={styles.subHeader}>Recent Records</Text>

      <FlatList
        data={records}
        keyExtractor={(item) => item._id}
        contentContainerStyle={records.length === 0 ? styles.center : styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No attendance records found.</Text>}
        renderItem={({ item }) => {
          const dateStr = item.date ? new Date(item.date).toLocaleDateString() : 'Unknown Date';
          return (
            <View style={styles.card}>
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
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginTop: 30,
    marginBottom: 15,
    color: '#1f2937',
  },
  subHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 20,
    marginBottom: 10,
    color: '#374151',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
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
    color: '#6b7280',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  cardBody: {},
  detailText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 3,
  },
  notesText: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 5,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    fontSize: 15,
  },
});

