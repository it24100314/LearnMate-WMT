import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, Alert } from 'react-native';
import * as Storage from '../utils/storage';
import { useRouter } from 'expo-router';
import api from '../utils/api';

type SchoolClass = { _id: string; name: string; description?: string };

export default function ClassesScreen() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadClasses = async () => {
    try {
      const userId = await Storage.getItemAsync('userId');
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
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Classes</Text>

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
                <Text style={styles.btnText}>✅ Mark Attendance</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnAlt]}
                onPress={() => router.push({ pathname: '/enter-marks' as any, params: { classId: item._id, className: item.name } })}
              >
                <Text style={styles.btnTextAlt}>📊 Enter Marks</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', flex: 1 },
  descText: { fontSize: 14, color: '#4b5563', marginBottom: 15 },
  empty: { color: '#6b7280', fontSize: 15, textAlign: 'center' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, backgroundColor: '#EFF6FF', paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#BFDBFE' },
  actionBtnAlt: { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' },
  btnText: { color: '#1D4ED8', fontWeight: 'bold', fontSize: 14 },
  btnTextAlt: { color: '#374151', fontWeight: 'bold', fontSize: 14 }
});

