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
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as SecureStore from 'expo-secure-store';
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
  targetClass?: string;
  createdAt: string;
  roles: string[];
  classes: string[];
}

const ManageNotificationsScreen = () => {
  const colorScheme = useColorScheme();
  const backgroundColor = Colors[colorScheme ?? 'light'].background;
  const textColor = Colors[colorScheme ?? 'light'].text;
  const tintColor = Colors[colorScheme ?? 'light'].tint;

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  // Data state
  const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [sentNotifications, setSentNotifications] = useState<Notification[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  // Check if teacher/admin
  useEffect(() => {
    const checkRole = async () => {
      const role = await SecureStore.getItemAsync('userRole');
      const id = await SecureStore.getItemAsync('userId');
      setCurrentUser({ role, id });

      if (role !== 'TEACHER' && role !== 'ADMIN') {
        Alert.alert('Access Denied', 'Only teachers and admins can manage notifications');
        return;
      }

      await loadData();
    };

    checkRole();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync('userToken');

      // Get options (classes and subjects)
      const optionsResponse = await api.get('/notifications/options');

      if (optionsResponse.data) {
        setAllClasses(optionsResponse.data.schoolClasses || []);
        setAllSubjects(optionsResponse.data.teacherSubjects || []);
      }

      // Get sent notifications
      const listResponse = await api.get('/notifications/list');

      if (listResponse.data) {
        setSentNotifications(
          listResponse.data.sentNotifications?.map((view: any) => ({
            _id: view.notification._id,
            title: view.notification.title,
            message: view.notification.message,
            createdAt: view.notification.createdAt,
            roles: view.roles || [],
            classes: view.classes || [],
          })) || []
        );
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleToggleRole = (role: string) => {
    setTargetRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleToggleClass = (classId: string) => {
    setSelectedClasses((prev) =>
      prev.includes(classId)
        ? prev.filter((c) => c !== classId)
        : [...prev, classId]
    );
  };

  const handleToggleSubject = (subjectId: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((s) => s !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSendNotification = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Please enter a title');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Validation', 'Please enter a message');
      return;
    }

    if (targetRoles.length === 0) {
      Alert.alert('Validation', 'Please select at least one role');
      return;
    }

    if (targetRoles.includes('STUDENT')) {
      if (selectedClasses.length === 0) {
        Alert.alert('Validation', 'When targeting students, select at least one class');
        return;
      }
      if (selectedSubjects.length === 0) {
        Alert.alert('Validation', 'When targeting students, select at least one subject');
        return;
      }
    }

    try {
      setSending(true);

      const response = await api.post('/notifications/create', {
        title: title.trim(),
        message: message.trim(),
        targetRoles,
        selectedClasses: targetRoles.includes('STUDENT') ? selectedClasses : [],
        selectedSubjects: targetRoles.includes('STUDENT') ? selectedSubjects : [],
      });

      if (response.data) {
        Alert.alert('Success', 'Notification sent successfully');
        setTitle('');
        setMessage('');
        setTargetRoles([]);
        setSelectedClasses([]);
        setSelectedSubjects([]);
        await loadData();
      }
    } catch (error: any) {
      console.error('Error sending notification:', error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const handleEditNotification = (notification: Notification) => {
    setEditingId(notification._id);
    setEditTitle(notification.title);
    setEditMessage(notification.message);
    setShowEditModal(true);
  };

  const handleUpdateNotification = async () => {
    if (!editTitle.trim() || !editMessage.trim()) {
      Alert.alert('Validation', 'Title and message are required');
      return;
    }

    try {
      const response = await api.put(`/notifications/edit/${editingId}`, {
        title: editTitle.trim(),
        message: editMessage.trim(),
      });

      if (response.data) {
        Alert.alert('Success', 'Notification updated successfully');
        setShowEditModal(false);
        setEditingId(null);
        await loadData();
      }
    } catch (error: any) {
      console.error('Error updating notification:', error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to update notification');
    }
  };

  const handleDeleteNotification = (notificationId: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this notification?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await api.delete(`/notifications/delete/${notificationId}`);

            if (response.data) {
              Alert.alert('Success', 'Notification deleted successfully');
              await loadData();
            }
          } catch (error: any) {
            console.error('Error deleting notification:', error);
            Alert.alert('Error', error?.response?.data?.message || 'Failed to delete notification');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <ThemedView style={[styles.centerContainer, { backgroundColor }]}>
        <ActivityIndicator size="large" color={tintColor} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Create New Notification Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Create New Notification</ThemedText>

          {/* Title Input */}
          <View
            style={[
              styles.input,
              {
                borderColor: tintColor,
                borderWidth: 1,
              },
            ]}
          >
            <ThemedText style={styles.inputLabel}>Title</ThemedText>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Enter notification title"
              style={{ color: textColor }}
              placeholderTextColor={textColor + '99'}
            />
          </View>

          {/* Message Input */}
          <View
            style={[
              styles.input,
              styles.messageInput,
              {
                borderColor: tintColor,
                borderWidth: 1,
              },
            ]}
          >
            <ThemedText style={styles.inputLabel}>Message</ThemedText>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Enter notification message"
              multiline
              numberOfLines={4}
              style={{ color: textColor }}
              placeholderTextColor={textColor + '99'}
            />
          </View>

          {/* Select Target Audiences */}
          <ThemedText style={styles.subTitle}>Select Target Audience</ThemedText>

          {/* Role Selection */}
          <View style={styles.chipContainer}>
            {['STUDENT', 'TEACHER'].map((role) => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.chip,
                  {
                    backgroundColor: targetRoles.includes(role)
                      ? tintColor
                      : tintColor + '22',
                    borderColor: tintColor,
                  },
                ]}
                onPress={() => handleToggleRole(role)}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    {
                      color: targetRoles.includes(role) ? '#fff' : textColor,
                    },
                  ]}
                >
                  {role}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* Class Selection (if STUDENT is selected) */}
          {targetRoles.includes('STUDENT') && allClasses.length > 0 && (
            <View style={styles.filterSection}>
              <ThemedText style={styles.filterLabel}>Select Classes/Grades</ThemedText>
              <View style={styles.chipContainer}>
                {allClasses.map((cls) => (
                  <TouchableOpacity
                    key={cls._id}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selectedClasses.includes(cls._id)
                          ? tintColor
                          : tintColor + '22',
                        borderColor: tintColor,
                      },
                    ]}
                    onPress={() => handleToggleClass(cls._id)}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        {
                          color: selectedClasses.includes(cls._id)
                            ? '#fff'
                            : textColor,
                        },
                      ]}
                    >
                      {cls.name}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Subject Selection (if STUDENT is selected) */}
          {targetRoles.includes('STUDENT') && allSubjects.length > 0 && (
            <View style={styles.filterSection}>
              <ThemedText style={styles.filterLabel}>Select Subjects</ThemedText>
              <View style={styles.chipContainer}>
                {allSubjects.map((subj) => (
                  <TouchableOpacity
                    key={subj._id}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selectedSubjects.includes(subj._id)
                          ? tintColor
                          : tintColor + '22',
                        borderColor: tintColor,
                      },
                    ]}
                    onPress={() => handleToggleSubject(subj._id)}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        {
                          color: selectedSubjects.includes(subj._id)
                            ? '#fff'
                            : textColor,
                        },
                      ]}
                    >
                      {subj.name}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Send Button */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: tintColor }]}
            onPress={handleSendNotification}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <ThemedText style={styles.buttonText}>Send Notification</ThemedText>
            )}
          </TouchableOpacity>
        </View>

        {/* Sent Notifications List */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>
            Sent Notifications ({sentNotifications.length})
          </ThemedText>

          {sentNotifications.length === 0 ? (
            <ThemedText style={styles.emptyState}>No notifications sent yet</ThemedText>
          ) : (
            <FlatList
              scrollEnabled={false}
              data={sentNotifications}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <View style={styles.notificationCard}>
                  <View style={styles.notificationHeader}>
                    <View style={styles.notificationTitleSection}>
                      <ThemedText style={styles.notificationTitle}>
                        {item.title}
                      </ThemedText>
                      <ThemedText style={styles.notificationDate}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </ThemedText>
                    </View>
                    <View style={styles.notificationActions}>
                      <TouchableOpacity
                        onPress={() => handleEditNotification(item)}
                        style={[styles.iconButton, { backgroundColor: tintColor + '33' }]}
                      >
                        <ThemedText style={{ color: tintColor }}>✎</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteNotification(item._id)}
                        style={[styles.iconButton, { backgroundColor: '#ff000033' }]}
                      >
                        <ThemedText style={{ color: '#ff0000' }}>✕</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <ThemedText style={styles.notificationMessage}>
                    {item.message}
                  </ThemedText>

                  <View style={styles.targetInfo}>
                    {item.roles.length > 0 && (
                      <ThemedText style={styles.targetTag}>
                        Roles: {item.roles.join(', ')}
                      </ThemedText>
                    )}
                    {item.classes.length > 0 && (
                      <ThemedText style={styles.targetTag}>
                        Classes: {item.classes.join(', ')}
                      </ThemedText>
                    )}
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <ThemedText style={styles.modalTitle}>Edit Notification</ThemedText>

            <View style={[styles.input, { borderColor: tintColor, borderWidth: 1 }]}>
              <ThemedText style={styles.inputLabel}>Title</ThemedText>
              <TextInput
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Enter title"
                style={{ color: textColor }}
                placeholderTextColor={textColor + '99'}
              />
            </View>

            <View
              style={[
                styles.input,
                styles.messageInput,
                { borderColor: tintColor, borderWidth: 1 },
              ]}
            >
              <ThemedText style={styles.inputLabel}>Message</ThemedText>
              <TextInput
                value={editMessage}
                onChangeText={setEditMessage}
                placeholder="Enter message"
                multiline
                numberOfLines={4}
                style={{ color: textColor }}
                placeholderTextColor={textColor + '99'}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, { flex: 1, backgroundColor: tintColor + '33' }]}
                onPress={() => setShowEditModal(false)}
              >
                <ThemedText style={{ color: tintColor }}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { flex: 1, backgroundColor: tintColor, marginLeft: 8 }]}
                onPress={handleUpdateNotification}
              >
                <ThemedText style={styles.buttonText}>Update</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  messageInput: {
    minHeight: 120,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  filterSection: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  notificationCard: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#edf0f5',
    backgroundColor: '#ffffff',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  notificationTitleSection: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  notificationDate: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.6,
  },
  notificationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationMessage: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  targetInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  targetTag: {
    fontSize: 11,
    marginBottom: 4,
    fontWeight: '500',
    opacity: 0.7,
  },
  emptyState: {
    textAlign: 'center',
    marginVertical: 20,
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#edf0f5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 16,
  },
});

export default ManageNotificationsScreen;
