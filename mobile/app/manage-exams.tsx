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
import { Ionicons } from '@expo/vector-icons';
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
        <ActivityIndicator size="large" color="#3f51b5" />
      </View>
    );
  }

  if (isEditing && selectedExam) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.header}>Edit Exam</Text>
          <Text style={styles.heroText}>Update exam details and deadline for students.</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={editTitle}
            onChangeText={setEditTitle}
            placeholder="Exam title"
            placeholderTextColor="#8a94a6"
            selectionColor="#3f51b5"
          />

          <Text style={styles.label}>Max Marks</Text>
          <TextInput
            style={styles.input}
            value={editMaxMarks}
            onChangeText={setEditMaxMarks}
            keyboardType="numeric"
            placeholderTextColor="#8a94a6"
            selectionColor="#3f51b5"
          />

          <Text style={styles.label}>Pass Mark</Text>
          <TextInput
            style={styles.input}
            value={editPassMark}
            onChangeText={setEditPassMark}
            keyboardType="numeric"
            placeholderTextColor="#8a94a6"
            selectionColor="#3f51b5"
          />

          <Text style={styles.label}>Deadline</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
            <View style={styles.deadlineRow}>
              <Ionicons name="calendar-outline" size={16} color="#3f51b5" />
              <Text style={styles.deadlineText}>{editDeadline.toLocaleString()}</Text>
            </View>
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
            placeholderTextColor="#8a94a6"
            multiline
            numberOfLines={4}
            selectionColor="#3f51b5"
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={saveEdit}
              disabled={updating}
            >
              <Ionicons name="save-outline" size={18} color="#ffffff" />
              <Text style={styles.buttonText}>{updating ? 'Saving...' : 'Save Changes'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={cancelEdit}>
              <Ionicons name="close-outline" size={18} color="#334155" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.header}>Manage Exams</Text>
        <Text style={styles.heroText}>Edit details or delete previously created exams.</Text>
      </View>

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
                  <Ionicons name="create-outline" size={16} color="#ffffff" />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => deleteExam(item._id, item.title)}
                >
                  <Ionicons name="trash-outline" size={16} color="#ffffff" />
                  <Text style={styles.actionButtonText}>Delete</Text>
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
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 14,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  header: { fontSize: 22, fontWeight: '800', color: '#1f2937' },
  heroText: { marginTop: 6, color: '#64748b', fontSize: 14, lineHeight: 20 },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#8a94a6', fontStyle: 'italic' },
  examCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 15,
    marginBottom: 14,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#edf0f5',
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  examHeader: { marginBottom: 10 },
  examTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 4 },
  examMeta: { fontSize: 13, color: '#64748b' },
  examInfo: { fontSize: 13, color: '#475569', marginTop: 6 },
  examInstructions: { fontSize: 12, color: '#3f51b5', fontStyle: 'italic', marginTop: 8 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionButton: { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  editButton: { backgroundColor: '#3f51b5' },
  deleteButton: { backgroundColor: '#ff5252' },
  actionButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },

  form: { padding: 20 },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  label: { fontSize: 14, fontWeight: '700', color: '#475569', marginTop: 15, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d5dbe5', borderRadius: 14, padding: 12, fontSize: 14, backgroundColor: '#fff', color: '#1f2937' },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deadlineText: { color: '#334155', fontSize: 14 },
  textArea: { textAlignVertical: 'top', paddingTop: 12 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  saveButton: { backgroundColor: '#3f51b5' },
  cancelButton: { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#d5dbe5' },
  buttonText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  cancelButtonText: { color: '#334155', fontWeight: '700', fontSize: 14 },
});
