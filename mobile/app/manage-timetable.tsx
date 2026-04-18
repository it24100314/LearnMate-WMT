import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';

type NamedItem = { _id: string; name: string };
const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export default function ManageTimetableScreen() {
  const [timetable, setTimetable] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [day, setDay] = useState('MONDAY');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [room, setRoom] = useState('');

  const [subjects, setSubjects] = useState<NamedItem[]>([]);
  const [classes, setClasses] = useState<NamedItem[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [classId, setClassId] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const [subjectsRes, classesRes, timetableRes] = await Promise.all([
        api.get('/subjects'),
        api.get('/classes'),
        api.get('/timetables/list')
      ]);

      const filteredSubjects: NamedItem[] = subjectsRes.data?.subjects ?? [];
      const filteredClasses: NamedItem[] = classesRes.data ?? [];

      setSubjects(filteredSubjects);
      setClasses(filteredClasses);
      setTimetable(timetableRes.data?.timetables || timetableRes.data || []);
    } catch {
      Alert.alert('Error', 'Failed to load classes and subjects');
    } finally {
      setLoading(false);
    }
  };

  const calculateUniqueItems = (items: NamedItem[]) => {
    const seen = new Set();
    return items.filter(item => {
      if (seen.has(item.name)) return false;
      seen.add(item.name);
      return true;
    });
  };

  const handleCreate = async () => {
    if (!title.trim() || !startTime.trim() || !endTime.trim()) {
      Alert.alert('Validation', 'Please provide a title, start time, and end time');
      return;
    }

    if (!subjectId || !classId) {
      Alert.alert('Validation', 'Please select both class and subject');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        title: title.trim(),
        subjectId,
        classId,
        day,
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        room: room.trim(),
        teacherId: undefined // Let backend resolve from token
      };

      await api.post('/timetables', payload);

      Alert.alert('Success', 'Timetable slot created successfully!');
      setTitle('');
      setStartTime('08:00');
      setEndTime('09:00');
      setRoom('');
      setSubjectId('');
      setClassId('');
      loadOptions(); // Refresh the list
    } catch (error: any) {
      Alert.alert('Creation Failed', error?.response?.data?.message || 'There was an issue creating the timetable session.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3f51b5" />
      </View>
    );
  }

  const uniqueSubjects = calculateUniqueItems(subjects);
  const uniqueClasses = calculateUniqueItems(classes);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.header}>Manage Timetable</Text>
        <Text style={styles.heroText}>Create new sessions and review current weekly schedules.</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Math Double Period"
          placeholderTextColor="#8a94a6"
          value={title}
          onChangeText={setTitle}
          selectionColor="#3f51b5"
        />

        <Text style={styles.label}>Select Class</Text>
        <View style={styles.optionWrap}>
          {uniqueClasses.map((item) => (
            <TouchableOpacity
              key={item._id}
              style={[styles.optionChip, classId === item._id && styles.optionChipSelected]}
              onPress={() => setClassId(item._id)}
            >
              <Text style={[styles.optionText, classId === item._id && styles.optionTextSelected]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Select Subject</Text>
        <View style={styles.optionWrap}>
          {uniqueSubjects.map((item) => (
            <TouchableOpacity
              key={item._id}
              style={[styles.optionChip, subjectId === item._id && styles.optionChipSelected]}
              onPress={() => setSubjectId(item._id)}
            >
              <Text style={[styles.optionText, subjectId === item._id && styles.optionTextSelected]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Select Day</Text>
        <View style={styles.optionWrap}>
          {DAYS.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.optionChip, day === d && styles.optionChipSelected]}
              onPress={() => setDay(d)}
            >
              <Text style={[styles.optionText, day === d && styles.optionTextSelected]}>
                {d.charAt(0) + d.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Start Time (HH:MM)</Text>
        <TextInput
          style={styles.input}
          placeholder="08:00"
          placeholderTextColor="#8a94a6"
          value={startTime}
          onChangeText={setStartTime}
          selectionColor="#3f51b5"
        />

        <Text style={styles.label}>End Time (HH:MM)</Text>
        <TextInput
          style={styles.input}
          placeholder="09:00"
          placeholderTextColor="#8a94a6"
          value={endTime}
          onChangeText={setEndTime}
          selectionColor="#3f51b5"
        />

        <Text style={styles.label}>Room (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Room 101"
          placeholderTextColor="#8a94a6"
          value={room}
          onChangeText={setRoom}
          selectionColor="#3f51b5"
        />

        <TouchableOpacity style={styles.uploadBtn} onPress={handleCreate} disabled={saving}>
          <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
          <Text style={styles.uploadText}>{saving ? 'Saving...' : 'Add Session'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        <Text style={styles.listHeader}>Current Schedule</Text>
        {timetable.map((session, index) => (
          <View key={session._id || index} style={styles.card}>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{session.title || 'Session'}</Text>
              <Text style={styles.cardSub}>Day: {session.day}</Text>
              <Text style={styles.cardSub}>Time: {session.startTime} - {session.endTime}</Text>
              <Text style={styles.cardSub}>Subject: {session.subject?.name || 'N/A'}</Text>
              <Text style={styles.cardSub}>Class: {session.schoolClass?.name || 'N/A'}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    marginTop: 6,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  heroText: {
    marginTop: 6,
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
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
  input: {
    borderWidth: 1,
    borderColor: '#d5dbe5',
    padding: 15,
    borderRadius: 16,
    marginBottom: 12,
    fontSize: 15,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  label: {
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginTop: 6,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
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
    fontSize: 13,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  uploadBtn: {
    backgroundColor: '#3f51b5',
    padding: 15,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  uploadText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  listContainer: {
    marginTop: 30,
    paddingTop: 8,
  },
  listHeader: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 15,
    color: '#1f2937',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#edf0f5',
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    color: '#1f2937',
  },
  cardSub: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  }
});
