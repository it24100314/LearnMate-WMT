import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import api from '../utils/api';
import { Ionicons } from '@expo/vector-icons';

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
      const userId = await SecureStore.getItemAsync('userId');
      const role = await SecureStore.getItemAsync('userRole');
      
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
    return <View style={styles.center}><ActivityIndicator size="large" color="#3f51b5" /></View>;
  }

  if (error) {
    return <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={marks}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={
          <View style={styles.heroCard}>
            <Text style={styles.header}>My Results</Text>
            <Text style={styles.heroText}>Review your exam performance, pass status, and teacher feedback.</Text>
          </View>
        }
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
                <View style={styles.scoreInline}>
                  <Ionicons name="bar-chart-outline" size={16} color="#3f51b5" />
                  <Text style={styles.scoreText}>Score: {item.score} / {maxMarks}</Text>
                </View>
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
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
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
  heroText: { marginTop: 6, color: '#64748b', fontSize: 14, lineHeight: 20 },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#edf0f5',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, color: '#fff', fontSize: 11, fontWeight: '700', overflow: 'hidden' },
  meta: { fontSize: 13, color: '#475569', marginBottom: 4 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  scoreInline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scoreText: { fontSize: 15, fontWeight: '700', color: '#3f51b5' },
  passMarkText: { fontSize: 12, color: '#64748b' },
  commentsBox: { marginTop: 12, backgroundColor: '#f8f9fa', padding: 10, borderRadius: 10 },
  commentsLabel: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 2 },
  commentsText: { fontSize: 13, color: '#475569', fontStyle: 'italic' },
  errorText: { color: '#ff5252', fontSize: 16, textAlign: 'center' },
  empty: { color: '#64748b', fontSize: 15, textAlign: 'center' },
});
