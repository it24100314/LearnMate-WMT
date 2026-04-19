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
import api from '../../utils/api';
import * as Storage from '../../utils/storage';

type UserProfile = {
  _id: string;
  name: string;
  username: string;
  email: string;
  contact?: string;
  role: string;
  schoolClass?: { _id: string; name: string };
  subjects?: { _id: string; name: string }[];
  children?: { _id: string; name: string; schoolClass?: { name: string } }[];
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
      const userId = await Storage.getItemAsync('userId');
      if (!userId) {
        throw new Error('User not found in store');
      }

      const response = await api.get(`/users/${userId}`);
      setProfile(response.data);
    } catch (err: any) {
      console.error('Profile fetch failed:', err);
      setError(err?.response?.data?.message || err.message || 'Unable to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  const performLogout = async () => {
    try {
      await Storage.clearSessionAsync();
      router.replace('/');
    } catch {
      Alert.alert('Error', 'Something went wrong during logout.');
    }
  };

  const handleLogout = async () => {
    void performLogout();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>Loading Profile...</Text>
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
        return '#FF6B6B';
      case 'TEACHER':
        return '#4ECDC4';
      case 'PARENT':
        return '#FFE66D';
      default:
        return '#95E1D3';
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.headerCard}>
        <View style={[styles.avatarCircle, { backgroundColor: getRoleColor(profile.role) }]}>
          <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.profileName}>{profile.name}</Text>
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(profile.role) + '20' }]}>
          <Text style={[styles.roleText, { color: getRoleColor(profile.role) }]}>
            {profile.role}
          </Text>
        </View>
      </View>

      {/* Basic Information */}
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
                  const displayText = subjectName.length > 0 ? subjectName.charAt(0).toUpperCase() : '?';
                  return (
                    <View key={subject?._id || index} style={styles.subjectBadge}>
                      <Text style={styles.subjectName}>{displayText}</Text>
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
                const displayText = subjectName.length > 0 ? subjectName.charAt(0).toUpperCase() : '?';
                return (
                  <View key={subject?._id || index} style={[styles.subjectBadge, { backgroundColor: '#E8F5E9' }]}>
                    <Text style={[styles.subjectName, { color: '#2E7D32' }]}>{displayText}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Parent-Specific Information */}
      {profile?.role === 'PARENT' && profile?.children && profile.children.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Children</Text>

          <View style={styles.childrenList}>
            {profile.children.map((child, index) => (
              <View key={child?._id || index} style={styles.childCard}>
                <Text style={styles.childName}>{child?.name}</Text>
                {child?.schoolClass && (
                  <Text style={styles.childGrade}>{child.schoolClass.name}</Text>
                )}
              </View>
            ))}
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
    backgroundColor: '#f5f7fa',
    paddingHorizontal: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerCard: {
    backgroundColor: '#FFF',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    color: '#000',
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: '#333',
  },
  infoCard: {
    backgroundColor: '#FFF',
    padding: 14,
    marginBottom: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  subjectsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  subjectBadge: {
    backgroundColor: '#E8F4FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  subjectName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  childrenList: {
    gap: 8,
  },
  childCard: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FFE66D',
  },
  childName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  childGrade: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 0,
    marginTop: 16,
    marginBottom: 16,
  },
  logoutText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 12,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
