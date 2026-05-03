import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { downloadAndShareApiFile } from '../utils/download';

type SchoolClass = { _id: string; name: string };

type NotificationItem = {
  _id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  targetRole?: string;
  targetClass?: SchoolClass;
  fileName?: string;
  createdBy?: { name: string; role: string };
};

export default function NotificationsScreen() {
  const [role, setRole] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const inboxTitle = useMemo(() => {
    if (role === 'STUDENT') return 'Student Portal';
    if (role === 'TEACHER') return 'Teacher Board';
    return 'Admin Feed';
  }, [role]);

  const loadData = async () => {
    try {
      const savedRole = await SecureStore.getItemAsync('userRole');
      setRole(savedRole || '');

      const response = await api.get('/notifications/visible');
      setNotifications(response.data?.notifications ?? []);
    } catch (error) {
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const markRead = async (id: string) => {
    try {
      await api.post(`/notifications/mark-read/${id}`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (e) {}
  };

  const downloadFile = async (item: NotificationItem) => {
    try {
      setDownloadingId(item._id);
      await downloadAndShareApiFile({
        endpoint: `/notifications/download/${item._id}`,
        fileName: item.fileName || 'attachment.pdf',
        dialogTitle: 'Download Attachment',
      });
    } catch (err) {
      Alert.alert('Error', 'Could not download file');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#4f46e5" /></View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={item => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{inboxTitle}</Text>
            <Text style={styles.headerSubtitle}>Stay updated with the latest campus announcements</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>No messages yet</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => markRead(item._id)}
            style={[styles.card, !item.read && styles.unreadCard]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.authorBadge}>
                <Ionicons name="person-circle-outline" size={20} color="#6366f1" />
                <Text style={styles.authorText}>{item.createdBy?.name || 'System'}</Text>
              </View>
              {!item.read && <View style={styles.dot} />}
            </View>

            <Text style={[styles.title, !item.read && { color: '#1e1b4b' }]}>{item.title}</Text>
            <Text style={styles.message} numberOfLines={3}>{item.message}</Text>
            
            <View style={styles.footer}>
              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={14} color="#94a3b8" />
                <Text style={styles.metaText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>

              {item.fileName ? (
                <TouchableOpacity 
                  onPress={() => downloadFile(item)}
                  style={styles.downloadBtn}
                  disabled={downloadingId === item._id}
                >
                  <Ionicons name="cloud-download-outline" size={18} color="#4f46e5" />
                  <Text style={styles.downloadText}>{downloadingId === item._id ? '...' : 'File'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20 },
  header: { marginBottom: 24 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#1e293b' },
  headerSubtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  unreadCard: {
    borderColor: '#e0e7ff',
    backgroundColor: '#f5f7ff',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  authorBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  authorText: { fontSize: 12, fontWeight: '700', color: '#6366f1' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366f1' },
  title: { fontSize: 18, fontWeight: '800', color: '#334155', marginBottom: 6 },
  message: { fontSize: 14, color: '#64748b', lineHeight: 20 },
  footer: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eef2ff', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10 },
  downloadText: { fontSize: 12, fontWeight: '700', color: '#4f46e5' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 16 },
});

