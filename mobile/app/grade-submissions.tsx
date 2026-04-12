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
        <ActivityIndicator size="large" color="#2563eb" />
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
        <Text style={styles.instructionsTitle}>📋 Grading Instructions</Text>
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
                  <Text style={styles.downloadBtnText}>
                    {downloadingId === student._id ? 'Downloading...' : `📥 ${student.name}_${exam.subject?.name || 'subject'}_${exam.title}.pdf`}
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
        <Text style={styles.submitBtnText}>{submitting ? 'Submitting...' : '✓ Submit All Grades'}</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  headerMeta: {
    fontSize: 13,
    color: '#E0E7FF',
    marginBottom: 3,
  },
  instructionsBox: {
    backgroundColor: '#FEF3C7',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#D97706',
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
  },
  rosterSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  studentInfo: {
    marginBottom: 8,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  studentUsername: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#ECFDF5',
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  statusBadgeLate: {
    backgroundColor: '#FEF2F2',
    borderLeftColor: '#DC2626',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  statusTextLate: {
    color: '#DC2626',
  },
  statusTime: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  statusBadgeEmpty: {
    backgroundColor: '#F3F4F6',
    borderLeftWidth: 3,
    borderLeftColor: '#9CA3AF',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  statusTextEmpty: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  downloadBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  downloadBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E40AF',
  },
  gradingForm: {
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
  },
  gradingLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  marksInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  commentsInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    backgroundColor: '#fff',
    height: 60,
    textAlignVertical: 'top',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 12,
  },
  submitBtn: {
    marginHorizontal: 16,
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  errorText: {
    color: '#991B1B',
    fontSize: 16,
    marginBottom: 10,
  },
});
