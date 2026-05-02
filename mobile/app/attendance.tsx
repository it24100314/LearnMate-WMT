import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
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
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0 });
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');

  const fetchAttendance = useCallback(async () => {
    try {
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
      const total = attendances.length;
      const present = attendances.filter(a => a.status === 'PRESENT').length;
      const absent = attendances.filter(a => a.status === 'ABSENT').length;
      const late = attendances.filter(a => a.status === 'LATE').length;
      setStats({ total, present, absent, late });
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load attendance.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchAttendance().finally(() => setLoading(false));
  }, [fetchAttendance]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAttendance();
    setRefreshing(false);
  }, [fetchAttendance]);

  const attendanceRate = stats.total > 0
    ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0;

  const getRateColor = (rate: number) => rate >= 80 ? '#16a34a' : rate >= 60 ? '#ca8a04' : '#dc2626';

  const getStatusColor = (status: string) => {
    if (status === 'PRESENT') return '#16a34a';
    if (status === 'ABSENT') return '#dc2626';
    if (status === 'LATE') return '#ca8a04';
    return '#4b5563';
  };

  // Unique subjects for filter chips
  const subjects = ['ALL', ...Array.from(new Set(
    records.filter(r => r.subject?.name).map(r => r.subject!.name)
  ))];

  const filtered = selectedSubject === 'ALL'
    ? records
    : records.filter(r => r.subject?.name === selectedSubject);

  // Per-subject breakdown
  const bySubject = records.reduce<Record<string, { present: number; late: number; total: number }>>((acc, r) => {
    const name = r.subject?.name || 'General';
    if (!acc[name]) acc[name] = { present: 0, late: 0, total: 0 };
    acc[name].total++;
    if (r.status === 'PRESENT') acc[name].present++;
    if (r.status === 'LATE') acc[name].late++;
    return acc;
  }, {});

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#3f51b5" /></View>;

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={52} color="#cbd5e1" />
        <Text style={styles.emptyTitle}>Could Not Load Attendance</Text>
        <Text style={styles.emptySubtitle}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3f51b5']} />}
    >
      <View style={styles.heroCard}>
        <Text style={styles.header}>Your Attendance Summary</Text>
        <Text style={styles.heroText}>Track your consistency, presence, and classroom participation.</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        {[
          { label: 'Total', value: stats.total, color: '#3f51b5' },
          { label: 'Present', value: stats.present, color: '#16a34a' },
          { label: 'Late', value: stats.late, color: '#ca8a04' },
          { label: 'Absent', value: stats.absent, color: '#ff5252' },
        ].map(s => (
          <View key={s.label} style={styles.statBox}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Rate bar */}
      <View style={styles.rateCard}>
        <View style={styles.rateHeader}>
          <Text style={styles.rateLabel}>Attendance Rate</Text>
          <Text style={[styles.rateValue, { color: getRateColor(attendanceRate) }]}>{attendanceRate}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${attendanceRate}%` as any, backgroundColor: getRateColor(attendanceRate) }]} />
        </View>
        <Text style={styles.rateHint}>
          {attendanceRate >= 80 ? '✅ Good standing' : attendanceRate >= 60 ? '⚠️ Needs improvement' : '🔴 Below minimum'}
        </Text>
      </View>

      {/* Per-subject breakdown */}
      {Object.keys(bySubject).length > 0 && (
        <View style={styles.subjectBreakdown}>
          <Text style={styles.sectionTitle}>By Subject</Text>
          {Object.entries(bySubject).map(([name, data]) => {
            const rate = data.total > 0 ? Math.round(((data.present + data.late) / data.total) * 100) : 0;
            return (
              <View key={name} style={styles.subjectRow}>
                <Text style={styles.subjectName} numberOfLines={1}>{name}</Text>
                <View style={styles.subjectBar}>
                  <View style={[styles.subjectFill, { width: `${rate}%` as any, backgroundColor: getRateColor(rate) }]} />
                </View>
                <Text style={[styles.subjectPct, { color: getRateColor(rate) }]}>{rate}%</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Subject filter chips */}
      {subjects.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {subjects.map(sub => (
            <TouchableOpacity
              key={sub}
              style={[styles.filterChip, selectedSubject === sub && styles.filterChipActive]}
              onPress={() => setSelectedSubject(sub)}
            >
              <Text style={selectedSubject === sub ? styles.filterChipTextActive : styles.filterChipText}>{sub}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Text style={styles.sectionTitle}>
        Records {selectedSubject !== 'ALL' ? `— ${selectedSubject}` : ''} ({filtered.length}/{records.length})
      </Text>

      {filtered.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="clipboard-outline" size={40} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No Records Found</Text>
          <Text style={styles.emptySubtitle}>
            {selectedSubject !== 'ALL' ? `No records for ${selectedSubject}.` : 'No attendance records yet.'}
          </Text>
        </View>
      ) : (
        filtered.map((item) => (
          <View key={item._id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.dateText}>{item.date ? new Date(item.date).toLocaleDateString() : 'Unknown'}</Text>
              <Text style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>{item.status}</Text>
            </View>
            {item.subject && <Text style={styles.detailText}>📚 {item.subject.name}</Text>}
            {item.schoolClass && <Text style={styles.detailText}>🏫 {item.schoolClass.name}</Text>}
            {item.notes && <Text style={styles.notesText}>📝 {item.notes}</Text>}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 28 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f8f9fa' },
  heroCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20, marginBottom: 14, shadowColor: '#1f2937', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  header: { fontSize: 22, fontWeight: '800', color: '#1f2937' },
  heroText: { marginTop: 6, color: '#64748b', fontSize: 14, lineHeight: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginBottom: 10, marginTop: 6 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#ffffff', borderRadius: 20, padding: 15, marginBottom: 12, shadowColor: '#1f2937', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4, borderWidth: 1, borderColor: '#edf0f5' },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#64748b' },
  rateCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, marginBottom: 14, shadowColor: '#1f2937', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4, borderWidth: 1, borderColor: '#edf0f5' },
  rateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  rateLabel: { fontSize: 15, fontWeight: '700', color: '#334155' },
  rateValue: { fontSize: 22, fontWeight: '800' },
  progressBar: { height: 10, backgroundColor: '#e2e8f0', borderRadius: 999, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 999 },
  rateHint: { fontSize: 13, color: '#64748b' },
  subjectBreakdown: { backgroundColor: '#ffffff', borderRadius: 18, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#edf0f5', shadowColor: '#1f2937', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  subjectRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  subjectName: { width: 90, fontSize: 12, color: '#475569', fontWeight: '600' },
  subjectBar: { flex: 1, height: 8, backgroundColor: '#e2e8f0', borderRadius: 999, overflow: 'hidden' },
  subjectFill: { height: '100%', borderRadius: 999 },
  subjectPct: { width: 38, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  chipScroll: { marginBottom: 12 },
  filterChip: { borderWidth: 1, borderColor: '#d5dbe5', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: '#ffffff' },
  filterChipActive: { borderColor: '#3f51b5', backgroundColor: '#3f51b5' },
  filterChipText: { color: '#334155', fontWeight: '600', fontSize: 13 },
  filterChipTextActive: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  card: { backgroundColor: '#ffffff', borderRadius: 18, padding: 15, marginBottom: 12, shadowColor: '#1f2937', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4, borderWidth: 1, borderColor: '#edf0f5' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dateText: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, color: '#ffffff', fontSize: 12, fontWeight: '700', overflow: 'hidden' },
  detailText: { fontSize: 14, color: '#475569', marginBottom: 3 },
  notesText: { fontSize: 13, color: '#64748b', fontStyle: 'italic', marginTop: 4 },
  emptyCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#edf0f5' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginTop: 10 },
  emptySubtitle: { fontSize: 13, color: '#8a94a6', marginTop: 6, textAlign: 'center' },
});
