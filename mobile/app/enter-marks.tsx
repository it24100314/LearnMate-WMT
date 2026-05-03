import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, TextInput, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import api from '../utils/api';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { downloadAndShareApiFile } from '../utils/download';

type NamedItem = { _id: string; name: string };
type Student = { _id: string; name: string; username: string };
type Exam = { _id: string; title: string; maxMarks: number; subject?: NamedItem };
type AnswerSheet = {
  _id: string;
  exam: string;
  student: { _id: string; name: string };
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
      const reviewRes = await api.get(`/exams/review-answers/${examId}`);
      const answerSheets = reviewRes.data?.answerSheets || [];
      const markMap = reviewRes.data?.markMap || {};

      const submissionsMap: Record<string, AnswerSheet> = {};
      if (Array.isArray(answerSheets)) {
        answerSheets.forEach((sheet: AnswerSheet) => {
          if (sheet.student?._id) {
            submissionsMap[String(sheet.student._id)] = sheet;
          }
        });
      }

      const prefilledMarks: Record<string, { score: string, comments: string }> = {};
      Object.keys(markMap).forEach(studentId => {
        prefilledMarks[studentId] = {
          score: markMap[studentId].score !== undefined && markMap[studentId].score !== null ? String(markMap[studentId].score) : '',
          comments: markMap[studentId].comments || ''
        };
      });

      setSubmissions(submissionsMap);
      setMarksData(prefilledMarks);
    } catch (err: any) {
      console.error('Error fetching submissions:', err?.response?.status, err?.message);
      setSubmissions({});
      setMarksData({});
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
    return <View style={styles.center}><ActivityIndicator size="large" color="#3f51b5" /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.header}>Enter Marks</Text>
        <Text style={styles.heroText}>Choose class and exam, then review submissions and submit marks.</Text>
      </View>

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
        <ActivityIndicator size="small" color="#3f51b5" style={{ marginTop: 20 }} />
      ) : (
        <View style={styles.studentsWrap}>
          {selectedClassId && students.length === 0 ? (
            <Text style={styles.noDataText}>No students</Text>
          ) : null}

          {!selectedClassId ? (
            <Text style={styles.noDataText}>Select a class to begin</Text>
          ) : null}

          {selectedClassId ? (
            <Text style={styles.selectionSummary}>Students for selected class</Text>
          ) : null}

          {selectedClassId ? students.map((item) => {
            const submission = submissions[item._id];
            return (
              <View key={item._id} style={styles.studentCard}>
                <Text style={styles.studentName}>{item.name} ({item.username})</Text>

                {submission && submission.filePath && (
                  <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={() => downloadAnswerSheet(item, submission)}
                    disabled={downloadingId === item._id}
                  >
                    <Ionicons name="download-outline" size={18} color="#ffffff" />
                    <Text style={styles.downloadButtonText}>
                      {downloadingId === item._id ? 'Downloading...' : 'Download Answer Sheet'}
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
                    placeholderTextColor="#8a94a6"
                    keyboardType="numeric"
                    value={marksData[item._id]?.score || ''}
                    onChangeText={(val) => handleScoreChange(item._id, val)}
                    selectionColor="#3f51b5"
                  />
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Comments"
                    placeholderTextColor="#8a94a6"
                    value={marksData[item._id]?.comments || ''}
                    onChangeText={(val) => handleCommentChange(item._id, val)}
                    selectionColor="#3f51b5"
                  />
                </View>
              </View>
            );
          }) : null}
        </View>
      )}

      {selectedClassId && (
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={submitMarks}
          disabled={submitting}
        >
          <Ionicons name="save-outline" size={18} color="#ffffff" />
          <Text style={styles.submitText}>{submitting ? 'Saving...' : 'Save All Marks'}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 28 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
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
  header: { fontSize: 22, fontWeight: '800', color: '#1f2937' },
  heroText: { marginTop: 6, color: '#64748b', lineHeight: 20, fontSize: 14 },
  selectionArea: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 18,
    marginBottom: 14,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#edf0f5',
  },
  label: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 8, marginTop: 8 },
  chipsRow: { flexDirection: 'row', marginBottom: 10 },
  chip: { paddingHorizontal: 15, paddingVertical: 9, borderRadius: 999, backgroundColor: '#f8f9fa', marginRight: 10, borderWidth: 1, borderColor: '#d5dbe5' },
  chipActive: { backgroundColor: '#3f51b5', borderColor: '#3f51b5' },
  chipText: { color: '#334155', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  noDataText: { color: '#8a94a6', fontStyle: 'italic', paddingVertical: 8, textAlign: 'center', flex: 1 },
  studentsWrap: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#edf0f5',
  },
  studentCard: { backgroundColor: '#ffffff', padding: 15, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#edf0f5' },
  studentName: { fontSize: 15, fontWeight: '700', marginBottom: 10, color: '#1f2937' },
  inputRow: { flexDirection: 'row', gap: 10 },
  scoreInput: { borderWidth: 1, borderColor: '#d5dbe5', borderRadius: 14, padding: 10, width: 84, fontSize: 15, textAlign: 'center', backgroundColor: '#ffffff', color: '#1f2937' },
  commentInput: { borderWidth: 1, borderColor: '#d5dbe5', borderRadius: 14, padding: 10, flex: 1, fontSize: 14, backgroundColor: '#ffffff', color: '#1f2937' },
  submitBtn: {
    backgroundColor: '#3f51b5',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  submitText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  downloadButton: {
    backgroundColor: '#3f51b5',
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  downloadButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  noAnswerText: { fontSize: 13, color: '#8a94a6', fontStyle: 'italic', marginBottom: 10 },
  selectionSummary: { color: '#334155', fontWeight: '700', marginBottom: 10 },
});