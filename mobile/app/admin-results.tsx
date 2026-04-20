import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../utils/api';
import { handleApiError } from '../utils/auth';

type MarkData = {
  _id: string;
  student: { _id: string; name: string; username: string };
  exam: { _id: string; title: string; maxMarks: number; passMarks: number };
  marksObtained?: number;
  status: 'Pending' | 'Graded';
};

export default function AdminResultsScreen() {
  const router = useRouter();
  const { examId, examTitle } = useLocalSearchParams();
  
  const [marks, setMarks] = useState<MarkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [examMeta, setExamMeta] = useState({ maxMarks: 100, passMarks: 40 });

  useEffect(() => {
    if (examId) {
      fetchMarks();
    }
  }, [examId]);

  const fetchMarks = async () => {
    try {
      const res = await api.get(`/marks/exam/${examId}`);
      setMarks(res.data);
      if (res.data.length > 0 && res.data[0].exam) {
        setExamMeta({
          maxMarks: res.data[0].exam.maxMarks,
          passMarks: res.data[0].exam.passMarks,
        });
      }
    } catch (error) {
      handleApiError(error, router, 'Failed to load results');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMarks();
  };

  const getStatusColor = (status: string, marksObtained?: number, passMarks?: number) => {
    if (status === 'Pending') return '#cbd5e1'; // Gray
    if (marksObtained !== undefined && passMarks !== undefined) {
      return marksObtained >= passMarks ? '#4caf50' : '#ef4444'; 
    }
    return '#3f51b5';
  };

  const getStatusText = (status: string, marksObtained?: number, passMarks?: number) => {
    if (status === 'Pending') return 'Pending';
    if (marksObtained !== undefined && passMarks !== undefined) {
      return marksObtained >= passMarks ? 'Passed' : 'Failed';
    }
    return 'Graded';
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3f51b5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#3f51b5" />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Results Overview</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{examTitle || 'Exam Results'}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{marks.length}</Text>
          <Text style={styles.statLabel}>Submissions</Text>
        </View>
        <View style={styles.statBoxCenter}>
          <Text style={styles.statVal}>{marks.filter(m => m.status === 'Graded').length}</Text>
          <Text style={styles.statLabel}>Graded</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{Math.round((marks.filter(m => m.marksObtained !== undefined && m.marksObtained >= examMeta.passMarks).length / Math.max(1, marks.length)) * 100)}%</Text>
          <Text style={styles.statLabel}>Pass Rate</Text>
        </View>
      </View>

      <FlatList
        data={marks}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3f51b5']} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
             <Ionicons name="document-outline" size={48} color="#cbd5e1" />
             <Text style={styles.emptyText}>No submissions found for this exam.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const statColor = getStatusColor(item.status, item.marksObtained, examMeta.passMarks);
          const statText = getStatusText(item.status, item.marksObtained, examMeta.passMarks);

          return (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.student.name.charAt(0).toUpperCase()}</Text>
              </View>
              
              <View style={styles.studentInfo}>
                <Text style={styles.studentName} numberOfLines={1}>{item.student.name}</Text>
                <Text style={styles.studentUsername}>@{item.student.username}</Text>
              </View>

              <View style={styles.scoreArea}>
                <View style={[styles.statusBadge, { backgroundColor: statColor + '15' }]}>
                  <Text style={[styles.statusText, { color: statColor }]}>{statText}</Text>
                </View>
                {item.status === 'Graded' && (
                  <Text style={styles.scoreText}>
                    <Text style={styles.scoreHighlight}>{item.marksObtained}</Text> / {examMeta.maxMarks}
                  </Text>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
    zIndex: 10,
  },
  backBtn: {
    marginRight: 16,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#3f51b5',
    fontWeight: '600',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#3f51b5',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statBoxCenter: {
    flex: 1,
    alignItems: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#5c6bc0',
  },
  statVal: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    color: '#dbe2ff',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  listContent: {
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#edf0f5',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e8edff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#3f51b5',
    fontSize: 16,
    fontWeight: '800',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  studentUsername: {
    fontSize: 13,
    color: '#64748b',
  },
  scoreArea: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  scoreText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  scoreHighlight: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '800',
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: 14,
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '500',
  },
});