import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Platform, RefreshControl,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';

type NamedItem = { _id: string; name: string };
type TimetableSession = {
  _id: string; title?: string; day: string;
  startTime: string; endTime: string; room?: string;
  subject?: { _id: string; name: string };
  schoolClass?: { _id: string; name: string };
};

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

// Parse "HH:MM" to total minutes
const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export default function ManageTimetableScreen() {
  const [timetable, setTimetable] = useState<TimetableSession[]>([]);
  const [title, setTitle] = useState('');
  const [day, setDay] = useState('MONDAY');
  const [startTime, setStartTime] = useState(new Date(2000, 0, 1, 8, 0));
  const [endTime, setEndTime] = useState(new Date(2000, 0, 1, 9, 0));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [room, setRoom] = useState('');
  const [subjects, setSubjects] = useState<NamedItem[]>([]);
  const [classes, setClasses] = useState<NamedItem[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [classId, setClassId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<TimetableSession | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const formatTime = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const toDate = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date(2000, 0, 1, h || 0, m || 0);
    return d;
  };

  const loadOptions = useCallback(async () => {
    try {
      const [subjectsRes, classesRes, timetableRes] = await Promise.all([
        api.get('/subjects'),
        api.get('/classes'),
        api.get('/timetables/my'),   // returns only THIS teacher's sessions (or all for admin)
      ]);
      setSubjects(subjectsRes.data?.subjects ?? []);
      setClasses(classesRes.data ?? []);
      setTimetable(timetableRes.data?.timetables || timetableRes.data || []);
    } catch {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOptions(); }, [loadOptions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOptions();
    setRefreshing(false);
  }, [loadOptions]);

  const startEdit = (session: TimetableSession) => {
    setEditingSession(session);
    setTitle(session.title || '');
    setDay(session.day || 'MONDAY');
    setStartTime(toDate(session.startTime || '08:00'));
    setEndTime(toDate(session.endTime || '09:00'));
    setRoom(session.room || '');
    setSubjectId(session.subject?._id || '');
    setClassId(session.schoolClass?._id || '');
  };

  const cancelEdit = () => {
    setEditingSession(null);
    setTitle(''); setDay('MONDAY');
    setStartTime(new Date(2000, 0, 1, 8, 0));
    setEndTime(new Date(2000, 0, 1, 9, 0));
    setRoom(''); setSubjectId(''); setClassId('');
  };

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Validation', 'Please provide a title.'); return; }
    if (!subjectId || !classId) { Alert.alert('Validation', 'Please select both class and subject.'); return; }

    // Fix #15: validate time range before API call
    const startMins = toMinutes(formatTime(startTime));
    const endMins = toMinutes(formatTime(endTime));
    if (endMins <= startMins) {
      Alert.alert('Validation', 'End time must be after start time.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: title.trim(),
        subjectId, classId,
        day,          // Fix #3: send 'day' to match backend model
        startTime: formatTime(startTime),
        endTime: formatTime(endTime),
        room: room.trim(),
      };
      if (editingSession) {
        await api.put(`/timetables/${editingSession._id}`, payload);
        Alert.alert('Success', 'Session updated!');
      } else {
        await api.post('/timetables', payload);
        Alert.alert('Success', 'Session added!');
      }
      cancelEdit();
      loadOptions();
    } catch (error: any) {
      Alert.alert('Failed', error?.response?.data?.message || 'Could not save session.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (session: TimetableSession) => {
    Alert.alert('Delete Session', `Delete "${session.title || 'this session'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            setDeletingId(session._id);
            await api.delete(`/timetables/${session._id}`);
            loadOptions();
          } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.message || 'Could not delete.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const uniqueItems = (items: NamedItem[]) => {
    const seen = new Set();
    return items.filter(i => { if (seen.has(i.name)) return false; seen.add(i.name); return true; });
  };

  // Fix #12: group timetable by day, sorted
  const grouped: Record<string, TimetableSession[]> = {};
  timetable.forEach(s => {
    const d = (s.day || 'UNKNOWN').toUpperCase();
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(s);
  });
  Object.values(grouped).forEach(arr => arr.sort((a, b) => a.startTime.localeCompare(b.startTime)));
  const sortedDays = DAYS.filter(d => grouped[d]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#3f51b5" /></View>;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3f51b5']} />}
    >
      <View style={styles.heroCard}>
        <Text style={styles.header}>{editingSession ? 'Edit Session' : 'Manage Timetable'}</Text>
        <Text style={styles.heroText}>{editingSession ? 'Update the details of this slot.' : 'Create and manage class sessions.'}</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} placeholder="e.g., Math Period" placeholderTextColor="#8a94a6"
          value={title} onChangeText={setTitle} selectionColor="#3f51b5" />

        <Text style={styles.label}>Select Class</Text>
        <View style={styles.optionWrap}>
          {uniqueItems(classes).map(item => (
            <TouchableOpacity key={item._id} style={[styles.chip, classId === item._id && styles.chipSelected]}
              onPress={() => setClassId(item._id)}>
              <Text style={classId === item._id ? styles.chipTextSel : styles.chipText}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Select Subject</Text>
        <View style={styles.optionWrap}>
          {uniqueItems(subjects).map(item => (
            <TouchableOpacity key={item._id} style={[styles.chip, subjectId === item._id && styles.chipSelected]}
              onPress={() => setSubjectId(item._id)}>
              <Text style={subjectId === item._id ? styles.chipTextSel : styles.chipText}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Select Day</Text>
        <View style={styles.optionWrap}>
          {DAYS.map(d => (
            <TouchableOpacity key={d} style={[styles.chip, day === d && styles.chipSelected]} onPress={() => setDay(d)}>
              <Text style={day === d ? styles.chipTextSel : styles.chipText}>{d.charAt(0) + d.slice(1).toLowerCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Start Time Picker */}
        <Text style={styles.label}>Start Time</Text>
        {Platform.OS === 'web' ? (
          <input
            type="time"
            value={formatTime(startTime)}
            onChange={(e) => setStartTime(toDate((e.target as HTMLInputElement).value))}
            style={styles.webTimeInput as any}
          />
        ) : (
          <>
            <TouchableOpacity style={styles.timeBtn} onPress={() => setShowStartPicker(true)}>
              <Ionicons name="time-outline" size={18} color="#3f51b5" />
              <Text style={styles.timeBtnText}>{formatTime(startTime)}</Text>
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker
                value={startTime}
                mode="time"
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(e, d) => {
                  setShowStartPicker(false);
                  if (d) setStartTime(d);
                }}
              />
            )}
          </>
        )}

        {/* End Time Picker */}
        <Text style={styles.label}>End Time</Text>
        {Platform.OS === 'web' ? (
          <input
            type="time"
            value={formatTime(endTime)}
            onChange={(e) => setEndTime(toDate((e.target as HTMLInputElement).value))}
            style={styles.webTimeInput as any}
          />
        ) : (
          <>
            <TouchableOpacity style={styles.timeBtn} onPress={() => setShowEndPicker(true)}>
              <Ionicons name="time-outline" size={18} color="#3f51b5" />
              <Text style={styles.timeBtnText}>{formatTime(endTime)}</Text>
            </TouchableOpacity>
            {showEndPicker && (
              <DateTimePicker
                value={endTime}
                mode="time"
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(e, d) => {
                  setShowEndPicker(false);
                  if (d) setEndTime(d);
                }}
              />
            )}
          </>
        )}

        <Text style={styles.label}>Room (Optional)</Text>
        <TextInput style={styles.input} placeholder="e.g., Room 101" placeholderTextColor="#8a94a6"
          value={room} onChangeText={setRoom} selectionColor="#3f51b5" />

        <View style={styles.btnRow}>
          {/* Fix #19: disable during save */}
          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            <Ionicons name={editingSession ? 'save-outline' : 'add-circle-outline'} size={18} color="#fff" />
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : editingSession ? 'Update' : 'Add Session'}</Text>
          </TouchableOpacity>
          {editingSession && (
            <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit}>
              <Ionicons name="close-outline" size={18} color="#334155" />
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Fix #12: grouped schedule list */}
      <Text style={styles.listHeader}>Current Schedule</Text>
      {timetable.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No Sessions Yet</Text>
          <Text style={styles.emptySubtitle}>Use the form above to add the first session.</Text>
        </View>
      ) : (
        sortedDays.map(d => (
          <View key={d}>
            <View style={styles.dayHeader}>
              <View style={styles.dayLine} />
              <Text style={styles.dayText}>{d.charAt(0) + d.slice(1).toLowerCase()}</Text>
              <View style={styles.dayLine} />
            </View>
            {grouped[d].map((session, idx) => (
              <View key={session._id || idx} style={styles.card}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{session.title || 'Session'}</Text>
                  <Text style={styles.cardSub}>{session.startTime} — {session.endTime}</Text>
                  <Text style={styles.cardSub}>
                    {session.subject?.name || 'No subject'} · {session.schoolClass?.name || 'No class'}
                  </Text>
                  {session.room ? <Text style={styles.cardSub}>📍 {session.room}</Text> : null}
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => startEdit(session)}>
                    <Ionicons name="create-outline" size={16} color="#fff" />
                  </TouchableOpacity>
                  {/* Fix #19: disable while deleting */}
                  <TouchableOpacity style={[styles.deleteBtn, deletingId === session._id && { opacity: 0.5 }]}
                    onPress={() => handleDelete(session)} disabled={deletingId === session._id}>
                    <Ionicons name="trash-outline" size={16} color="#fff" />
                  </TouchableOpacity>
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
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  heroCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20, marginBottom: 14, marginTop: 6, shadowColor: '#1f2937', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  header: { fontSize: 24, fontWeight: '800', color: '#1f2937' },
  heroText: { marginTop: 6, color: '#64748b', fontSize: 14, lineHeight: 20 },
  formCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, marginBottom: 20, shadowColor: '#1f2937', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  label: { fontWeight: '700', color: '#334155', marginBottom: 8, marginTop: 6 },
  webTimeInput: {
    borderWidth: 1,
    borderColor: '#d5dbe5',
    padding: 13,
    borderRadius: 14,
    marginBottom: 12,
    fontSize: 15,
    color: '#1f2937',
    backgroundColor: '#ffffff',
    width: '100%',
    fontFamily: 'inherit',
  },
  input: { borderWidth: 1, borderColor: '#d5dbe5', padding: 13, borderRadius: 14, marginBottom: 12, fontSize: 15, color: '#1f2937', backgroundColor: '#ffffff' },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { borderWidth: 1, borderColor: '#d5dbe5', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ffffff' },
  chipSelected: { borderColor: '#3f51b5', backgroundColor: '#3f51b5' },
  chipText: { color: '#334155', fontSize: 13, fontWeight: '600' },
  chipTextSel: { color: '#ffffff', fontWeight: '700' },
  timeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#d5dbe5', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: '#ffffff', marginBottom: 12 },
  timeBtnText: { fontSize: 15, color: '#334155', fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  saveBtn: { flex: 1, backgroundColor: '#3f51b5', padding: 13, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  saveBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  cancelBtn: { flex: 1, backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#d5dbe5', padding: 13, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  cancelBtnText: { color: '#334155', fontSize: 15, fontWeight: '700' },
  listHeader: { fontSize: 20, fontWeight: '800', marginBottom: 4, color: '#1f2937' },
  dayHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 12 },
  dayLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  dayText: { marginHorizontal: 10, fontSize: 13, fontWeight: '800', color: '#3f51b5', textTransform: 'uppercase', letterSpacing: 1 },
  card: { backgroundColor: '#ffffff', padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#edf0f5', flexDirection: 'row', alignItems: 'center', shadowColor: '#1f2937', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 2 },
  cardSub: { fontSize: 13, color: '#64748b', marginBottom: 1 },
  cardActions: { gap: 8, flexDirection: 'column' },
  editBtn: { backgroundColor: '#3f51b5', width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { backgroundColor: '#ff5252', width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emptyCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 36, alignItems: 'center', borderWidth: 1, borderColor: '#edf0f5' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#8a94a6', marginTop: 6, textAlign: 'center' },
});
