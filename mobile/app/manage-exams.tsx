import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams } from 'expo-router';
import api from '../utils/api';

type Exam = {
  _id: string;
  title: string;
  subject: { _id: string; name: string };
  schoolClass: { _id: string; name: string };
  deadline: string;
  maxMarks: number;
  passMark: number;
  additionalInstructions?: string;
  filePath?: string;
};

export default function ManageExamsScreen() {
  const params = useLocalSearchParams();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDeadline, setEditDeadline] = useState(new Date());
  const [editMaxMarks, setEditMaxMarks] = useState('');
  const [editPassMark, setEditPassMark] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      const response = await api.get('/exams/list');
      const teacherExams = response.data.exams.filter((exam: Exam) => !params.classId || exam.schoolClass._id === params.classId);
      setExams(teacherExams);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load exams');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (exam: Exam) => {
    setSelectedExam(exam);
    setEditingId(exam._id);
    setEditTitle(exam.title);
    setEditDeadline(new Date(exam.deadline));
    setEditMaxMarks(String(exam.maxMarks));
    setEditPassMark(String(exam.passMark));
    setEditInstructions(exam.additionalInstructions || '');
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setSelectedExam(null);
    setEditingId(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;

    try {
      setUpdating(true);
      const formData = new FormData();
      formData.append('title', editTitle);
      formData.append('deadline', editDeadline.toISOString());
      formData.append('maxMarks', editMaxMarks);
      formData.append('passMark', editPassMark);
      formData.append('additionalInstructions', editInstructions);

      await api.put(`/exams/edit/${editingId}`, formData);
      Alert.alert('Success', 'Exam updated successfully!');
      loadExams();
      cancelEdit();
    } catch (error: any) {
      Alert.alert('Update Failed', error?.response?.data?.message || 'Failed to update exam');
    } finally {
      setUpdating(false);
    }
  };

  const deleteExam = (examId: string, examTitle: string) => {
    Alert.alert('Delete Exam', `Are you sure you want to delete "${examTitle}"? This will also delete all answer sheets and marks.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await api.delete(`/exams/delete/${examId}`);
            Alert.alert('Success', 'Exam deleted successfully!');
            loadExams();
          } catch (error: any) {
            Alert.alert('Delete Failed', error?.response?.data?.message || 'Failed to delete exam');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (isEditing && selectedExam) {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.header}>Edit Exam</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={editTitle}
            onChangeText={setEditTitle}
            placeholder="Exam title"
          />

          <Text style={styles.label}>Max Marks</Text>
          <TextInput
            style={styles.input}
            value={editMaxMarks}
            onChangeText={setEditMaxMarks}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Pass Mark</Text>
          <TextInput
            style={styles.input}
            value={editPassMark}
            onChangeText={setEditPassMark}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Deadline</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
            <Text>{editDeadline.toLocaleString()}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={editDeadline}
              mode="datetime"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setEditDeadline(selectedDate);
                }
              }}
            />
          )}

          <Text style={styles.label}>Additional Instructions</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={editInstructions}
            onChangeText={setEditInstructions}
            placeholder="Instructions (optional)"
            multiline
            numberOfLines={4}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={saveEdit}
              disabled={updating}
            >
              <Text style={styles.buttonText}>{updating ? 'Saving...' : 'Save Changes'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={cancelEdit}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Manage Exams</Text>

      {exams.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No exams created yet</Text>
        </View>
      ) : (
        <FlatList
          data={exams}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.examCard}>
              <View style={styles.examHeader}>
                <Text style={styles.examTitle}>{item.title}</Text>
                <Text style={styles.examMeta}>{item.subject?.name || '-'} | {item.schoolClass?.name || '-'}</Text>
              </View>

              <Text style={styles.examInfo}>
                Max Marks: {item.maxMarks} | Pass: {item.passMark}
              </Text>

              <Text style={styles.examInfo}>
                Deadline: {new Date(item.deadline).toLocaleString()}
              </Text>

              {item.additionalInstructions && (
                <Text style={styles.examInstructions}>{item.additionalInstructions}</Text>
              )}

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => startEdit(item)}
                >
                  <Text style={styles.actionButtonText}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => deleteExam(item._id, item.title)}
                >
                  <Text style={styles.actionButtonText}>🗑️ Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 22, fontWeight: 'bold', marginHorizontal: 20, marginTop: 20, marginBottom: 15, color: '#1f2937' },
  listContent: { padding: 15 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#9ca3af', fontStyle: 'italic' },
  examCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  examHeader: { marginBottom: 10 },
  examTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 4 },
  examMeta: { fontSize: 13, color: '#6b7280' },
  examInfo: { fontSize: 13, color: '#4b5563', marginTop: 6 },
  examInstructions: { fontSize: 12, color: '#7c3aed', fontStyle: 'italic', marginTop: 8 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionButton: { flex: 1, paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  editButton: { backgroundColor: '#3b82f6' },
  deleteButton: { backgroundColor: '#ef4444' },
  actionButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  form: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 15, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 14, backgroundColor: '#fff' },
  textArea: { textAlignVertical: 'top', paddingTop: 12 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  saveButton: { backgroundColor: '#10b981' },
  cancelButton: { backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#d1d5db' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelButtonText: { color: '#374151', fontWeight: '700', fontSize: 14 },
});
