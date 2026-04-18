import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { downloadAndShareApiFile } from '../utils/download';

type SchoolClass = { _id: string; name: string };
type Subject = { _id: string; name: string };
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

type NotificationOptions = {
  roles: string[];
  prefillRoles: string[];
  schoolClasses: SchoolClass[];
  teacherSubjects: Subject[];
};

const asArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map((v) => String(v));
  return [String(value)];
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [role, setRole] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingNotificationId, setDownloadingNotificationId] = useState<string | null>(null);

  const [options, setOptions] = useState<NotificationOptions | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [attachment, setAttachment] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const canCreate = useMemo(() => role === 'TEACHER' || role === 'ADMIN', [role]);

  const toggleSelection = (value: string, list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (list.includes(value)) {
      setter(list.filter((item) => item !== value));
      return;
    }
    setter([...list, value]);
  };

  const loadData = async () => {
    try {
      const savedRole = await SecureStore.getItemAsync('userRole');
      const userRole = savedRole || '';
      setRole(userRole);

      // Use the new filtered endpoint for visible notifications
      // This ensures students only see their class/global notifications,
      // teachers only see teacher role notifications, etc.
      const listResponse = await api.get('/notifications/visible');
      setNotifications(listResponse.data?.notifications ?? []);

      if (userRole === 'TEACHER' || userRole === 'ADMIN') {
        const optionsResponse = await api.get('/notifications/options');
        const parsedOptions: NotificationOptions = {
          roles: asArray(optionsResponse.data?.roles),
          prefillRoles: asArray(optionsResponse.data?.prefillRoles),
          schoolClasses: optionsResponse.data?.schoolClasses ?? [],
          teacherSubjects: optionsResponse.data?.teacherSubjects ?? [],
        };
        setOptions(parsedOptions);
        setTargetRoles(parsedOptions.prefillRoles.length > 0 ? parsedOptions.prefillRoles : []);
      }
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
      // Ignore mark-read errors to keep UX responsive.
    }
  };

  const pickAttachment = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: ['application/pdf', 'image/*'],
    });

    if (!result.canceled && result.assets?.[0]) {
      setAttachment(result.assets[0]);
    }
  };

  const submitNotification = async () => {
    try {
      if (!title.trim() || !message.trim() || targetRoles.length === 0) {
        Alert.alert('Validation', 'Title, message, and at least one role are required.');
        return;
      }

      setSubmitting(true);

      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('message', message.trim());
      targetRoles.forEach((value) => formData.append('targetRoles', value));
      selectedClasses.forEach((value) => formData.append('selectedClasses', value));
      selectedSubjects.forEach((value) => formData.append('selectedSubjects', value));

      if (attachment) {
        formData.append('file', {
          uri: attachment.uri,
          name: attachment.name || 'attachment.pdf',
          type: attachment.mimeType || 'application/pdf',
        } as unknown as Blob);
      }

      await api.post('/notifications/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Success', 'Notification created successfully.');
      setTitle('');
      setMessage('');
      setSelectedClasses([]);
      setSelectedSubjects([]);
      setAttachment(null);
      await loadData();
    } catch (error: any) {
      Alert.alert('Create Failed', error?.response?.data?.message || 'Unable to create notification');
    } finally {
      setSubmitting(false);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Notifications</Text>
        <Text style={styles.heroText}>Send announcements and stay updated with class communication.</Text>
      </View>

      {canCreate && options ? (
        <View>
          <TouchableOpacity
            style={[styles.manageButton, { marginBottom: 12 }]}
            onPress={() => router.push('/manage-notifications')}
          >
            <Ionicons name="list-outline" size={18} color="#ffffff" />
            <Text style={styles.manageButtonText}>Manage Notifications</Text>
          </TouchableOpacity>

          <View style={styles.composeCard}>
          <Text style={styles.sectionTitle}>Create Notification</Text>

          <TextInput style={styles.input} placeholder="Title" placeholderTextColor="#8a94a6" value={title} onChangeText={setTitle} selectionColor="#3f51b5" />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Message"
            placeholderTextColor="#8a94a6"
            multiline
            value={message}
            onChangeText={setMessage}
            selectionColor="#3f51b5"
          />

          <Text style={styles.label}>Target Roles</Text>
          <View style={styles.chipWrap}>
            {options.roles
              .filter((item) => item !== 'ADMIN')
              .map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.chip, targetRoles.includes(item) && styles.chipSelected]}
                  onPress={() => toggleSelection(item, targetRoles, setTargetRoles)}
                >
                  <Text style={targetRoles.includes(item) ? styles.chipTextSelected : styles.chipText}>{item}</Text>
                </TouchableOpacity>
              ))}
          </View>

          <Text style={styles.label}>Classes (for students)</Text>
          <View style={styles.chipWrap}>
            {options.schoolClasses.map((item) => (
              <TouchableOpacity
                key={item._id}
                style={[styles.chip, selectedClasses.includes(item._id) && styles.chipSelected]}
                onPress={() => toggleSelection(item._id, selectedClasses, setSelectedClasses)}
              >
                <Text style={selectedClasses.includes(item._id) ? styles.chipTextSelected : styles.chipText}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Subjects (for students)</Text>
          <View style={styles.chipWrap}>
            {options.teacherSubjects.map((item) => (
              <TouchableOpacity
                key={item._id}
                style={[styles.chip, selectedSubjects.includes(item._id) && styles.chipSelected]}
                onPress={() => toggleSelection(item._id, selectedSubjects, setSelectedSubjects)}
              >
                <Text style={selectedSubjects.includes(item._id) ? styles.chipTextSelected : styles.chipText}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.attachmentButton} onPress={pickAttachment}>
            <Ionicons name="document-attach-outline" size={18} color="#3f51b5" />
            <Text style={styles.attachmentText}>{attachment ? `Attached: ${attachment.name}` : 'Attach File (Optional)'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.submitButton} onPress={submitNotification} disabled={submitting}>
            <Ionicons name="send-outline" size={18} color="#ffffff" />
            <Text style={styles.submitText}>{submitting ? 'Sending...' : 'Send Notification'}</Text>
          </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Received Notifications</Text>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        scrollEnabled={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 16,
    paddingBottom: 30,
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
  composeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#edf0f5',
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d5dbe5',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: '#fff',
    color: '#1f2937',
  },
  textArea: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  label: {
    fontWeight: '600',
    color: '#475569',
    marginTop: 8,
    marginBottom: 6,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#d5dbe5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
  },
  chipSelected: {
    backgroundColor: '#3f51b5',
    borderColor: '#3f51b5',
  },
  chipText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  attachmentButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#cfd8ff',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#edf2ff',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  attachmentText: {
    color: '#3f51b5',
    fontWeight: '600',
  },
  submitButton: {
    marginTop: 10,
    backgroundColor: '#3f51b5',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  submitText: {
    color: '#ffffff',
    fontWeight: '700',
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
  manageButton: {
    backgroundColor: '#3f51b5',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  manageButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
