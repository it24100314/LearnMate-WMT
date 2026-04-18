import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { useLocalSearchParams } from 'expo-router';

type NamedItem = { _id: string; name: string };
type Student = { _id: string; name: string; username: string };

type AttendanceRosterResponse = {
  schoolClass: NamedItem;
  subject?: NamedItem;
  students: Student[];
  attendanceDate: string;
  presentStudentIds: string[];
  sessionNotes?: string;
};

export default function MarkAttendanceScreen() {
  const params = useLocalSearchParams();
  const [classes, setClasses] = useState<NamedItem[]>([]);
  const [subjects, setSubjects] = useState<NamedItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState(params.classId ? String(params.classId) : '');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  const [students, setStudents] = useState<Student[]>([]);
  const [presentMap, setPresentMap] = useState<Record<string, boolean>>({});
  const [sessionNotes, setSessionNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const response = await api.get('/attendance/mark');
      setClasses(response.data?.schoolClasses ?? []);
      setSubjects(response.data?.subjects ?? []);
      setSelectedDate(response.data?.currentDate ?? new Date().toISOString().slice(0, 10));
    } catch {
      Alert.alert('Attendance', 'Failed to load classes for attendance.');
    } finally {
      setLoading(false);
    }
  };

  const selectedClass = useMemo(
    () => classes.find((item) => item._id === selectedClassId) || null,
    [classes, selectedClassId]
  );

  const selectedSubject = useMemo(
    () => subjects.find((item) => item._id === selectedSubjectId) || null,
    [subjects, selectedSubjectId]
  );

  const loadRoster = async () => {
    if (!selectedClassId) {
      Alert.alert('Validation', 'Please select a class first.');
      return;
    }

    try {
      setLoading(true);
      const response = await api.get<AttendanceRosterResponse>(`/attendance/mark/${selectedClassId}`, {
        params: {
          subjectId: selectedSubjectId || undefined,
          date: selectedDate,
        },
      });

      const rosterStudents = response.data?.students ?? [];
      const initialPresent: Record<string, boolean> = {};
      rosterStudents.forEach((student) => {
        initialPresent[student._id] = false;
      });

      (response.data?.presentStudentIds ?? []).forEach((studentId) => {
        initialPresent[studentId] = true;
      });

      setStudents(rosterStudents);
      setPresentMap(initialPresent);
      setSessionNotes(response.data?.sessionNotes ?? '');
    } catch (error: any) {
      Alert.alert('Attendance', error?.response?.data?.message || 'Failed to load attendance roster');
    } finally {
      setLoading(false);
    }
  };

  const submitAttendance = async () => {
    if (!selectedClassId) {
      Alert.alert('Validation', 'Please select a class first.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/attendance/mark/${selectedClassId}`, {
        subjectId: selectedSubjectId || undefined,
        date: selectedDate,
        attendance: presentMap,
        notes: sessionNotes,
      });

      Alert.alert('Success', 'Attendance marked successfully.');
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" color="#3f51b5" />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.header}>Mark Attendance</Text>
        <Text style={styles.heroText}>Load the class roster and mark present or absent in one place.</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Class</Text>
        <View style={styles.optionWrap}>
          {classes.map((item) => (
            <TouchableOpacity
              key={item._id}
              style={[styles.optionChip, selectedClassId === item._id && styles.optionChipSelected]}
              onPress={() => setSelectedClassId(item._id)}
            >
              <Text style={selectedClassId === item._id ? styles.optionTextSelected : styles.optionText}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Subject</Text>
        <View style={styles.optionWrap}>
          <TouchableOpacity
            style={[styles.optionChip, selectedSubjectId === '' && styles.optionChipSelected]}
            onPress={() => setSelectedSubjectId('')}
          >
            <Text style={selectedSubjectId === '' ? styles.optionTextSelected : styles.optionText}>General</Text>
          </TouchableOpacity>
          {subjects.map((item) => (
            <TouchableOpacity
              key={item._id}
              style={[styles.optionChip, selectedSubjectId === item._id && styles.optionChipSelected]}
              onPress={() => setSelectedSubjectId(item._id)}
            >
              <Text style={selectedSubjectId === item._id ? styles.optionTextSelected : styles.optionText}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={selectedDate}
          onChangeText={setSelectedDate}
          selectionColor="#3f51b5"
        />

        <TouchableOpacity style={styles.loadButton} onPress={loadRoster}>
          <Ionicons name="refresh-outline" size={18} color="#ffffff" />
          <Text style={styles.loadButtonText}>Load Roster</Text>
        </TouchableOpacity>
      </View>

      {students.length === 0 ? (
        <View style={styles.emptyBlock}>
          <Text style={styles.emptyText}>Select class and subject, then load roster.</Text>
        </View>
      ) : (
        <View style={styles.rosterCard}>
          <Text style={styles.selectionSummary}>
            {selectedClass?.name || 'Class'} {selectedSubject ? `- ${selectedSubject.name}` : '- General'}
          </Text>

          {students.map((item) => (
            <View key={item._id} style={styles.studentCard}>
              <Text style={styles.studentName}>{item.name}</Text>
              <View style={styles.btnGroup}>
                <TouchableOpacity
                  style={[styles.btn, styles.presentBtn]}
                  onPress={() => setPresentMap((prev) => ({ ...prev, [item._id]: true }))}
                >
                  <Text style={styles.btnText}>Present</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.absentBtn]}
                  onPress={() => setPresentMap((prev) => ({ ...prev, [item._id]: false }))}
                >
                  <Text style={styles.btnText}>Absent</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.stateText}>{presentMap[item._id] ? 'Marked Present' : 'Marked Absent'}</Text>
            </View>
          ))}

          <Text style={styles.label}>Session Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={sessionNotes}
            onChangeText={setSessionNotes}
            multiline
            placeholder="Optional notes for this attendance session"
            placeholderTextColor="#8a94a6"
            selectionColor="#3f51b5"
          />

          <TouchableOpacity style={styles.submitButton} onPress={submitAttendance} disabled={submitting}>
            <Ionicons name="save-outline" size={18} color="#ffffff" />
            <Text style={styles.submitButtonText}>{submitting ? 'Submitting...' : 'Save Attendance'}</Text>
          </TouchableOpacity>
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
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 15,
    marginBottom: 14,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#edf0f5',
  },
  rosterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 15,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#edf0f5',
  },
  header: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
    color: '#1f2937',
  },
  heroText: {
    color: '#64748b',
    lineHeight: 20,
    fontSize: 14,
  },
  label: {
    marginTop: 8,
    marginBottom: 6,
    color: '#475569',
    fontWeight: '700',
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: '#d5dbe5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#ffffff',
  },
  optionChipSelected: {
    borderColor: '#3f51b5',
    backgroundColor: '#3f51b5',
  },
  optionText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 13,
  },
  optionTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d5dbe5',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    marginBottom: 8,
    color: '#1f2937',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  loadButton: {
    backgroundColor: '#3f51b5',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  loadButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  selectionSummary: {
    fontWeight: '700',
    marginBottom: 8,
    color: '#334155',
  },
  emptyBlock: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#edf0f5',
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  emptyText: {
    color: '#64748b',
  },
  submitButton: {
    backgroundColor: '#3f51b5',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  studentCard: {
    borderRadius: 16,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    padding: 15,
    borderWidth: 1,
    borderColor: '#edf0f5',
  },
  studentName: {
    fontSize: 15,
    marginBottom: 10,
    fontWeight: '700',
    color: '#1f2937',
  },
  btnGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 12,
  },
  presentBtn: {
    backgroundColor: '#16a34a',
  },
  absentBtn: {
    backgroundColor: '#ff5252',
  },
  btnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  stateText: {
    marginTop: 8,
    fontSize: 12,
    color: '#475569',
  },
});
