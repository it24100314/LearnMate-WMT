import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import api from '../../utils/api';
import { logout } from '../../utils/auth';

type UserProfile = {
  _id: string;
  name: string;
  username: string;
  email: string;
  contact?: string;
  role: string;
  schoolClass?: { _id: string; name: string };
  subjects?: { _id: string; name: string }[];
};

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setError('');
      const userId = await SecureStore.getItemAsync('userId');
      if (!userId) {
        throw new Error('User not found in store');
      }

      const response = await api.get(`/users/${userId}`);
      setProfile(response.data);
    } catch (err: any) {
      console.error('Profile fetch failed:', err);
      
      // Check if it's an auth error
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        await logout(router, 'Your session has expired. Please log in again.');
        return;
      }
      
      setError(err?.response?.data?.message || err.message || 'Unable to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        onPress: async () => {
          await logout(router, '');
        },
        style: 'destructive',
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3f51b5" />
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No profile data available</Text>
      </View>
    );
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return '#ef5350';
      case 'TEACHER':
        return '#5c6bc0';
      default:
        return '#42a5f5';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerCard}>
        <View style={[styles.avatarCircle, { backgroundColor: getRoleColor(profile.role) }]}>
          <Text style={styles.avatarText}>{(profile.name || '?').charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.profileName}>{profile.name}</Text>
        <Text style={styles.profileSubTitle}>Your academic profile overview</Text>
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(profile.role) + '20' }]}>
          <Text style={[styles.roleText, { color: getRoleColor(profile.role) }]}>
            {profile.role}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Username</Text>
          <Text style={styles.infoValue}>{profile.username}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{profile.email}</Text>
        </View>

        {profile.contact && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Contact</Text>
            <Text style={styles.infoValue}>{profile.contact}</Text>
          </View>
        )}
      </View>

      {/* Student-Specific Information */}
      {profile?.role === 'STUDENT' && profile?.schoolClass && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Academic Information</Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Grade / Class</Text>
            <Text style={styles.infoValue}>{profile.schoolClass.name}</Text>
          </View>

          {profile?.subjects && profile.subjects.length > 0 && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Enrolled Subjects</Text>
              <View style={styles.subjectsList}>
                {profile.subjects.map((subject, index) => {
                  const subjectName = subject?.name || 'N/A';
                  return (
                    <View key={subject?._id || index} style={styles.subjectChip}>
                      <Text style={styles.subjectChipText}>{subjectName}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Teacher-Specific Information */}
      {profile?.role === 'TEACHER' && profile?.subjects && profile.subjects.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Teaching Information</Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Teaching Subjects</Text>
            <View style={styles.subjectsList}>
              {profile.subjects.map((subject, index) => {
                const subjectName = subject?.name || 'N/A';
                return (
                  <View key={subject?._id || index} style={styles.subjectChip}>
                    <Text style={styles.subjectChipText}>{subjectName}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Account Actions */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 14,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#e8edff',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#ffffff',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
    color: '#1f2937',
  },
  profileSubTitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 10,
  },
  roleBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
    color: '#1f2937',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    padding: 15,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#edf0f5',
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  subjectsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 10,
  },
  subjectChip: {
    backgroundColor: '#e8edff',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cfd8ff',
  },
  subjectChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f3d99',
  },
  logoutButton: {
    backgroundColor: '#ff5252',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 0,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 16,
    color: '#ff5252',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#3f51b5',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 12,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});