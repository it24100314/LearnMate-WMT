import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';

type SchoolClass = { _id: string; name: string; description?: string };

export default function ClassesScreen() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadClasses = async () => {
    try {
      const userId = await SecureStore.getItemAsync('userId');
      if (!userId) throw new Error('User not found');
      
      const response = await api.get(`/classes/teacher/${userId}`);
      setClasses(response.data || []);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'Failed to load assigned classes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3f51b5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.header}>My Classes</Text>
        <Text style={styles.heroText}>Open each class to mark attendance and submit marks.</Text>
      </View>

      <FlatList
        data={classes}
        keyExtractor={(item) => item._id}
        contentContainerStyle={classes.length === 0 ? styles.center : styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No classes assigned yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>{item.name}</Text>
            </View>
            <Text style={styles.descText}>{item.description || 'No description provided'}</Text>
            
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push({ pathname: '/mark-attendance' as any, params: { classId: item._id, className: item.name } })}
              >
                <Ionicons name="checkmark-done-outline" size={16} color="#ffffff" />
                <Text style={styles.btnText}>Mark Attendance</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnAlt]}
                onPress={() => router.push({ pathname: '/enter-marks' as any, params: { classId: item._id, className: item.name } })}
              >
                <Ionicons name="bar-chart-outline" size={16} color="#3f51b5" />
                <Text style={styles.btnTextAlt}>Enter Marks</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
    marginHorizontal: 16,
    marginTop: 20,
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 17, fontWeight: '700', color: '#1f2937', flex: 1 },
  descText: { fontSize: 13, color: '#475569', marginBottom: 15 },
  empty: { color: '#64748b', fontSize: 15, textAlign: 'center' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    backgroundColor: '#3f51b5',
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3f51b5',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  actionBtnAlt: { backgroundColor: '#edf2ff', borderColor: '#cfd8ff' },
  btnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  btnTextAlt: { color: '#3f51b5', fontWeight: '700', fontSize: 13 }
});
