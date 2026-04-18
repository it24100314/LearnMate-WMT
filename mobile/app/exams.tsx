import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
  submissionCount?: number;
  totalStudents?: number;
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

      console.log('Uploading answer sheet:', file.name, 'for exam:', examId);
      const response = await api.post(`/exams/upload-answer/${examId}`, formData);

      if (response.data?.answerSheet) {
        setSubmissions((prev) => ({
          ...prev,
          [examId]: response.data.answerSheet,
        }));
      }

      Alert.alert('Success', 'Answer sheet uploaded successfully!');
    } catch (error: any) {
      console.error('Answer upload error:', error?.response?.status, error?.response?.data, error?.message);
      Alert.alert('Upload Failed', error?.response?.data?.message || error?.message || 'Failed to upload answer sheet');
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
              console.log('Deleting answer sheet:', submissionId);
              
              await api.delete(`/exams/delete-answer/${submissionId}`);
              
              console.log('Delete successful, removing from state');
              setSubmissions((prev) => {
                const updated = { ...prev };
                delete updated[examId];
                return updated;
              });
              
              Alert.alert('Success', 'Answer sheet deleted. You can upload a new one.');
            } catch (error: any) {
              console.error('Delete error:', error?.response?.status, error?.response?.data?.message, error?.message);
              Alert.alert('Delete Failed', error?.response?.data?.message || error?.message || 'Failed to delete answer sheet');
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
        Alert.alert('Downloaded', `Exam saved`);
      }
    } catch (error: any) {
      console.error('Exam download error:', error);
      Alert.alert('Download Failed', error?.message || 'Unable to download exam. Make sure the file was uploaded.');
    } finally {
      setDownloadingExamId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3f51b5" />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: '#f8f9fa', flex: 1 }}
      data={exams}
      keyExtractor={(item) => item._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadExams(); }} />}
      contentContainerStyle={exams.length === 0 ? styles.center : styles.list}
      ListEmptyComponent={<Text style={styles.empty}>No exams found.</Text>}
      renderItem={({ item }) => {
        const deadlineStatus = calculateDeadlineStatus(item.deadline);
        const submission = submissions[item._id];
        const isLate = submission?.isLate;
        const submissionCount = item.submissionCount;
        const totalStudents = item.totalStudents;

        return (
          <View style={styles.cardWrap}>
            <View style={[styles.statusBar, deadlineStatus.isOverdue && styles.statusBarLate]} />
            <View style={[styles.card, deadlineStatus.isOverdue && styles.cardLate]}>
              <View style={styles.cardHeader}>
                <Text style={styles.title}>{item.title}</Text>
                <View style={[styles.deadlineBadge, deadlineStatus.isOverdue ? styles.deadlineBadgeLate : styles.deadlineBadgeActive]}>
                  <Ionicons
                    name={deadlineStatus.isOverdue ? 'alert-circle-outline' : 'time-outline'}
                    size={14}
                    color={deadlineStatus.isOverdue ? '#ff5252' : '#3f51b5'}
                  />
                  <Text
                    style={[
                      styles.deadlineBadgeText,
                      deadlineStatus.isOverdue ? styles.deadlineBadgeTextLate : styles.deadlineBadgeTextActive,
                    ]}
                  >
                    {deadlineStatus.text}
                  </Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Ionicons name="book-outline" size={16} color="#64748b" />
                <Text style={styles.metaText}>Subject: {item.subject?.name || '-'}</Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="people-outline" size={16} color="#64748b" />
                <Text style={styles.metaText}>Class: {item.schoolClass?.name || '-'}</Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={16} color="#64748b" />
                <Text style={styles.metaText}>Deadline: {new Date(item.deadline).toLocaleString()}</Text>
              </View>

              <Text style={styles.score}>Max Marks: {item.maxMarks} | Pass: {item.passMark}</Text>

              {role === 'TEACHER' && (
                <View style={styles.teacherStatsCard}>
                  <Ionicons name="bar-chart-outline" size={16} color="#3f51b5" />
                  <Text style={styles.teacherStatsText}>
                    Submissions: {submissionCount ?? '--'}/{totalStudents ?? '--'}
                  </Text>
                </View>
              )}

              {item.additionalInstructions && (
                <View style={styles.instructionsCard}>
                  <Ionicons name="document-text-outline" size={14} color="#64748b" />
                  <Text style={styles.instructions}>{item.additionalInstructions}</Text>
                </View>
              )}

              {submission && (
                <View style={[styles.submissionStatus, isLate && styles.submissionStatusLate]}>
                  <Text style={[styles.submissionStatusText, isLate && styles.submissionStatusTextLate]}>
                    Submitted {isLate ? '(LATE)' : 'On Time'}
                  </Text>
                  {submission.score !== undefined && (
                    <Text style={styles.submissionGrade}>
                      Score: {submission.score}/{item.maxMarks}
                    </Text>
                  )}
                  {submission.comments && (
                    <Text style={styles.submissionComments}>Comment: {submission.comments}</Text>
                  )}

                  {submission.filePath && (
                    <View style={styles.answerSheetFile}>
                      <Text style={styles.answerSheetLabel}>Your Answer Sheet</Text>

                      <View style={styles.buttonRow}>
                        <TouchableOpacity
                          style={[styles.fileButton, styles.downloadBtn]}
                          onPress={() => downloadAnswerSheet(submission)}
                          disabled={downloadingAnswerId === submission._id}
                        >
                          <Ionicons name="download-outline" size={18} color="#ffffff" />
                        </TouchableOpacity>

                        {!calculateDeadlineStatus(item.deadline).isOverdue && (
                          <TouchableOpacity
                            style={[styles.fileButton, styles.deleteBtn]}
                            onPress={() => deleteAnswerSheet(item._id, submission._id)}
                            disabled={deletingAnswerId === submission._id}
                          >
                            <Ionicons name="trash-outline" size={18} color="#ffffff" />
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
                  <Ionicons name="download-outline" size={18} color="#3f51b5" />
                  <Text style={styles.secondaryButtonText}>
                    {downloadingExamId === item._id ? 'Downloading...' : 'Download Exam PDF'}
                  </Text>
                </TouchableOpacity>
              ) : null}

              {role === 'STUDENT' && !submission?.filePath && (
                <TouchableOpacity
                  style={[styles.secondaryButton, styles.uploadButton]}
                  onPress={() => uploadAnswer(item._id)}
                  disabled={uploadingExamId === item._id}
                >
                  <Ionicons name="cloud-upload-outline" size={18} color="#ffffff" />
                  <Text style={styles.uploadButtonText}>
                    {uploadingExamId === item._id ? 'Uploading...' : 'Upload Answer Sheet'}
                  </Text>
                </TouchableOpacity>
              )}

              {role === 'TEACHER' && (
                <TouchableOpacity
                  style={styles.gradeButton}
                  onPress={() => router.push({ pathname: '/grade-submissions', params: { examId: item._id } })}
                >
                  <Ionicons name="clipboard-outline" size={18} color="#ffffff" />
                  <Text style={styles.gradeButtonText}>Grade Submissions</Text>
                </TouchableOpacity>
              )}
            </View>
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
    backgroundColor: '#f8f9fa',
  },
  list: {
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  cardWrap: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  statusBar: {
    width: 6,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    backgroundColor: '#3f51b5',
  },
  statusBarLate: {
    backgroundColor: '#ff5252',
  },
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    padding: 16,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#edf0f5',
  },
  cardLate: {
    borderColor: '#ffe0e0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: '#1f2937',
  },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: '55%',
  },
  deadlineBadgeActive: {
    backgroundColor: '#edf1ff',
    borderColor: '#cfd8ff',
  },
  deadlineBadgeLate: {
    backgroundColor: '#ffeded',
    borderColor: '#ffd2d2',
  },
  deadlineBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deadlineBadgeTextActive: {
    color: '#3f51b5',
  },
  deadlineBadgeTextLate: {
    color: '#ff5252',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#475569',
  },
  score: {
    marginTop: 6,
    fontWeight: '700',
    color: '#3f51b5',
    marginBottom: 6,
  },
  teacherStatsCard: {
    marginTop: 6,
    backgroundColor: '#eff2ff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#dbe3ff',
  },
  teacherStatsText: {
    color: '#2e3a8c',
    fontSize: 13,
    fontWeight: '700',
  },
  instructionsCard: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
  },
  instructions: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  submissionStatus: {
    marginTop: 10,
    backgroundColor: '#ecfdf5',
    borderLeftWidth: 3,
    borderLeftColor: '#16a34a',
    padding: 10,
    borderRadius: 10,
  },
  submissionStatusLate: {
    backgroundColor: '#fef2f2',
    borderLeftColor: '#ff5252',
  },
  submissionStatusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803d',
  },
  submissionStatusTextLate: {
    color: '#ff5252',
  },
  submissionGrade: {
    fontSize: 12,
    color: '#166534',
    marginTop: 4,
    fontWeight: '600',
  },
  submissionComments: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
  },
  secondaryButton: {
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3f51b5',
    backgroundColor: '#f5f7ff',
  },
  secondaryButtonText: {
    color: '#3f51b5',
    fontWeight: '700',
    fontSize: 13,
  },
  gradeButton: {
    marginTop: 10,
    backgroundColor: '#3f51b5',
    borderRadius: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    alignItems: 'center',
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  gradeButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  answerSheetFile: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#edf2ff',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#3f51b5',
  },
  answerSheetLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2e3a8c',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fileButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtn: {
    backgroundColor: '#3f51b5',
  },
  deleteBtn: {
    backgroundColor: '#ff5252',
  },
  uploadButton: {
    marginTop: 8,
    backgroundColor: '#3f51b5',
    borderColor: '#3f51b5',
  },
  uploadButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  empty: {
    color: '#64748b',
    fontSize: 15,
  },
});
