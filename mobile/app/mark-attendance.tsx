import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Platform, RefreshControl,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { useLocalSearchParams } from 'expo-router';

type NamedItem = { _id: string; name: string };
type Student = { _id: string; name: string; username: string };
type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT';

type RosterResponse = {
  schoolClass: NamedItem;
  subject?: NamedItem;
  students: Student[];
  attendanceDate: string;
  presentStudentIds: string[];
  statusMap?: Record<string, AttendanceStatus>;
  sessionNotes?: string;
  hasExistingAttendance?: boolean;
};

export default function MarkAttendanceScreen() {
  const params = useLocalSearchParams();
  const [classes, setClasses] = useState<NamedItem[]>([]);
  const [subjects, setSubjects] = useState<NamedItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState(params.classId ? String(params.classId) : '');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus>>({});
  const [sessionNotes, setSessionNotes] = useState('');
  const [hasExisting, setHasExisting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadOptions = useCallback(async () => {
    try {
      const response = await api.get('/attendance/mark');
      setClasses(response.data?.schoolClasses ?? []);
      setSubjects(response.data?.subjects ?? []);
      if (response.data?.currentDate) {
        setAttendanceDate(new Date(response.data.currentDate));
      }
    } catch (err: any) {
      // Fix #6: show specific message if teacher has no assigned classes
      const msg = err?.response?.data?.message || 'Failed to load classes.';
      Alert.alert('Attendance', msg);
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

  const selectedClass = useMemo(() => classes.find(c => c._id === selectedClassId) || null, [classes, selectedClassId]);
  const selectedSubject = useMemo(() => subjects.find(s => s._id === selectedSubjectId) || null, [subjects, selectedSubjectId]);

  const loadRoster = async () => {
    if (!selectedClassId) { Alert.alert('Validation', 'Please select a class first.'); return; }
    try {
      setRosterLoading(true);
      const dateStr = attendanceDate.toISOString().slice(0, 10);
      const response = await api.get<RosterResponse>(`/attendance/mark/${selectedClassId}`, {
        params: { subjectId: selectedSubjectId || undefined, date: dateStr },
      });
      const rosterStudents = response.data?.students ?? [];
      // Fix #1+#2: use statusMap from backend (PRESENT/LATE/ABSENT)
      const initial: Record<string, AttendanceStatus> = {};
      const backendStatusMap = response.data?.statusMap || {};
      rosterStudents.forEach(s => {
        initial[s._id] = backendStatusMap[s._id] ?? 'ABSENT';
      });
      setStudents(rosterStudents);
      setStatusMap(initial);
      setSessionNotes(response.data?.sessionNotes ?? '');
      setHasExisting(response.data?.hasExistingAttendance ?? false);
    } catch (error: any) {
      Alert.alert('Attendance', error?.response?.data?.message || 'Failed to load roster.');
    } finally {
      setRosterLoading(false);
    }
  };

  const submitAttendance = async () => {
    if (!selectedClassId) { Alert.alert('Validation', 'Please select a class first.'); return; }
    try {
      setSubmitting(true);
      await api.post(`/attendance/mark/${selectedClassId}`, {
        subjectId: selectedSubjectId || undefined,
        date: attendanceDate.toISOString().slice(0, 10),
        attendance: statusMap,
        notes: sessionNotes,
      });
      Alert.alert('Success', 'Attendance saved successfully.');
      setHasExisting(true);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to mark attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  const setStatus = (id: string, status: AttendanceStatus) =>
    setStatusMap(prev => ({ ...prev, [id]: status }));

  const markAll = (status: AttendanceStatus) => {
    const m: Record<string, AttendanceStatus> = {};
    students.forEach(s => { m[s._id] = status; });
    setStatusMap(m);
  };

  const summary = useMemo(() => {
    const vals = Object.values(statusMap);
    return {
      present: vals.filter(s => s === 'PRESENT').length,
      late: vals.filter(s => s === 'LATE').length,
      absent: vals.filter(s => s === 'ABSENT').length,
    };
  }, [statusMap]);

  const getBtnStyle = (current: AttendanceStatus, target: AttendanceStatus) => {
    if (current !== target) return styles.btnInactive;
    if (target === 'PRESENT') return styles.btnPresent;
    if (target === 'LATE') return styles.btnLate;
    return styles.btnAbsent;
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" color="#3f51b5" />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3f51b5']} />}
    >
      <View style={styles.heroCard}>
        <Text style={styles.header}>Mark Attendance</Text>
        <Text style={styles.heroText}>Select class, subject, and date — then mark each student.</Text>
      </View>

      <View style={styles.formCard}>
        {/* Class */}
        <Text style={styles.label}>Class</Text>
        {classes.length === 0 ? (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color="#ca8a04" />
            <Text style={styles.infoText}>You have no assigned classes. Please contact your administrator.</Text>
          </View>
        ) : (
          <View style={styles.optionWrap}>
            {classes.map(item => (
              <TouchableOpacity key={item._id}
                style={[styles.chip, selectedClassId === item._id && styles.chipSelected]}
                onPress={() => setSelectedClassId(item._id)}>
                <Text style={selectedClassId === item._id ? styles.chipTextSel : styles.chipText}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Subject */}
        <Text style={styles.label}>Subject</Text>
        <View style={styles.optionWrap}>
          <TouchableOpacity style={[styles.chip, selectedSubjectId === '' && styles.chipSelected]}
            onPress={() => setSelectedSubjectId('')}>
            <Text style={selectedSubjectId === '' ? styles.chipTextSel : styles.chipText}>General</Text>
          </TouchableOpacity>
          {subjects.map(item => (
            <TouchableOpacity key={item._id}
              style={[styles.chip, selectedSubjectId === item._id && styles.chipSelected]}
              onPress={() => setSelectedSubjectId(item._id)}>
              <Text style={selectedSubjectId === item._id ? styles.chipTextSel : styles.chipText}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date picker — Fix #8 */}
        <Text style={styles.label}>Date</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={18} color="#3f51b5" />
          <Text style={styles.dateBtnText}>{attendanceDate.toDateString()}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={attendanceDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()} // Requirement #3: Prevent future dates
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (event.type === 'set' && date) setAttendanceDate(date);
            }}
          />
        )}

        <TouchableOpacity style={[styles.loadBtn, rosterLoading && { opacity: 0.6 }]}
          onPress={loadRoster} disabled={rosterLoading}>
          <Ionicons name="refresh-outline" size={18} color="#ffffff" />
          <Text style={styles.loadBtnText}>{rosterLoading ? 'Loading...' : 'Load Roster'}</Text>
        </TouchableOpacity>
      </View>

      {/* Fix #10: overwrite warning banner */}
      {students.length > 0 && hasExisting && (
        <View style={styles.warningBanner}>
          <Ionicons name="information-circle-outline" size={18} color="#1e40af" />
          <Text style={styles.warningText}>
            Attendance has already been recorded for this session. Modifying records is not allowed.
          </Text>
        </View>
      )}

      {students.length > 0 ? (
        <View style={styles.rosterCard}>
          <Text style={styles.selectionSummary}>
            {selectedClass?.name} {selectedSubject ? `— ${selectedSubject.name}` : '— General'}
          </Text>

          {/* Summary */}
          <View style={styles.summaryRow}>
            {[
              { label: `✓ ${summary.present} Present`, bg: '#dcfce7', color: '#16a34a' },
              { label: `⏱ ${summary.late} Late`, bg: '#fef9c3', color: '#ca8a04' },
              { label: `✗ ${summary.absent} Absent`, bg: '#fee2e2', color: '#dc2626' },
            ].map(s => (
              <View key={s.label} style={[styles.summaryBadge, { backgroundColor: s.bg }]}>
                <Text style={[styles.summaryText, { color: s.color }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Quick mark all */}
          {!hasExisting && (
            <View style={styles.quickRow}>
              <Text style={styles.quickLabel}>Mark All:</Text>
              {(['PRESENT', 'LATE', 'ABSENT'] as AttendanceStatus[]).map(s => (
                <TouchableOpacity key={s} style={[styles.quickBtn, {
                  backgroundColor: s === 'PRESENT' ? '#16a34a' : s === 'LATE' ? '#ca8a04' : '#ff5252'
                }]} onPress={() => markAll(s)}>
                  <Text style={styles.quickBtnText}>{s.charAt(0) + s.slice(1).toLowerCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {students.map(item => {
            const current = statusMap[item._id] ?? 'ABSENT';
            return (
              <View key={item._id} style={styles.studentCard}>
                <Text style={styles.studentName}>{item.name}</Text>
                <Text style={styles.studentUsername}>{item.username}</Text>
                <View style={styles.btnGroup}>
                  {(['PRESENT', 'LATE', 'ABSENT'] as AttendanceStatus[]).map(s => (
                    <TouchableOpacity key={s} 
                      style={[styles.btn, getBtnStyle(current, s), hasExisting && { opacity: current === s ? 1 : 0.4 }]}
                      onPress={() => !hasExisting && setStatus(item._id, s)}
                      disabled={hasExisting}
                    >
                      <Text style={[styles.btnText, current !== s && { color: '#475569' }]}>
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })}

          <Text style={styles.label}>Session Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea, hasExisting && { backgroundColor: '#f1f5f9' }]}
            value={sessionNotes}
            onChangeText={setSessionNotes}
            multiline
            editable={!hasExisting}
            placeholder="Optional notes for this session"
            placeholderTextColor="#8a94a6"
            selectionColor="#3f51b5"
          />

          {!hasExisting && (
            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={submitAttendance}
              disabled={submitting}
            >
              <Ionicons name="save-outline" size={18} color="#ffffff" />
              <Text style={styles.submitBtnText}>
                {submitting ? 'Submitting...' : 'Save Attendance'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="clipboard-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No Roster Loaded</Text>
          <Text style={styles.emptySubtitle}>Select class, subject and date, then tap Load Roster.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 28 },
  center: { flex: 1, justifyContent: 'center', backgroundColor: '#f8f9fa' },
  heroCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20, marginBottom: 14, shadowColor: '#1f2937', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  header: { fontSize: 22, fontWeight: '800', marginBottom: 2, color: '#1f2937' },
  heroText: { color: '#64748b', lineHeight: 20, fontSize: 14 },
  formCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 15, marginBottom: 14, shadowColor: '#1f2937', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4, borderWidth: 1, borderColor: '#edf0f5' },
  rosterCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 15, shadowColor: '#1f2937', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4, borderWidth: 1, borderColor: '#edf0f5' },
  label: { marginTop: 8, marginBottom: 6, color: '#475569', fontWeight: '700' },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { borderWidth: 1, borderColor: '#d5dbe5', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#ffffff' },
  chipSelected: { borderColor: '#3f51b5', backgroundColor: '#3f51b5' },
  chipText: { color: '#334155', fontWeight: '600', fontSize: 13 },
  chipTextSel: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#d5dbe5', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#ffffff', marginBottom: 10 },
  dateBtnText: { fontSize: 15, color: '#334155', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#d5dbe5', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#ffffff', marginBottom: 8, color: '#1f2937' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  loadBtn: { backgroundColor: '#3f51b5', borderRadius: 14, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  loadBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef9c3', borderRadius: 12, padding: 12, marginBottom: 10 },
  infoText: { flex: 1, fontSize: 13, color: '#92400e', fontWeight: '600' },
  warningBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fef3c7', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#fde68a' },
  warningText: { flex: 1, fontSize: 13, color: '#92400e', fontWeight: '600' },
  selectionSummary: { fontWeight: '700', marginBottom: 12, color: '#334155', fontSize: 15 },
  summaryRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  summaryBadge: { flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  summaryText: { fontWeight: '700', fontSize: 11 },
  quickRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  quickLabel: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  quickBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  quickBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  studentCard: { borderRadius: 16, marginBottom: 10, backgroundColor: '#f8f9fa', padding: 14, borderWidth: 1, borderColor: '#edf0f5' },
  studentName: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  studentUsername: { fontSize: 12, color: '#8a94a6', marginBottom: 10 },
  btnGroup: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center' },
  btnPresent: { backgroundColor: '#16a34a' },
  btnLate: { backgroundColor: '#ca8a04' },
  btnAbsent: { backgroundColor: '#ff5252' },
  btnInactive: { backgroundColor: '#e2e8f0' },
  btnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  submitBtn: { backgroundColor: '#3f51b5', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 10, flexDirection: 'row', justifyContent: 'center', gap: 6, shadowColor: '#1f2937', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  submitBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  emptyCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 36, alignItems: 'center', borderWidth: 1, borderColor: '#edf0f5' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#8a94a6', marginTop: 6, textAlign: 'center' },
});
