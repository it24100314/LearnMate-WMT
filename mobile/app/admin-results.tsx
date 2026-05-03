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
  score?: number;
  comments?: string;
  published?: boolean;
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
          const isGraded = item.score !== undefined && item.score !== null;
          const statColor = isGraded ? '#3f51b5' : '#cbd5e1';
          const statText = isGraded ? `${item.score} / ${examMeta.maxMarks}` : 'PENDING';

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
                <View style={[styles.statusBadge, { backgroundColor: isGraded ? '#e8edff' : '#f8f9fa' }]}>
                  <Text style={[styles.statusText, { color: statColor }]}>{statText}</Text>
                </View>
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