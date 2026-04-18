import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { downloadAndShareApiFile } from '../utils/download';

type Student = {
  _id: string;
  name: string;
  username: string;
};

type AnswerSheet = {
  _id: string;
  exam: string;
  student: Student;
  filePath?: string;
  submittedAt?: string;
  isLate?: boolean;
  status: string;
  score?: number;
  comments?: string;
};

type Exam = {
  _id: string;
  title: string;
  subject?: { _id: string; name: string };
  schoolClass?: { _id: string; name: string };
  maxMarks: number;
};

type GradingData = {
  [studentId: string]: {
    marks: string;
    comments: string;
  };
};

export default function GradeSubmissionsScreen() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const router = useRouter();

  const [exam, setExam] = useState<Exam | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, AnswerSheet>>({});
  const [gradingData, setGradingData] = useState<GradingData>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (examId) {
      loadExamAndSubmissions();
    }
  }, [examId]);

  const loadExamAndSubmissions = async () => {
    try {
      // Get exam details and submissions
      const examRes = await api.get(`/exams/${examId}`);
      const exam = examRes.data?.exam;
      setExam(exam);

      // Get all info (students, submissions) from review endpoint
      const reviewRes = await api.get(`/exams/review/${examId}`);
      const { students, answerSheets, existingMarks } = reviewRes.data;

      setStudents(students || []);

      // Build submissions map and initialize grading data
      const submissionsMap: Record<string, AnswerSheet> = {};
      const gradingMap: GradingData = {};

      answerSheets?.forEach((sheet: AnswerSheet) => {
        if (sheet.student?._id) {
          submissionsMap[sheet.student._id] = sheet;
        }
      });

      setSubmissions(submissionsMap);

      // Populate grading data with existing marks if any
      students?.forEach((student: Student) => {
        const existingMark = existingMarks?.find((m: any) => m.student?._id === student._id);
        gradingMap[student._id] = {
          marks: existingMark?.score?.toString() || '',
          comments: existingMark?.comments || '',
        };
      });

      setGradingData(gradingMap);
    } catch (error: any) {
      console.error('Error loading exam:', error);
      Alert.alert('Error', 'Failed to load exam details');
    } finally {
      setLoading(false);
    }
  };

  const downloadSubmission = async (student: Student, answerSheet: AnswerSheet) => {
    try {
      setDownloadingId(student._id);
      const subject = exam?.subject?.name || 'subject';
      const fileName = `${student.name}_${subject}_${exam?.title || 'exam'}.pdf`;

      const downloadResult = await downloadAndShareApiFile({
        endpoint: `/exams/download-answer/${answerSheet._id}`,
        fileName,
        dialogTitle: 'Open or share answer sheet',
      });

      if (!downloadResult.shared) {
        Alert.alert('Downloaded', `File saved`);
      }
    } catch (error: any) {
      Alert.alert('Download Failed', error?.message || 'Unable to download submission');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleMarkChange = (studentId: string, marks: string) => {
    setGradingData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        marks,
      },
    }));
  };

  const handleCommentChange = (studentId: string, comments: string) => {
    setGradingData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        comments,
      },
    }));
  };

  const submitGrades = async () => {
    if (!examId || !exam) {
      Alert.alert('Error', 'Exam information missing');
      return;
    }

    // Build payload
    const grades: Record<string, any> = {};
    students.forEach((student) => {
      const data = gradingData[student._id];
      if (data?.marks && !Number.isNaN(Number(data.marks))) {
        grades[student._id] = {
          score: Number(data.marks),
          comments: data.comments || null,
        };
      }
    });

    if (Object.keys(grades).length === 0) {
      Alert.alert('Validation', 'Please enter marks for at least one student');
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/exams/grade/${examId}`, { grades });
      Alert.alert('Success', 'Grades submitted successfully!');
      router.back();
    } catch (error: any) {
      Alert.alert('Submission Failed', error?.response?.data?.message || 'Failed to submit grades');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3f51b5" />
      </View>
    );
  }

  if (!exam || students.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Exam or student data not available</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{exam.title}</Text>
        <Text style={styles.headerMeta}>Subject: {exam.subject?.name || '-'}</Text>
        <Text style={styles.headerMeta}>Class: {exam.schoolClass?.name || '-'}</Text>
        <Text style={styles.headerMeta}>Max Marks: {exam.maxMarks}</Text>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsBox}>
        <View style={styles.inlineTitle}>
          <Ionicons name="information-circle-outline" size={18} color="#3f51b5" />
          <Text style={styles.instructionsTitle}>Grading Instructions</Text>
        </View>
        <Text style={styles.instructionsText}>
          Review each student's submission. Enter marks (0-{exam.maxMarks}) and optional comments. Click "Submit Grades"
          when complete.
        </Text>
      </View>

      {/* Students List */}
      <View style={styles.rosterSection}>
        <Text style={styles.sectionTitle}>Student Submissions ({students.length})</Text>

        {students.map((student, index) => {
          const submission = submissions[student._id];
          const isSubmitted = !!submission;
          const isLate = submission?.isLate;
          const currentMarks = gradingData[student._id];

          return (
            <View key={student._id} style={styles.studentCard}>
              {/* Student Info */}
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{index + 1}. {student.name}</Text>
                <Text style={styles.studentUsername}>@{student.username}</Text>
              </View>

              {/* Submission Status */}
              {isSubmitted ? (
                <View style={[styles.statusBadge, isLate && styles.statusBadgeLate]}>
                  <Text style={[styles.statusText, isLate && styles.statusTextLate]}>
                    ✓ {isLate ? 'Submitted (LATE)' : 'Submitted'}
                  </Text>
                  {submission.submittedAt && (
                    <Text style={styles.statusTime}>
                      {new Date(submission.submittedAt).toLocaleString()}
                    </Text>
                  )}
                </View>
              ) : (
                <View style={styles.statusBadgeEmpty}>
                  <Text style={styles.statusTextEmpty}>✗ Not Submitted</Text>
                </View>
              )}

              {/* Download Button (if submitted) */}
              {isSubmitted && submission.filePath && (
                <TouchableOpacity
                  style={styles.downloadBtn}
                  onPress={() => downloadSubmission(student, submission)}
                  disabled={downloadingId === student._id}
                >
                  <Ionicons name="download-outline" size={16} color="#3f51b5" />
                  <Text style={styles.downloadBtnText}>
                    {downloadingId === student._id ? 'Downloading...' : `${student.name}_${exam.subject?.name || 'subject'}_${exam.title}.pdf`}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Grading Form */}
              <View style={styles.gradingForm}>
                <Text style={styles.gradingLabel}>Marks (0-{exam.maxMarks})</Text>
                <TextInput
                  style={styles.marksInput}
                  placeholder="Enter marks"
                  keyboardType="numeric"
                  value={currentMarks?.marks || ''}
                  onChangeText={(value) => handleMarkChange(student._id, value)}
                  editable={!submitting}
                />

                <Text style={[styles.gradingLabel, { marginTop: 10 }]}>Comments (Optional)</Text>
                <TextInput
                  style={[styles.commentsInput]}
                  placeholder="Enter feedback or comments"
                  multiline
                  numberOfLines={3}
                  value={currentMarks?.comments || ''}
                  onChangeText={(value) => handleCommentChange(student._id, value)}
                  editable={!submitting}
                />
              </View>

              {/* Divider */}
              {index < students.length - 1 && <View style={styles.divider} />}
            </View>
          );
        })}
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={submitGrades}
        disabled={submitting}
      >
        <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
        <Text style={styles.submitBtnText}>{submitting ? 'Submitting...' : 'Submit All Grades'}</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 8,
  },
  headerMeta: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 3,
  },
  instructionsBox: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#edf0f5',
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  inlineTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3f51b5',
  },
  instructionsText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  rosterSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  studentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#edf0f5',
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  studentInfo: {
    marginBottom: 8,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
  },
  studentUsername: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#ecfdf5',
    borderLeftWidth: 3,
    borderLeftColor: '#16a34a',
    padding: 8,
    borderRadius: 10,
    marginBottom: 8,
  },
  statusBadgeLate: {
    backgroundColor: '#fef2f2',
    borderLeftColor: '#ff5252',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },
  statusTextLate: {
    color: '#ff5252',
  },
  statusTime: {
    fontSize: 11,
    color: '#166534',
    marginTop: 2,
  },
  statusBadgeEmpty: {
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 3,
    borderLeftColor: '#94a3b8',
    padding: 8,
    borderRadius: 10,
    marginBottom: 8,
  },
  statusTextEmpty: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  downloadBtn: {
    backgroundColor: '#edf2ff',
    borderWidth: 1,
    borderColor: '#cfd8ff',
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  downloadBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3f51b5',
  },
  gradingForm: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  gradingLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  marksInput: {
    borderWidth: 1,
    borderColor: '#d5dbe5',
    borderRadius: 12,
    padding: 8,
    fontSize: 14,
    backgroundColor: '#ffffff',
    color: '#1f2937',
  },
  commentsInput: {
    borderWidth: 1,
    borderColor: '#d5dbe5',
    borderRadius: 12,
    padding: 8,
    fontSize: 14,
    backgroundColor: '#ffffff',
    color: '#1f2937',
    height: 60,
    textAlignVertical: 'top',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginTop: 12,
  },
  submitBtn: {
    marginHorizontal: 16,
    backgroundColor: '#3f51b5',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#3f51b5',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  errorText: {
    color: '#ff5252',
    fontSize: 16,
    marginBottom: 10,
  },
});
