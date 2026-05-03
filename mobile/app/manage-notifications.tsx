import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Modal,
  TextInput,
  Platform,
  Text,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as SecureStore from 'expo-secure-store';
import { useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import api from '@/utils/api';

interface SchoolClass {
  _id: string;
  name: string;
}

interface Subject {
  _id: string;
  name: string;
}

interface Notification {
  _id: string;
  title: string;
  message: string;
  targetRole: string;
  createdAt: string;
  roles: string[];
  classes: string[];
  fileName?: string;
}

const ManageNotificationsScreen = () => {
  const params = useLocalSearchParams<{ mode?: string }>();
  const modeParam = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const mode = modeParam === 'manage' ? 'manage' : 'compose';
  const showComposeSection = mode !== 'manage';

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const backgroundColor = Colors[colorScheme ?? 'light'].background;
  const textColor = Colors[colorScheme ?? 'light'].text;
  const tintColor = Colors[colorScheme ?? 'light'].tint;

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [attachment, setAttachment] = useState<DocumentPicker.DocumentPickerResult | null>(null);

  // Data state
  const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [sentNotifications, setSentNotifications] = useState<Notification[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      const role = await SecureStore.getItemAsync('userRole');
      if (role !== 'TEACHER' && role !== 'ADMIN') {
        Alert.alert('Access Denied', 'Only teachers and admins can manage notifications');
        setLoading(false);
        return;
      }
      await loadData();
    };
    checkRole();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [optionsResponse, listResponse] = await Promise.all([
        api.get('/notifications/options'),
        api.get('/notifications/list')
      ]);

      if (optionsResponse.data) {
        setAllClasses(optionsResponse.data.schoolClasses || []);
        setAllSubjects(optionsResponse.data.teacherSubjects || []);
      }

      if (listResponse.data) {
        setSentNotifications(
          listResponse.data.sentNotifications?.map((view: any) => ({
            _id: view.notification?._id,
            title: view.notification?.title || 'No Title',
            message: view.notification?.message || '',
            createdAt: view.notification?.createdAt || new Date().toISOString(),
            roles: Array.isArray(view.roles) ? view.roles : [],
            classes: Array.isArray(view.classes) ? view.classes : [],
            fileName: view.notification?.fileName,
          })) || []
        );
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled) {
        setAttachment(result);
      }
    } catch (err) {
      console.error('Document pick error:', err);
    }
  };

  const handleSendNotification = async () => {
    if (!title.trim() || !message.trim() || targetRoles.length === 0) {
      Alert.alert('Validation', 'Title, message, and at least one role are required');
      return;
    }

    if (targetRoles.includes('STUDENT') && selectedClasses.length === 0) {
      Alert.alert('Validation', 'When targeting students, please select at least one class');
      return;
    }

    try {
      setSending(true);
      
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('message', message.trim());
      
      targetRoles.forEach(role => formData.append('targetRoles[]', role));
      selectedClasses.forEach(id => formData.append('selectedClasses[]', id));
      selectedSubjects.forEach(id => formData.append('selectedSubjects[]', id));

      if (attachment && !attachment.canceled) {
        const file = attachment.assets[0];
        formData.append('file', {
          uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
          name: file.name,
          type: file.mimeType || 'application/octet-stream',
        } as any);
      }

      await api.post('/notifications/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Success', 'Announcement broadcasted successfully');
      setTitle('');
      setMessage('');
      setTargetRoles([]);
      setSelectedClasses([]);
      setSelectedSubjects([]);
      setAttachment(null);
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleUpdateNotification = async () => {
    if (!editTitle.trim() || !editMessage.trim()) return;
    try {
      await api.put(`/notifications/edit/${editingId}`, {
        title: editTitle.trim(),
        message: editMessage.trim(),
      });
      setShowEditModal(false);
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', 'Update failed');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Announcement', 'Are you sure you want to retract this announcement?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await api.delete(`/notifications/delete/${id}`);
        loadData();
      }}
    ]);
  };

  if (loading) return (
    <View style={[styles.center, { backgroundColor }]}>
      <ActivityIndicator size="large" color={tintColor} />
    </View>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
        contentContainerStyle={styles.scroll}
      >
        {showComposeSection && (
          <View style={[styles.glassCard, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
            <ThemedText style={styles.cardTitle}>New Announcement</ThemedText>
            
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Announcement Title"
              placeholderTextColor="#94a3b8"
              style={[styles.input, { color: textColor, borderColor: isDark ? '#334155' : '#e2e8f0' }]}
            />
            
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Detailed message..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={4}
              style={[styles.input, styles.textArea, { color: textColor, borderColor: isDark ? '#334155' : '#e2e8f0' }]}
            />

            <View style={styles.attachmentRow}>
              <TouchableOpacity style={[styles.attachmentBtn, { borderColor: tintColor }]} onPress={pickDocument}>
                <Ionicons name="attach" size={20} color={tintColor} />
                <ThemedText style={{ color: tintColor, fontWeight: '600' }}>
                  {attachment && !attachment.canceled ? 'File Attached' : 'Add Attachment'}
                </ThemedText>
              </TouchableOpacity>
              {attachment && !attachment.canceled && (
                <TouchableOpacity onPress={() => setAttachment(null)}>
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>

            <ThemedText style={styles.label}>Broadcast To:</ThemedText>
            <View style={styles.chipRow}>
              {['STUDENT', 'TEACHER'].map(r => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setTargetRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])}
                  style={[styles.chip, targetRoles.includes(r) && { backgroundColor: tintColor, borderColor: tintColor }]}
                >
                  <ThemedText style={[styles.chipText, targetRoles.includes(r) && { color: '#fff' }]}>{r}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            {targetRoles.includes('STUDENT') && (
              <>
                <ThemedText style={styles.label}>Select Classes:</ThemedText>
                <View style={styles.chipRow}>
                  {allClasses.map(c => (
                    <TouchableOpacity
                      key={c._id}
                      onPress={() => setSelectedClasses(prev => prev.includes(c._id) ? prev.filter(x => x !== c._id) : [...prev, c._id])}
                      style={[styles.chip, selectedClasses.includes(c._id) && { backgroundColor: tintColor, borderColor: tintColor }]}
                    >
                      <ThemedText style={[styles.chipText, selectedClasses.includes(c._id) && { color: '#fff' }]}>{c.name}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <ThemedText style={styles.label}>Target Subjects:</ThemedText>
                <View style={styles.chipRow}>
                  {allSubjects.map(s => (
                    <TouchableOpacity
                      key={s._id}
                      onPress={() => setSelectedSubjects(prev => prev.includes(s._id) ? prev.filter(x => x !== s._id) : [...prev, s._id])}
                      style={[styles.chip, selectedSubjects.includes(s._id) && { backgroundColor: tintColor, borderColor: tintColor }]}
                    >
                      <ThemedText style={[styles.chipText, selectedSubjects.includes(s._id) && { color: '#fff' }]}>{s.name}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: tintColor }]}
              onPress={handleSendNotification}
              disabled={sending}
            >
              {sending ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.sendBtnText}>Send Announcement</ThemedText>}
            </TouchableOpacity>
          </View>
        )}

        <ThemedText style={styles.sectionHeader}>Recently Sent</ThemedText>
        {sentNotifications.map(item => (
          <View key={item._id} style={[styles.historyCard, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
            <View style={styles.historyHeader}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.historyTitle}>{item.title}</ThemedText>
                <ThemedText style={styles.historyDate}>{new Date(item.createdAt).toLocaleDateString()}</ThemedText>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity onPress={() => { setEditingId(item._id); setEditTitle(item.title); setEditMessage(item.message); setShowEditModal(true); }}>
                  <Ionicons name="create-outline" size={22} color={tintColor} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item._id)}>
                  <Ionicons name="trash-outline" size={22} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
            <ThemedText style={styles.historyMsg} numberOfLines={2}>{item.message}</ThemedText>
            <View style={styles.tagRow}>
              {(item.roles || []).map((r, idx) => r ? (
                <View key={`role-${idx}`} style={styles.tag}>
                  <Text style={styles.tagText}>{String(r)}</Text>
                </View>
              ) : null)}
              {(item.classes || []).map((c, idx) => c ? (
                <View key={`class-${idx}`} style={[styles.tag, { backgroundColor: '#e0f2fe' }]}>
                  <Text style={[styles.tagText, { color: '#0369a1' }]}>{String(c)}</Text>
                </View>
              ) : null)}
              {item.fileName ? (
                <View style={[styles.tag, { backgroundColor: '#dcfce7' }]}>
                  <Text style={[styles.tagText, { color: '#166534' }]}>📎 File</Text>
                </View>
              ) : null}
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <ThemedText style={styles.modalTitle}>Edit Announcement</ThemedText>
            <TextInput value={editTitle} onChangeText={setEditTitle} style={[styles.input, { color: textColor }]} />
            <TextInput value={editMessage} onChangeText={setEditMessage} multiline style={[styles.input, styles.textArea, { color: textColor }]} />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditModal(false)}><Text style={{ color: '#64748b' }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.updateBtn, { backgroundColor: tintColor }]} onPress={handleUpdateNotification}><Text style={{ color: '#fff' }}>Update</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20 },
  glassCard: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 30,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', marginBottom: 20 },
  input: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  attachmentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  attachmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 12, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  sendBtn: { borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 10 },
  sendBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  sectionHeader: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  historyCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  historyTitle: { fontSize: 16, fontWeight: '700' },
  historyDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 16 },
  historyMsg: { fontSize: 14, color: '#475569', marginBottom: 12 },
  tagRow: { flexDirection: 'row', gap: 8 },
  tag: { backgroundColor: '#f1f5f9', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  tagText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 10 },
  cancelBtn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', backgroundColor: '#f1f5f9' },
  updateBtn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
});

export default ManageNotificationsScreen;

