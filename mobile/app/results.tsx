import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import api from '../utils/api';

type Subject = { _id: string; name: string };
type SchoolClass = { _id: string; name: string };
type Exam = { _id: string; title?: string; subject?: Subject; schoolClass?: SchoolClass; maxMarks?: number; passMark?: number; };
type Student = { _id: string; name: string };
type Mark = { _id: string; exam: Exam; student: Student; score: number; comments?: string; published: boolean; };

export default function MarksScreen() {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadMarks = async () => {
    try {
      setError('');
      const response = await api.get('/marks');
      
      setMarks(response.data?.marks ?? []);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Failed to load marks.');
      setMarks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadMarks(); }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>;
  }

  if (error) {
    return <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Results</Text>
      <FlatList
        data={marks}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadMarks(); }} />}
        contentContainerStyle={marks.length === 0 ? styles.center : styles.list}  
        ListEmptyComponent={<Text style={styles.empty}>No marks available yet.</Text>}
        renderItem={({ item }) => {
          const maxMarks = item.exam?.maxMarks ?? 100;
          const passMark = item.exam?.passMark ?? 50;
          const passed = item.score >= passMark;

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.title}>{item.exam?.subject?.name ?? 'Assigned Exam'}</Text>
                <Text style={[styles.statusBadge, { backgroundColor: passed ? '#16a34a' : '#dc2626' }]}>
                  {passed ? 'PASS' : 'FAIL'}
                </Text>
              </View>
              <Text style={styles.meta}>Exam: {item.exam?.title ?? '-'}</Text>
              <Text style={styles.meta}>Class: {item.exam?.schoolClass?.name ?? '-'}</Text>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreText}>Score: {item.score} / {maxMarks}</Text>
                <Text style={styles.passMarkText}>Passing: {passMark}</Text>
              </View>
              {item.comments ? (
                <View style={styles.commentsBox}>
                  <Text style={styles.commentsLabel}>Teacher&apos;s Comment:</Text>
                  <Text style={styles.commentsText}>{item.comments}</Text>
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { fontSize: 20, fontWeight: 'bold', marginHorizontal: 20, marginTop: 30, marginBottom: 15, color: '#1f2937' },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 15, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#007AFF' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '700', color: '#111827' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 'bold', overflow: 'hidden' },
  meta: { fontSize: 14, color: '#4b5563', marginBottom: 4 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  scoreText: { fontSize: 16, fontWeight: '700', color: '#1d4ed8' },
  passMarkText: { fontSize: 13, color: '#6b7280' },
  commentsBox: { marginTop: 12, backgroundColor: '#f9fafb', padding: 10, borderRadius: 6 },
  commentsLabel: { fontSize: 12, fontWeight: 'bold', color: '#374151', marginBottom: 2 },
  commentsText: { fontSize: 13, color: '#4b5563', fontStyle: 'italic' },
  errorText: { color: '#ef4444', fontSize: 16, textAlign: 'center' },
  empty: { color: '#6b7280', fontSize: 15, textAlign: 'center' },
});

