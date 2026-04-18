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
};

export default function NotificationsScreen() {
  const [role, setRole] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingNotificationId, setDownloadingNotificationId] = useState<string | null>(null);

  const inboxTitle = useMemo(() => {
    if (role === 'STUDENT') return 'Student Inbox';
    if (role === 'TEACHER') return 'Teacher Inbox';
    if (role === 'ADMIN') return 'Admin Inbox';
    return 'Inbox';
  }, [role]);

  const loadData = async () => {
    try {
      const savedRole = await SecureStore.getItemAsync('userRole');
      setRole(savedRole || '');

      const listResponse = await api.get('/notifications/visible');
      setNotifications(listResponse.data?.notifications ?? []);
    } catch (error: any) {
      Alert.alert('Notifications', error?.response?.data?.message || 'Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const markRead = async (id: string) => {
    try {
      await api.post(`/notifications/mark-read/${id}`);
      setNotifications((prev) => prev.map((item) => (item._id === id ? { ...item, read: true } : item)));
    } catch {
      // Keep UX responsive even if mark-read fails.
    }
  };

  const downloadAttachment = async (item: NotificationItem) => {
    try {
      setDownloadingNotificationId(item._id);
      const fileName = item.fileName || `${item.title || 'notification'}_${item._id}.pdf`;

      const downloadResult = await downloadAndShareApiFile({
        endpoint: `/notifications/download/${item._id}`,
        fileName,
        dialogTitle: 'Open or share attachment',
      });

      if (!downloadResult.shared) {
        Alert.alert('Downloaded', `Attachment saved to ${downloadResult.uri}`);
      }
    } catch (error: any) {
      Alert.alert('Download Failed', error?.message || 'Unable to download attachment');
    } finally {
      setDownloadingNotificationId(null);
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
      data={notifications}
      keyExtractor={(item) => item._id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadData();
          }}
        />
      }
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Notifications</Text>
          <Text style={styles.heroText}>{inboxTitle} - tap a message to mark it as read.</Text>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>No notifications available.</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity style={[styles.notificationCard, !item.read && styles.unread]} onPress={() => markRead(item._id)}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationMessage}>{item.message}</Text>
          <Text style={styles.meta}>Date: {new Date(item.createdAt).toLocaleString()}</Text>
          {item.targetRole ? <Text style={styles.meta}>Role: {item.targetRole}</Text> : null}
          {item.targetClass?.name ? <Text style={styles.meta}>Class: {item.targetClass.name}</Text> : null}
          {item.fileName ? <Text style={styles.meta}>Attachment: {item.fileName}</Text> : null}
          {item.fileName ? (
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={() => downloadAttachment(item)}
              disabled={downloadingNotificationId === item._id}
            >
              <Ionicons name="download-outline" size={16} color="#3f51b5" />
              <Text style={styles.downloadButtonText}>
                {downloadingNotificationId === item._id ? 'Downloading...' : 'Download Attachment'}
              </Text>
            </TouchableOpacity>
          ) : null}
          {!item.read ? <Text style={styles.unreadText}>Tap to mark as read</Text> : null}
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 30,
    backgroundColor: '#f8f9fa',
    flexGrow: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
  },
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
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1f2937',
  },
  heroText: {
    marginTop: 6,
    color: '#64748b',
    lineHeight: 20,
    fontSize: 14,
  },
  notificationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#edf0f5',
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  unread: {
    borderColor: '#cfd8ff',
    backgroundColor: '#f5f7ff',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  notificationMessage: {
    color: '#475569',
    marginBottom: 8,
    lineHeight: 18,
  },
  meta: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  unreadText: {
    marginTop: 6,
    color: '#3f51b5',
    fontSize: 12,
    fontWeight: '600',
  },
  downloadButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#cfd8ff',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#edf2ff',
  },
  downloadButtonText: {
    color: '#3f51b5',
    fontWeight: '600',
    fontSize: 12,
  },
  empty: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 10,
  },
});
