import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { AxiosError } from 'axios';
import { useRouter } from 'expo-router';
import api from '../utils/api';
import * as Storage from '../utils/storage';

type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
type RoleFilter = UserRole | 'ALL';

type UserRecord = {
  _id: string;
  name: string;
  username: string;
  email: string;
  contact?: string;
  role: UserRole;
  active: boolean;
  schoolClass?: { _id: string; name: string };
  subjects?: { _id: string; name: string }[];
  createdAt?: string;
};

type ApiError = {
  message?: string;
};

type EditFormState = {
  name: string;
  username: string;
  email: string;
  contact: string;
  role: UserRole;
  active: boolean;
};

const ROLE_OPTIONS: RoleFilter[] = ['ALL', 'ADMIN', 'TEACHER', 'STUDENT', 'PARENT'];

export default function UsersScreen() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    name: '',
    username: '',
    email: '',
    contact: '',
    role: 'STUDENT',
    active: true,
  });

  const extractMessage = (err: unknown) => {
    const axiosError = err as AxiosError<ApiError>;
    return axiosError.response?.data?.message || 'Something went wrong.';
  };

  const resetFeedback = () => {
    setError('');
    setSuccess('');
  };

  const loadUsers = useCallback(
    async (isRefresh = false) => {
      if (isAdmin !== true) return;

      resetFeedback();
      if (isRefresh) {
        setRefreshing(true);
      } else {
        if (!hasLoadedOnce) {
          setLoading(true);
        }
      }

      try {
        const response = await api.get<UserRecord[]>('/users', {
          params: {
            role: roleFilter !== 'ALL' ? roleFilter : undefined,
          },
        });
        setUsers(response.data || []);
      } catch (err) {
        setError(extractMessage(err));
      } finally {
        setLoading(false);
        setHasLoadedOnce(true);
        setRefreshing(false);
      }
    },
    [hasLoadedOnce, isAdmin, roleFilter]
  );

  useEffect(() => {
    const checkRole = async () => {
      const role = await Storage.getItemAsync('userRole');
      if (role === 'ADMIN') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    };
    checkRole();
  }, []);

  useEffect(() => {
    if (isAdmin === true) {
      loadUsers();
    } else if (isAdmin === false) {
      setLoading(false);
    }
  }, [isAdmin, loadUsers]);

  const openEdit = (user: UserRecord) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      username: user.username || '',
      email: user.email || '',
      contact: user.contact || '',
      role: user.role,
      active: user.active,
    });
    resetFeedback();
  };

  const closeEdit = () => {
    setEditingUser(null);
    setEditSubmitting(false);
  };

  const validateEditForm = () => {
    if (!editForm.name.trim()) return 'Name is required.';
    if (!editForm.username.trim()) return 'Username is required.';
    if (editForm.username.trim().length < 3 || editForm.username.trim().length > 50) {
      return 'Username must be between 3 and 50 characters.';
    }
    if (!editForm.email.trim()) return 'Email is required.';
    if (!/.+\@.+\..+/.test(editForm.email.trim())) return 'Email should be valid.';
    return '';
  };

  const handleUpdateUser = async () => {
    if (!editingUser || editSubmitting) return;

    const validationMessage = validateEditForm();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setEditSubmitting(true);
    resetFeedback();
    try {
      await api.put(`/users/${editingUser._id}`, {
        name: editForm.name.trim(),
        username: editForm.username.trim(),
        email: editForm.email.trim(),
        contact: editForm.contact.trim() || undefined,
        role: editForm.role,
        active: editForm.active,
      });

      setSuccess('User updated successfully.');
      closeEdit();
      await loadUsers();
    } catch (err) {
      setError(extractMessage(err));
      setEditSubmitting(false);
    }
  };

  const handleDeleteUser = (user: UserRecord) => {
    Alert.alert('Delete User', `Delete ${user.name} (${user.username})?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingUserId(user._id);
          resetFeedback();
          try {
            await api.delete(`/users/${user._id}`);
            setSuccess('User deleted successfully.');
            await loadUsers();
          } catch (err) {
            setError(extractMessage(err));
          } finally {
            setDeletingUserId(null);
          }
        },
      },
    ]);
  };

  const roleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return styles.badgeAdmin;
      case 'TEACHER':
        return styles.badgeTeacher;
      case 'PARENT':
        return styles.badgeParent;
      default:
        return styles.badgeStudent;
    }
  };

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return users;

    return users.filter((user) => {
      const haystack = `${user.name} ${user.username} ${user.email}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [search, users]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  if (isAdmin === false) {
    return (
      <View style={styles.center}>
        <Text style={styles.deniedTitle}>Access Denied</Text>
        <Text style={styles.deniedText}>Only admins can manage users.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/')}>
          <Text style={styles.primaryBtnText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>User Management</Text>
        <Text style={styles.subtitle}>Search, filter, view, edit, and delete users.</Text>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or username"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            onSubmitEditing={() => loadUsers()}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={() => loadUsers()}>
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          {ROLE_OPTIONS.map((role) => (
            <TouchableOpacity
              key={role}
              style={[styles.filterChip, roleFilter === role && styles.filterChipActive]}
              onPress={() => setRoleFilter(role)}
            >
              <Text style={[styles.filterChipText, roleFilter === role && styles.filterChipTextActive]}>
                {role}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {success ? <Text style={styles.successText}>{success}</Text> : null}

        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadUsers(true)} />}
          contentContainerStyle={filteredUsers.length === 0 ? styles.emptyListContainer : styles.listContainer}
          ListEmptyComponent={<Text style={styles.emptyText}>No users found for current filters.</Text>}
          renderItem={({ item }) => (
            <View style={styles.userCard}>
              <View style={styles.userHeader}>
                <View>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userMeta}>@{item.username}</Text>
                  <Text style={styles.userMeta}>{item.email}</Text>
                </View>
                <View style={[styles.roleBadge, roleBadgeStyle(item.role)]}>
                  <Text style={styles.roleBadgeText}>{item.role}</Text>
                </View>
              </View>

              <View style={styles.statusRow}>
                <Text style={styles.statusText}>{item.active ? 'Active' : 'Disabled'}</Text>
                {item.schoolClass?.name ? <Text style={styles.statusText}>Class: {item.schoolClass.name}</Text> : null}
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setSelectedUser(item)}>
                  <Text style={styles.secondaryBtnText}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => openEdit(item)}>
                  <Text style={styles.secondaryBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.secondaryBtn, styles.deleteBtn]}
                  onPress={() => handleDeleteUser(item)}
                  disabled={deletingUserId === item._id}
                >
                  <Text style={[styles.secondaryBtnText, styles.deleteBtnText]}>
                    {deletingUserId === item._id ? 'Deleting...' : 'Delete'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>

      <Modal visible={Boolean(selectedUser)} animationType="slide" transparent onRequestClose={() => setSelectedUser(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>User Details</Text>
            {selectedUser ? (
              <ScrollView>
                <Text style={styles.modalItem}>Name: {selectedUser.name}</Text>
                <Text style={styles.modalItem}>Username: {selectedUser.username}</Text>
                <Text style={styles.modalItem}>Email: {selectedUser.email}</Text>
                <Text style={styles.modalItem}>Contact: {selectedUser.contact || '-'}</Text>
                <Text style={styles.modalItem}>Role: {selectedUser.role}</Text>
                <Text style={styles.modalItem}>Status: {selectedUser.active ? 'Active' : 'Disabled'}</Text>
                <Text style={styles.modalItem}>Class: {selectedUser.schoolClass?.name || '-'}</Text>
                <Text style={styles.modalItem}>
                  Subjects: {(selectedUser.subjects || []).length > 0 ? selectedUser.subjects?.map((s) => s.name).join(', ') : '-'}
                </Text>
              </ScrollView>
            ) : null}
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setSelectedUser(null)}>
              <Text style={styles.primaryBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(editingUser)} animationType="slide" transparent onRequestClose={closeEdit}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit User</Text>
            <ScrollView>
              <TextInput
                style={styles.input}
                placeholder="Full name"
                value={editForm.name}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, name: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Username"
                value={editForm.username}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, username: value }))}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={editForm.email}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, email: value }))}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                style={styles.input}
                placeholder="Contact (optional)"
                value={editForm.contact}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, contact: value }))}
              />

              <Text style={styles.sectionLabel}>Role</Text>
              <View style={styles.roleRow}>
                {(['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'] as UserRole[]).map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[styles.filterChip, editForm.role === role && styles.filterChipActive]}
                    onPress={() => setEditForm((prev) => ({ ...prev, role }))}
                  >
                    <Text style={[styles.filterChipText, editForm.role === role && styles.filterChipTextActive]}>
                      {role}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.secondaryBtn, editForm.active && styles.activeChip]}
                onPress={() => setEditForm((prev) => ({ ...prev, active: !prev.active }))}
              >
                <Text style={[styles.secondaryBtnText, editForm.active && styles.activeChipText]}>
                  {editForm.active ? 'Status: Active' : 'Status: Disabled'}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={closeEdit} disabled={editSubmitting}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleUpdateUser} disabled={editSubmitting}>
                <Text style={styles.primaryBtnText}>{editSubmitting ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 16,
  },
  content: {
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    color: '#6b7280',
    marginBottom: 12,
  },
  loadingText: {
    marginTop: 10,
    color: '#4b5563',
  },
  deniedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 8,
  },
  deniedText: {
    color: '#4b5563',
    marginBottom: 20,
    textAlign: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    fontSize: 14,
  },
  searchBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 44,
    minWidth: 84,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 6,
    marginBottom: 8,
    columnGap: 8,
    rowGap: 8,
    alignItems: 'center',
  },
  filterChip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    minWidth: 82,
    paddingHorizontal: 14,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterChipText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  listContainer: {
    paddingBottom: 24,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  userMeta: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 2,
  },
  roleBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeAdmin: { backgroundColor: '#dc2626' },
  badgeTeacher: { backgroundColor: '#0891b2' },
  badgeStudent: { backgroundColor: '#2563eb' },
  badgeParent: { backgroundColor: '#d97706' },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 10,
    gap: 8,
  },
  statusText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  secondaryBtnText: {
    color: '#334155',
    fontWeight: '600',
  },
  deleteBtn: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  deleteBtnText: {
    color: '#dc2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  modalItem: {
    marginBottom: 8,
    color: '#374151',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  sectionLabel: {
    marginTop: 4,
    marginBottom: 8,
    color: '#111827',
    fontWeight: '700',
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  activeChip: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  activeChipText: {
    color: '#065f46',
  },
  errorText: {
    color: '#b91c1c',
    marginBottom: 8,
    fontSize: 13,
  },
  successText: {
    color: '#166534',
    marginBottom: 8,
    fontSize: 13,
  },
});
