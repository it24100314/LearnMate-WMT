import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { storage } from '../utils/storage';

interface TimetableEntry {
  _id: string;
  day: string;
  startTime: string;
  endTime: string;
  room?: string;
  title?: string;
  subject?: { name: string };
  teacher?: { name: string };
  schoolClass?: { name: string };
}

const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export default function TimetableScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [infoMsg, setInfoMsg] = useState('');
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState('');
  const [className, setClassName] = useState('');

  const fetchTimetable = useCallback(async () => {
    try {
      const role = await storage.getItem('userRole') || '';
      setUserRole(role);

      const response = await api.get('/timetables/list');
      const data: TimetableEntry[] = response.data?.timetables || response.data || [];
      setTimetable(data);
      setInfoMsg(response.data?.info || response.data?.error || '');
      // Pick class name from first entry
      if (data.length > 0 && data[0].schoolClass?.name) {
        setClassName(data[0].schoolClass.name);
      }
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load timetable.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchTimetable().finally(() => setLoading(false));
  }, [fetchTimetable]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTimetable();
    setRefreshing(false);
  }, [fetchTimetable]);

  // Group by day
  const grouped: Record<string, TimetableEntry[]> = {};
  timetable.forEach((entry) => {
    const day = (entry.day || 'UNKNOWN').toUpperCase();
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(entry);
  });
  Object.values(grouped).forEach(entries =>
    entries.sort((a, b) => a.startTime.localeCompare(b.startTime))
  );
  const sortedDays = DAY_ORDER.filter(d => grouped[d]);

  const isStudent = userRole === 'STUDENT';

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#3f51b5" /></View>;
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="calendar-outline" size={52} color="#cbd5e1" />
        <Text style={styles.emptyTitle}>Could Not Load Timetable</Text>
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
      {/* Hero card — student version shows their class */}
      <View style={styles.heroCard}>
        <Text style={styles.header}>
          {isStudent ? 'My Timetable' : 'Weekly Timetable'}
        </Text>
        {isStudent && className ? (
          <View style={styles.classBadgeRow}>
            <View style={styles.classBadge}>
              <Ionicons name="school-outline" size={14} color="#3f51b5" />
              <Text style={styles.classBadgeText}>{className}</Text>
            </View>
          </View>
        ) : null}
        <Text style={styles.heroText}>
          {isStudent
            ? 'Sessions are filtered to your enrolled subjects only.'
            : 'Your complete class schedule grouped by day.'}
        </Text>
      </View>

      {/* Info banner from backend (e.g. "no subjects assigned") */}
      {infoMsg ? (
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={18} color="#3f51b5" />
          <Text style={styles.infoBannerText}>{infoMsg}</Text>
        </View>
      ) : null}

      {timetable.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>
            {isStudent ? 'No Classes Found' : 'No Sessions Scheduled'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {isStudent
              ? 'No timetable entries match your class and enrolled subjects yet. Check back later or contact your administrator.'
              : 'No timetable has been added yet. Check back later.'}
          </Text>
        </View>
      ) : (
        sortedDays.map((day) => (
          <View key={day}>
            <View style={styles.dayHeader}>
              <View style={styles.dayLine} />
              <Text style={styles.dayText}>{day.charAt(0) + day.slice(1).toLowerCase()}</Text>
              <View style={styles.dayLine} />
            </View>

            {grouped[day].map((session) => (
              <View key={session._id} style={styles.card}>
                <View style={styles.timeBadge}>
                  <Ionicons name="time-outline" size={13} color="#3f51b5" />
                  <Text style={styles.timeText}>{session.startTime}</Text>
                  <Text style={styles.timeSep}>—</Text>
                  <Text style={styles.timeText}>{session.endTime}</Text>
                </View>
                <View style={styles.details}>
                  <Text style={styles.subjectText}>
                    {session.subject?.name || session.title || 'Session'}
                  </Text>
                  {session.teacher?.name ? (
                    <View style={styles.inlineMeta}>
                      <Ionicons name="person-outline" size={13} color="#64748b" />
                      <Text style={styles.metaText}>{session.teacher.name}</Text>
                    </View>
                  ) : null}
                  {/* Only show class for non-student views */}
                  {!isStudent && session.schoolClass?.name ? (
                    <View style={styles.inlineMeta}>
                      <Ionicons name="people-outline" size={13} color="#64748b" />
                      <Text style={styles.metaText}>Class: {session.schoolClass.name}</Text>
                    </View>
                  ) : null}
                  {session.room ? (
                    <View style={styles.inlineMeta}>
                      <Ionicons name="location-outline" size={13} color="#64748b" />
                      <Text style={styles.metaText}>Room: {session.room}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
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
  heroCard: {
    backgroundColor: '#ffffff', borderRadius: 20, padding: 20, marginBottom: 14,
    shadowColor: '#1f2937', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
  },
  header: { fontSize: 24, fontWeight: '800', color: '#1f2937' },
  classBadgeRow: { flexDirection: 'row', marginTop: 8, marginBottom: 4 },
  classBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#edf2ff', borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  classBadgeText: { fontSize: 13, fontWeight: '700', color: '#3f51b5' },
  heroText: { marginTop: 6, color: '#64748b', lineHeight: 20, fontSize: 13 },
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#edf2ff', borderRadius: 14, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#c7d2fe',
  },
  infoBannerText: { flex: 1, fontSize: 13, color: '#3730a3', fontWeight: '600' },
  dayHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 8 },
  dayLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  dayText: {
    marginHorizontal: 10, fontSize: 13, fontWeight: '800',
    color: '#3f51b5', textTransform: 'uppercase', letterSpacing: 1,
  },
  card: {
    backgroundColor: '#ffffff', borderRadius: 18, marginBottom: 12, padding: 15,
    shadowColor: '#1f2937', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08,
    shadowRadius: 10, elevation: 4, borderWidth: 1, borderColor: '#edf0f5',
    flexDirection: 'row', alignItems: 'flex-start',
  },
  timeBadge: {
    backgroundColor: '#edf2ff', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 10,
    justifyContent: 'center', alignItems: 'center', marginRight: 14, minWidth: 70, gap: 2,
  },
  timeSep: { color: '#94a3b8', fontSize: 11 },
  timeText: { color: '#3f51b5', fontWeight: '700', fontSize: 13 },
  details: { flex: 1 },
  subjectText: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 6 },
  inlineMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  metaText: { fontSize: 13, color: '#64748b' },
  emptyCard: {
    backgroundColor: '#ffffff', borderRadius: 18, padding: 36, alignItems: 'center',
    borderWidth: 1, borderColor: '#edf0f5',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#8a94a6', marginTop: 6, textAlign: 'center', lineHeight: 20 },
});
