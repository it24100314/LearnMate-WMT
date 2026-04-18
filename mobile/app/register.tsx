import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import type { AxiosError } from 'axios';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';

type Role = 'STUDENT' | 'TEACHER';

type NamedOption = {
  _id: string;
  name: string;
};

type RegisterOptionsResponse = {
  roles: Role[];
  schoolClasses: NamedOption[];
  subjects: NamedOption[];
};

type ApiError = {
  message?: string;
};

export default function RegisterScreen() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role | ''>('');

  const [schoolClassId, setSchoolClassId] = useState('');
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [teacherSubjectIds, setTeacherSubjectIds] = useState<string[]>([]);
  const [teacherClassIds, setTeacherClassIds] = useState<string[]>([]);

  const [roles, setRoles] = useState<Role[]>(['STUDENT', 'TEACHER']);
  const [schoolClasses, setSchoolClasses] = useState<NamedOption[]>([]);
  const [subjects, setSubjects] = useState<NamedOption[]>([]);

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const response = await api.get<RegisterOptionsResponse>('/auth/register-options');
        setRoles(response.data.roles ?? ['STUDENT', 'TEACHER']);
        setSchoolClasses(response.data.schoolClasses ?? []);
        setSubjects(response.data.subjects ?? []);
      } catch (error) {
        const axiosError = error as AxiosError<ApiError>;
        Alert.alert('Load Error', axiosError.response?.data?.message ?? 'Failed to load registration options');
      } finally {
        setLoadingOptions(false);
      }
    };

    loadOptions();
  }, []);

  useEffect(() => {
    // Mirror Thymeleaf toggleRoleSections() reset behavior when role changes.
    setSchoolClassId('');
    setSubjectIds([]);
    setTeacherSubjectIds([]);
    setTeacherClassIds([]);
  }, [role]);

  const currentRole = useMemo<Role | ''>(() => role, [role]);

  const toggleArraySelection = (
    value: string,
    current: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (current.includes(value)) {
      setter(current.filter((id) => id !== value));
      return;
    }
    setter([...current, value]);
  };

  const extractErrorMessage = (error: unknown) => {
    const axiosError = error as AxiosError<ApiError>;
    return axiosError.response?.data?.message ?? 'Something went wrong';
  };

  const handleRegister = async () => {
    if (!role) {
      Alert.alert('Validation Error', 'Role is required');
      return;
    }

    if (currentRole === 'STUDENT' && subjectIds.length === 0) {
      Alert.alert('Validation Error', 'Students must select at least one subject.');
      return;
    }

    if (currentRole === 'TEACHER' && teacherSubjectIds.length === 0) {
      Alert.alert('Validation Error', 'Teachers must select at least one subject to teach.');
      return;
    }

    if (currentRole === 'TEACHER' && teacherClassIds.length === 0) {
      Alert.alert('Validation Error', 'Teachers must select at least one grade/class to teach.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        username,
        name,
        email,
        password,
        role,
        ...(currentRole === 'STUDENT' && {
          schoolClassId: schoolClassId || undefined,
          subjectIds
        }),
        ...(currentRole === 'TEACHER' && {
          teacherSubjectIds,
          teacherClassIds
        }),
      };

      const response = await api.post('/auth/register', payload);
      
      Alert.alert('Success', response.data?.message ?? 'Registration successful! Please log in.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: unknown) {
      Alert.alert('Registration Failed', extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingOptions) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3f51b5" />
        <Text style={styles.loadingText}>Loading registration data...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.title}>Create your Learn Mate account</Text>
        <Text style={styles.subtitle}>Join the educational portal with your role and academic details.</Text>
      </View>

      <View style={styles.formCard}>
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#8a94a6"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          selectionColor="#3f51b5"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#8a94a6"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          selectionColor="#3f51b5"
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#8a94a6"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          selectionColor="#3f51b5"
        />

        <TextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor="#8a94a6"
          value={name}
          onChangeText={setName}
          selectionColor="#3f51b5"
        />

        <Text style={styles.label}>Select Role:</Text>
        <View style={styles.roleContainer}>
          {roles.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleButton, role === r && styles.roleSelected]}
              onPress={() => setRole(r)}
            >
              <Text style={role === r ? styles.roleTextSelected : styles.roleText}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {currentRole === 'STUDENT' && (
          <View style={styles.dynamicContainer}>
            <Text style={styles.label}>Grade/Class</Text>
            <View style={styles.optionWrap}>
              {schoolClasses.map((schoolClass) => (
                <TouchableOpacity
                  key={schoolClass._id}
                  style={[styles.optionChip, schoolClassId === schoolClass._id && styles.optionChipSelected]}
                  onPress={() => setSchoolClassId(schoolClass._id)}
                >
                  <Text style={schoolClassId === schoolClass._id ? styles.optionTextSelected : styles.optionText}>
                    {schoolClass.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Subjects</Text>
            <View style={styles.optionWrap}>
              {subjects.map((subject) => (
                <TouchableOpacity
                  key={subject._id}
                  style={[styles.optionChip, subjectIds.includes(subject._id) && styles.optionChipSelected]}
                  onPress={() => toggleArraySelection(subject._id, subjectIds, setSubjectIds)}
                >
                  <Text style={subjectIds.includes(subject._id) ? styles.optionTextSelected : styles.optionText}>
                    {subject.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {currentRole === 'TEACHER' && (
          <View style={styles.dynamicContainer}>
            <Text style={styles.label}>Grades/Classes to teach</Text>
            <View style={styles.optionWrap}>
              {schoolClasses.map((schoolClass) => (
                <TouchableOpacity
                  key={schoolClass._id}
                  style={[styles.optionChip, teacherClassIds.includes(schoolClass._id) && styles.optionChipSelected]}
                  onPress={() => toggleArraySelection(schoolClass._id, teacherClassIds, setTeacherClassIds)}
                >
                  <Text style={teacherClassIds.includes(schoolClass._id) ? styles.optionTextSelected : styles.optionText}>
                    {schoolClass.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Subjects to teach</Text>
            <View style={styles.optionWrap}>
              {subjects.map((subject) => (
                <TouchableOpacity
                  key={subject._id}
                  style={[styles.optionChip, teacherSubjectIds.includes(subject._id) && styles.optionChipSelected]}
                  onPress={() => toggleArraySelection(subject._id, teacherSubjectIds, setTeacherSubjectIds)}
                >
                  <Text style={teacherSubjectIds.includes(subject._id) ? styles.optionTextSelected : styles.optionText}>
                    {subject.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={submitting}>
          <Ionicons name="person-add-outline" size={18} color="#ffffff" />
          <Text style={styles.buttonText}>{submitting ? 'Creating account...' : 'Create account'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginRow} onPress={() => router.back()}>
          <Text style={styles.loginHint}>Already have an account?</Text>
          <Text style={styles.link}>Login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    gap: 12,
  },
  loadingText: {
    color: '#64748b',
  },
  container: {
    padding: 16,
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    flexGrow: 1,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    marginTop: 6,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
  },
  subtitle: {
    marginTop: 6,
    color: '#64748b',
    lineHeight: 20,
    fontSize: 14,
  },
  dynamicContainer: {
    marginTop: 10,
    marginBottom: 10,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe3ff',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#d5dbe5',
    borderRadius: 16,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 15,
    backgroundColor: '#ffffff',
    color: '#1f2937',
  },
  label: {
    fontSize: 14,
    marginBottom: 10,
    color: '#334155',
    fontWeight: '700',
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  roleButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#3f51b5',
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#edf2ff',
  },
  roleSelected: {
    backgroundColor: '#3f51b5',
  },
  roleText: {
    color: '#3f51b5',
    fontWeight: '700',
    fontSize: 12,
  },
  roleTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: '#d5dbe5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#ffffff',
  },
  optionChipSelected: {
    backgroundColor: '#3f51b5',
    borderColor: '#3f51b5',
  },
  optionText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#3f51b5',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  loginRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  loginHint: {
    color: '#64748b',
    fontSize: 14,
  },
  link: {
    color: '#3f51b5',
    fontSize: 14,
    fontWeight: '700',
  },
});
