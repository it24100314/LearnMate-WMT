import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, Alert, TextInput, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import api from '../utils/api';
import * as SecureStore from 'expo-secure-store';
import { downloadAndShareApiFile } from '../utils/download';

type NamedItem = { _id: string; name: string };
type Student = { _id: string; name: string; username: string };
type Exam = { _id: string; title: string; maxMarks: number; subject?: NamedItem };
type AnswerSheet = {
  _id: string;
  exam: string;
  student: string;
  filePath?: string;
  submittedAt?: string;
  isLate?: boolean;
  status: string;
  score?: number;
  comments?: string;
};

export default function EnterMarksScreen() {
  const params = useLocalSearchParams();
  const [classes, setClasses] = useState<NamedItem[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, AnswerSheet>>({});
  
  const [selectedClassId, setSelectedClassId] = useState(params.classId ? String(params.classId) : '');
  const [selectedExamId, setSelectedExamId] = useState('');
  
  const [marksData, setMarksData] = useState<Record<string, { score: string, comments: string }>>({});
  
  const [loading, setLoading] = useState(true);
  const [fetchingRoster, setFetchingRoster] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const userId = await SecureStore.getItemAsync('userId');
      const classesRes = await api.get(`/classes/teacher/${userId}`);
      setClasses(classesRes.data || []);
      
      if (selectedClassId) {
        await fetchExamsAndStudents(selectedClassId);
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'Failed to load options.');
    } finally {
      setLoading(false);
    }
  };

  const fetchExamsAndStudents = async (classId: string) => {
    try {
      setFetchingRoster(true);
      const [studentsRes, examsRes] = await Promise.all([
        api.get(`/classes/${classId}/students`),
        api.get(`/exams/search?classId=${classId}`)
      ]);
      setStudents(studentsRes.data?.students || []);
      setExams(examsRes.data?.exams || []);
      setSelectedExamId('');
      setMarksData({});
      setSubmissions({});
    } catch (err) {
      Alert.alert('Error', 'Failed to load roster or exams for class.');
    } finally {
      setFetchingRoster(false);
    }
  };

  const fetchAnswerSheets = async (examId: string) => {
    try {
      // Fetch answer sheets for the selected exam
      const reviewRes = await api.get(`/exams/review/${examId}`);
      const { answerSheets } = reviewRes.data;

      const submissionsMap: Record<string, AnswerSheet> = {};
      answerSheets?.forEach((sheet: AnswerSheet) => {
        if (sheet.student?._id) {
          submissionsMap[sheet.student._id] = sheet;
        }
      });

      setSubmissions(submissionsMap);
    } catch (err) {
      console.error('Error fetching submissions:', err);
      setSubmissions({});
    }
  };

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    fetchExamsAndStudents(classId);
  };

  const handleExamChange = (examId: string) => {
    setSelectedExamId(examId);
    setMarksData({});
    fetchAnswerSheets(examId);
  };

  const downloadAnswerSheet = async (student: Student, answerSheet: AnswerSheet) => {
    try {
      setDownloadingId(student._id);
      const fileName = `${student.name}_answer_sheet.pdf`;

      await downloadAndShareApiFile({
        endpoint: `/exams/download-answer/${answerSheet._id}`,
        fileName,
        dialogTitle: 'Open or share answer sheet',
      });
    } catch (error: any) {
      Alert.alert('Download Failed', error?.message || 'Unable to download answer sheet');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleScoreChange = (studentId: string, value: string) => {
    setMarksData(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], score: value, comments: prev[studentId]?.comments || '' }
    }));
  };

  const handleCommentChange = (studentId: string, value: string) => {
    setMarksData(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], comments: value, score: prev[studentId]?.score || '' }
    }));
  };

  const submitMarks = async () => {
    if (!selectedExamId) {
      Alert.alert('Validation', 'Please select an exam before submitting.');
      return;
    }
    
    const exam = exams.find(e => e._id === selectedExamId);
    if (!exam) return;

    // Validation
    for (const [studentId, data] of Object.entries(marksData)) {
      if (data.score) {
        const num = Number(data.score);
        if (isNaN(num)) {
          Alert.alert('Validation', `Score for a student is not a valid number.`);
          return;
        }
        if (exam.maxMarks && num > exam.maxMarks) {
          Alert.alert('Validation', `Score cannot exceed the maximum mark (${exam.maxMarks}).`);
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      await api.post('/marks/bulk', {
        examId: selectedExamId,
        marksData
      });
      Alert.alert('Success', 'Marks successfully entered.');
      setMarksData({});
    } catch (err: any) {
      Alert.alert('Submit Error', err.response?.data?.message || 'Failed to submit marks.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Enter Marks</Text>

      <View style={styles.selectionArea}>
        <Text style={styles.label}>Select Class</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
          {classes.map(c => (
            <TouchableOpacity 
              key={c._id} 
              style={[styles.chip, selectedClassId === c._id && styles.chipActive]}
              onPress={() => handleClassChange(c._id)}
            >
              <Text style={selectedClassId === c._id ? styles.chipTextActive : styles.chipText}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Select Exam</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
          {exams.length === 0 ? <Text style={styles.noDataText}>No exams for this class</Text> : null}
          {exams.map(e => (
            <TouchableOpacity 
              key={e._id} 
              style={[styles.chip, selectedExamId === e._id && styles.chipActive]}
              onPress={() => handleExamChange(e._id)}
            >
              <Text style={selectedExamId === e._id ? styles.chipTextActive : styles.chipText}>
                {e.title} {e.subject ? `(${e.subject.name})` : ''} - Max {e.maxMarks}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {fetchingRoster ? (
        <ActivityIndicator size="small" color="#007AFF" style={{marginTop: 20}} />
      ) : (
        <FlatList
          data={selectedClassId ? students : []}
          keyExtractor={item => item._id}
          ListEmptyComponent={<Text style={styles.noDataText}>{selectedClassId ? 'No students' : 'Select a class to begin'}</Text>}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => {
            const submission = submissions[item._id];
            return (
              <View style={styles.studentCard}>
                <Text style={styles.studentName}>{item.name} ({item.username})</Text>
                
                {/* Answer Sheet Display */}
                {submission && submission.filePath && (
                  <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={() => downloadAnswerSheet(item, submission)}
                    disabled={downloadingId === item._id}
                  >
                    <Text style={styles.downloadButtonText}>
                      {downloadingId === item._id ? '📥 Downloading...' : '📄 Download Answer Sheet'}
                    </Text>
                  </TouchableOpacity>
                )}

                {submission && !submission.filePath && (
                  <Text style={styles.noAnswerText}>No answer sheet submitted</Text>
                )}
                
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.scoreInput}
                    placeholder="Score"
                    keyboardType="numeric"
                    value={marksData[item._id]?.score || ''}
                    onChangeText={(val) => handleScoreChange(item._id, val)}
                  />
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Comments"
                    value={marksData[item._id]?.comments || ''}
                    onChangeText={(val) => handleCommentChange(item._id, val)}
                  />
                </View>
              </View>
            );
          }}
        />
      )}

      {selectedClassId && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]} 
            onPress={submitMarks}
            disabled={submitting}
          >
            <Text style={styles.submitText}>{submitting ? 'Saving...' : 'Save All Marks'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 20, fontWeight: 'bold', marginHorizontal: 20, marginTop: 30, marginBottom: 15, color: '#1f2937' },
  selectionArea: { backgroundColor: '#fff', padding: 15, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  label: { fontSize: 13, fontWeight: 'bold', color: '#6b7280', marginBottom: 8, marginTop: 10 },
  chipsRow: { flexDirection: 'row', marginBottom: 10 },
  chip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', marginRight: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  chipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  chipText: { color: '#374151', fontSize: 14 },
  chipTextActive: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  noDataText: { color: '#9ca3af', fontStyle: 'italic', paddingVertical: 8, textAlign: 'center', flex: 1 },
  studentCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 1 },
  studentName: { fontSize: 16, fontWeight: '600', marginBottom: 10, color: '#111827' },
  inputRow: { flexDirection: 'row', gap: 10 },
  scoreInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, width: 80, fontSize: 15, textAlign: 'center' },
  commentInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, flex: 1, fontSize: 14 },
  footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  submitBtn: { backgroundColor: '#10b981', paddingVertical: 15, borderRadius: 10, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  downloadButton: { backgroundColor: '#2563eb', paddingVertical: 10, borderRadius: 8, marginBottom: 10, alignItems: 'center' },
  downloadButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  noAnswerText: { fontSize: 13, color: '#9ca3af', fontStyle: 'italic', marginBottom: 10 }
});