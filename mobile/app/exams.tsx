import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import api from '../utils/api';
import { downloadAndShareApiFile } from '../utils/download';

type Subject = { _id: string; name: string };
type SchoolClass = { _id: string; name: string };
type AnswerSheet = {
  _id: string;
  exam: string;
  student: string;
  submittedAt: string;
  isLate: boolean;
  status: string;
  score?: number;
  comments?: string;
};
type Exam = {
  _id: string;
  title: string;
  additionalInstructions?: string;
  deadline: string;
  passMark: number;
  maxMarks: number;
  subject?: Subject;
  schoolClass?: SchoolClass;
  filePath?: string;
};

export default function ExamsScreen() {
  const router = useRouter();
  const [role, setRole] = useState('');
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, AnswerSheet>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingExamId, setUploadingExamId] = useState<string | null>(null);
  const [downloadingExamId, setDownloadingExamId] = useState<string | null>(null);
  const [downloadingAnswerId, setDownloadingAnswerId] = useState<string | null>(null);
  const [deletingAnswerId, setDeletingAnswerId] = useState<string | null>(null);

  const loadExams = async () => {
    try {
      const savedRole = await SecureStore.getItemAsync('userRole');
      setRole(savedRole || '');

      const response = await api.get('/exams/list');
      const examsData = response.data?.exams ?? [];
      setExams(examsData);

      // If student, load their submissions
      if (savedRole === 'STUDENT' && examsData.length > 0) {
        const submissionsMap: Record<string, AnswerSheet> = {};
        for (const exam of examsData) {
          try {
            const subRes = await api.get(`/exams/my-submissions/${exam._id}`);
            if (subRes.data?.answerSheet) {
              submissionsMap[exam._id] = subRes.data.answerSheet;
            }
          } catch {
            // No submission yet
          }
        }
        setSubmissions(submissionsMap);
      }
    } catch (error) {
      console.error(error);
      setExams([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const calculateDeadlineStatus = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffMs = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

    if (diffMs < 0) {
      return { text: 'Deadline Passed', isOverdue: true, color: '#DC2626' };
    }
    if (diffDays > 1) {
      return { text: `Due in ${diffDays} days`, isOverdue: false, color: '#059669' };
    }
    if (diffHours > 0) {
      return { text: `Due in ${diffHours} hours`, isOverdue: false, color: '#D97706' };
    }
    return { text: 'Due Today', isOverdue: false, color: '#D97706' };
  };

  const uploadAnswer = async (examId: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: ['application/pdf'],
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      setUploadingExamId(examId);
      const file = result.assets[0];

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name || 'answer.pdf',
        type: file.mimeType || 'application/pdf',
      } as unknown as Blob);

      const response = await api.post(`/exams/upload-answer/${examId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data?.answerSheet) {
        setSubmissions((prev) => ({
          ...prev,
          [examId]: response.data.answerSheet,
        }));
      }

      Alert.alert('Success', 'Answer sheet uploaded successfully!');
    } catch (error: any) {
      Alert.alert('Upload Failed', error?.response?.data?.message || 'Failed to upload answer sheet');
    } finally {
      setUploadingExamId(null);
    }
  };

  const downloadAnswerSheet = async (submission: AnswerSheet) => {
    try {
      setDownloadingAnswerId(submission._id);
      const fileName = `answer_sheet_${submission._id}.pdf`;

      const downloadResult = await downloadAndShareApiFile({
        endpoint: `/exams/download-answer/${submission._id}`,
        fileName,
        dialogTitle: 'Open or share answer sheet',
      });

      if (!downloadResult.shared) {
        Alert.alert('Downloaded', `Answer sheet saved`);
      }
    } catch (error: any) {
      Alert.alert('Download Failed', error?.message || 'Unable to download answer sheet');
    } finally {
      setDownloadingAnswerId(null);
    }
  };

  const deleteAnswerSheet = async (examId: string, submissionId: string) => {
    Alert.alert(
      'Delete Answer Sheet',
      'Are you sure you want to delete this answer sheet? You can upload a new one.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              setDeletingAnswerId(submissionId);
              await api.delete(`/exams/delete-answer/${submissionId}`);
              
              setSubmissions((prev) => {
                const updated = { ...prev };
                delete updated[examId];
                return updated;
              });
              
              Alert.alert('Success', 'Answer sheet deleted. You can upload a new one.');
            } catch (error: any) {
              Alert.alert('Delete Failed', error?.response?.data?.message || 'Failed to delete answer sheet');
            } finally {
              setDeletingAnswerId(null);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const downloadExamFile = async (exam: Exam) => {
    try {
      setDownloadingExamId(exam._id);
      const titleSlug = exam.title && exam.title.trim() ? exam.title.trim() : `exam_${exam._id}`;
      const fileName = `${titleSlug}.pdf`;

      const downloadResult = await downloadAndShareApiFile({
        endpoint: `/exams/download/${exam._id}`,
        fileName,
        dialogTitle: 'Open or share exam file',
      });

      if (!downloadResult.shared) {
        Alert.alert('Downloaded', `Exam saved to ${downloadResult.uri}`);
      }
    } catch (error: any) {
      Alert.alert('Download Failed', error?.message || 'Unable to download exam file');
    } finally {
      setDownloadingExamId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: '#f9fafb', flex: 1 }}
      data={exams}
      keyExtractor={(item) => item._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadExams(); }} />}
      contentContainerStyle={exams.length === 0 ? styles.center : styles.list}
      ListEmptyComponent={<Text style={styles.empty}>No exams found.</Text>}
      renderItem={({ item }) => {
        const deadlineStatus = calculateDeadlineStatus(item.deadline);
        const submission = submissions[item._id];
        const isLate = submission?.isLate;

        return (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>Subject: {item.subject?.name || '-'}</Text>
            <Text style={styles.meta}>Class: {item.schoolClass?.name || '-'}</Text>
            <Text style={[styles.meta, { color: deadlineStatus.color, fontWeight: '600', marginTop: 6 }]}>
              ⏰ {deadlineStatus.text}
            </Text>
            <Text style={styles.meta}>Deadline: {new Date(item.deadline).toLocaleString()}</Text>
            <Text style={styles.score}>Max Marks: {item.maxMarks} | Pass: {item.passMark}</Text>

            {item.additionalInstructions && (
              <Text style={styles.instructions}>📝 {item.additionalInstructions}</Text>
            )}

            {submission && (
              <View style={[styles.submissionStatus, isLate && styles.submissionStatusLate]}>
                <Text style={[styles.submissionStatusText, isLate && styles.submissionStatusTextLate]}>
                  ✓ Submitted {isLate ? '(LATE)' : 'On Time'}
                </Text>
                {submission.score !== undefined && (
                  <Text style={styles.submissionGrade}>
                    Score: {submission.score}/{item.maxMarks}
                  </Text>
                )}
                {submission.comments && (
                  <Text style={styles.submissionComments}>Comment: {submission.comments}</Text>
                )}

                {/* Answer Sheet File Display */}
                {submission.filePath && (
                  <View style={styles.answerSheetFile}>
                    <Text style={styles.answerSheetLabel}>📄 Your Answer Sheet</Text>
                    
                    <View style={styles.buttonRow}>
                      {/* Download Button */}
                      <TouchableOpacity
                        style={[styles.fileButton, styles.downloadBtn]}
                        onPress={() => downloadAnswerSheet(submission)}
                        disabled={downloadingAnswerId === submission._id}
                      >
                        <Text style={styles.fileButtonText}>📥</Text>
                      </TouchableOpacity>

                      {/* Delete Button (only if deadline hasn't passed) */}
                      {!calculateDeadlineStatus(item.deadline).isOverdue && (
                        <TouchableOpacity
                          style={[styles.fileButton, styles.deleteBtn]}
                          onPress={() => deleteAnswerSheet(item._id, submission._id)}
                          disabled={deletingAnswerId === submission._id}
                        >
                          <Text style={styles.fileButtonText}>🗑️</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}

            {item.filePath ? (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => downloadExamFile(item)}
                disabled={downloadingExamId === item._id}
              >
                <Text style={styles.secondaryButtonText}>
                  {downloadingExamId === item._id ? 'Downloading...' : '📥 Download Exam PDF'}
                </Text>
              </TouchableOpacity>
            ) : null}

            {role === 'STUDENT' && !submission?.filePath && (
              <TouchableOpacity
                style={[styles.secondaryButton, styles.uploadButton]}
                onPress={() => uploadAnswer(item._id)}
                disabled={uploadingExamId === item._id}
              >
                <Text style={styles.uploadButtonText}>
                  {uploadingExamId === item._id ? 'Uploading...' : '📤 Upload Answer Sheet'}
                </Text>
              </TouchableOpacity>
            )}

            {role === 'TEACHER' && (
              <TouchableOpacity
                style={styles.gradeButton}
                onPress={() => router.push({ pathname: '/grade-submissions', params: { examId: item._id } })}
              >
                <Text style={styles.gradeButtonText}>📋 Grade Submissions</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  list: {
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  meta: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 3,
  },
  score: {
    marginTop: 6,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  instructions: {
    marginTop: 6,
    fontSize: 13,
    color: '#374151',
    fontStyle: 'italic',
  },
  submissionStatus: {
    marginTop: 10,
    backgroundColor: '#ECFDF5',
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
    padding: 10,
    borderRadius: 6,
  },
  submissionStatusLate: {
    backgroundColor: '#FEF2F2',
    borderLeftColor: '#DC2626',
  },
  submissionStatusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  submissionStatusTextLate: {
    color: '#DC2626',
  },
  submissionGrade: {
    fontSize: 12,
    color: '#047857',
    marginTop: 4,
    fontWeight: '600',
  },
  submissionComments: {
    fontSize: 12,
    color: '#4b5563',
    marginTop: 4,
  },
  button: {
    marginTop: 10,
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  buttonSecondary: {
    backgroundColor: '#TRANSPARENT',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  buttonSecondaryText: {
    color: '#059669',
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 8,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  secondaryButtonText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  gradeButton: {
    marginTop: 10,
    backgroundColor: '#6366F1',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  gradeButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  answerSheetFile: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F0F4FF',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
  },
  answerSheetLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fileButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtn: {
    backgroundColor: '#2563eb',
  },
  deleteBtn: {
    backgroundColor: '#EF4444',
  },
  fileButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  uploadButton: {
    marginTop: 8,
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  empty: {
    color: '#6b7280',
    fontSize: 15,
  },
});
