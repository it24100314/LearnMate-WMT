import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { handleApiError } from '../utils/auth';
import * as SecureStore from 'expo-secure-store';

type UserData = {
  _id: string;
  name: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  active: boolean;
  contact?: string;
  schoolClass?: { name: string };
};

const ROLES = ['ALL', 'ADMIN', 'TEACHER', 'STUDENT'];

export default function ManageUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    contact: '',
    role: 'STUDENT',
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/users?q=${query}&role=${roleFilter}`);
      setUsers(res.data);
      
      const myId = await SecureStore.getItemAsync('userId');
      setCurrentUserId(myId);
    } catch (err) {
      handleApiError(err, router, 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [query, roleFilter]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchUsers();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [query, roleFilter, fetchUsers]);

  const openEditModal = (user: UserData) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      username: user.username,
      email: user.email,
      contact: user.contact || '',
      role: user.role,
      active: user.active
    });
    setModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!editingUser) return;
    if (!form.name.trim() || !form.username.trim() || !form.email.trim()) {
      Alert.alert('Validation Error', 'Name, Username, and Email are required.');
      return;
    }

    try {
      setSaving(true);
      await api.put(`/users/${editingUser._id}`, form);
      Alert.alert('Success', 'User updated successfully');
      setModalVisible(false);
      fetchUsers();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to update user';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    if (id === currentUserId) {
      Alert.alert('Error', 'You cannot delete your own account.');
      return;
    }

    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to permanently delete this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/users/${id}`);
              fetchUsers();
            } catch (err: any) {
              const msg = err?.response?.data?.message || 'Failed to delete user';
              Alert.alert('Delete Failed', msg);
            }
          }
        }
      ]
    );
  };

  const renderUser = ({ item }: { item: UserData }) => {
    const getRoleColor = (r: string) => {
      if (r === 'ADMIN') return '#dbe2ff';
      if (r === 'TEACHER') return '#fff3cd';
      return '#e8f5e9';
    };
    const getRoleTextColor = (r: string) => {
      if (r === 'ADMIN') return '#3f51b5';
      if (r === 'TEACHER') return '#ffb300';
      return '#4caf50';
    };

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.userAvatar}>
            <Text style={styles.userInitials}>{item.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
            <Text style={[styles.roleText, { color: getRoleTextColor(item.role) }]}>{item.role}</Text>
          </View>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <Ionicons name="person-circle-outline" size={16} color="#64748b" />
            <Text style={styles.detailText}>@{item.username}</Text>
          </View>
          {item.schoolClass && (
             <View style={styles.detailRow}>
               <Ionicons name="school-outline" size={16} color="#64748b" />
               <Text style={styles.detailText}>{item.schoolClass.name}</Text>
             </View>
          )}
          <View style={styles.detailRow}>
            <Ionicons name={item.active ? "checkmark-circle-outline" : "close-circle-outline"} size={16} color={item.active ? '#4caf50' : '#f44336'} />
            <Text style={styles.detailText}>{item.active ? 'Active Account' : 'Pending Approval / Inactive'}</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtnEdit} onPress={() => openEditModal(item)}>
            <Ionicons name="pencil-outline" size={18} color="#3f51b5" />
            <Text style={styles.actionTextEdit}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtnDelete, item._id === currentUserId && styles.disabledBtn]} 
            onPress={() => handleDelete(item._id)}
            disabled={item._id === currentUserId}
          >
            <Ionicons name="trash-outline" size={18} color={item._id === currentUserId ? '#a1a1aa' : "#ef4444"} />
            <Text style={[styles.actionTextDelete, item._id === currentUserId && styles.disabledText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#3f51b5" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Users</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search by name, email or username"
            value={query}
            onChangeText={setQuery}
            placeholderTextColor="#94a3b8"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsWrap}>
          {ROLES.map(role => (
            <TouchableOpacity 
              key={role} 
              style={[styles.tabBtn, roleFilter === role && styles.tabBtnActive]}
              onPress={() => setRoleFilter(role)}
            >
              <Text style={[styles.tabText, roleFilter === role && styles.tabTextActive]}>
                {role}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3f51b5" style={styles.loader} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item._id}
          renderItem={renderUser}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="people-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No users found.</Text>
            </View>
          }
        />
      )}

      {/* Edit Modal */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Edit User</Text>
               <TouchableOpacity onPress={() => setModalVisible(false)}>
                 <Ionicons name="close" size={24} color="#64748b" />
               </TouchableOpacity>
             </View>

             <ScrollView style={styles.modalBody}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput style={styles.input} value={form.name} onChangeText={t => setForm({...form, name: t})} />

                <Text style={styles.label}>Username</Text>
                <TextInput style={styles.input} autoCapitalize="none" value={form.username} onChangeText={t => setForm({...form, username: t})} />

                <Text style={styles.label}>Email Address</Text>
                <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={t => setForm({...form, email: t})} />

                <Text style={styles.label}>Contact Number</Text>
                <TextInput style={styles.input} keyboardType="phone-pad" value={form.contact} onChangeText={t => setForm({...form, contact: t})} />

                <Text style={styles.label}>Role</Text>
                <View style={styles.roleChips}>
                  {['ADMIN', 'TEACHER', 'STUDENT'].map(r => (
                    <TouchableOpacity 
                      key={r} 
                      style={[styles.roleChip, form.role === r && styles.roleChipActive]}
                      onPress={() => setForm({...form, role: r as any})}
                    >
                      <Text style={[styles.roleChipText, form.role === r && styles.roleChipTextActive]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.switchRow}>
                  <View>
                    <Text style={styles.label}>Account Status</Text>
                    <Text style={styles.subLabel}>{form.active ? 'Active & Approved' : 'Suspended / Pending'}</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.toggleBtn, form.active && styles.toggleBtnActive]}
                    onPress={() => setForm({...form, active: !form.active})}
                  >
                    <Text style={styles.toggleText}>{form.active ? 'Active' : 'Inactive'}</Text>
                  </TouchableOpacity>
                </View>
             </ScrollView>

             <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} disabled={saving}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                </TouchableOpacity>
             </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 50,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    padding: 6,
    marginLeft: -6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2937',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
  },
  tabsWrap: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 10,
  },
  tabBtnActive: {
    backgroundColor: '#3f51b5',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loader: {
    marginTop: 40,
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: 14,
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#edf0f5',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e8edff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3f51b5',
  },
  userInfo: {
    flex: 1,
    paddingRight: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: '#64748b',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingTop: 16,
    gap: 12,
  },
  actionBtnEdit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8edff',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionTextEdit: {
    color: '#3f51b5',
    fontWeight: '600',
    fontSize: 14,
  },
  actionBtnDelete: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionTextDelete: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 14,
  },
  disabledBtn: {
    backgroundColor: '#f1f5f9',
  },
  disabledText: {
    color: '#a1a1aa',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: '#1e293b',
    marginBottom: 16,
  },
  roleChips: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  roleChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  roleChipActive: {
    backgroundColor: '#3f51b5',
    borderColor: '#3f51b5',
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  roleChipTextActive: {
    color: '#ffffff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 30,
  },
  toggleBtn: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#4caf50',
  },
  toggleText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
    backgroundColor: '#fff',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 15,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: '#3f51b5',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});