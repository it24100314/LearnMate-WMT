import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { AxiosError } from 'axios';
import api from '../utils/api';

type Role = 'STUDENT' | 'TEACHER' | 'PARENT';

type NamedOption = {
  _id: string;
  name: string;
};

type StudentOption = {
  _id: string;
  name: string;
  username: string;
};

type RegisterOptionsResponse = {
  roles: Role[];
  schoolClasses: NamedOption[];
  subjects: NamedOption[];
  students: StudentOption[];
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
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role | ''>('');

  const [schoolClassId, setSchoolClassId] = useState('');
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [teacherSubjectIds, setTeacherSubjectIds] = useState<string[]>([]);
  const [teacherClassIds, setTeacherClassIds] = useState<string[]>([]);
  const [childIds, setChildIds] = useState<string[]>([]);

  const [roles, setRoles] = useState<Role[]>(['STUDENT', 'TEACHER', 'PARENT']);
  const [schoolClasses, setSchoolClasses] = useState<NamedOption[]>([]);
  const [subjects, setSubjects] = useState<NamedOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const response = await api.get<RegisterOptionsResponse>('/auth/register-options');
        setRoles(response.data.roles ?? ['STUDENT', 'TEACHER', 'PARENT']);
        setSchoolClasses(response.data.schoolClasses ?? []);
        setSubjects(response.data.subjects ?? []);
        setStudents(response.data.students ?? []);
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
    setChildIds([]);
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
    const trimmedUsername = username.trim();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      Alert.alert('Validation Error', 'Name is required');
      return;
    }
    if (!trimmedUsername) {
      Alert.alert('Validation Error', 'Username is required');
      return;
    }
    if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
      Alert.alert('Validation Error', 'Username must be between 3 and 50 characters');
      return;
    }
    if (!trimmedEmail) {
      Alert.alert('Validation Error', 'Email is required');
      return;
    }
    if (!/.+\@.+\..+/.test(trimmedEmail)) {
      Alert.alert('Validation Error', 'Email should be valid');
      return;
    }
    if (!password || !/^(?=.*[a-z])(?=.*[A-Z]).{8,}$/.test(password)) {
      Alert.alert(
        'Validation Error',
        'Password must be at least 8 characters long and include uppercase and lowercase letters.'
      );
      return;
    }

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

    if (currentRole === 'PARENT' && childIds.length === 0) {
      Alert.alert('Validation Error', 'Parent must select at least one registered child');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        username: trimmedUsername,
        name: trimmedName,
        email: trimmedEmail,
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
        ...(currentRole === 'PARENT' && {
          childIds
        }),
      };

      const response = await api.post('/auth/register', payload);
      
      Alert.alert('Success', response.data?.message ?? 'Registration request sent to admin for approval.', [
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
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading registration data...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create your Learn Mate account</Text>

      <TextInput
        style={styles.input}
        placeholder="Full name"
        placeholderTextColor="#94a3b8"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#94a3b8"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          placeholderTextColor="#94a3b8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} style={styles.eyeButton}>
          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Email address"
        placeholderTextColor="#94a3b8"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
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

      {currentRole === 'PARENT' && (
        <View style={styles.dynamicContainer}>
          <Text style={styles.label}>Choose your child/children</Text>
          <View style={styles.optionWrap}>
            {students.map((student) => (
              <TouchableOpacity
                key={student._id}
                style={[styles.optionChip, childIds.includes(student._id) && styles.optionChipSelected]}
                onPress={() => toggleArraySelection(student._id, childIds, setChildIds)}
              >
                <Text style={childIds.includes(student._id) ? styles.optionTextSelected : styles.optionText}>
                  {student.name} ({student.username})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <TouchableOpacity style={[styles.button, submitting && styles.buttonDisabled]} onPress={handleRegister} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? 'Creating account...' : 'Create account'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.link}>Already have an account? Login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    gap: 12,
  },
  loadingText: {
    color: '#555',
  },
  container: {
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  dynamicContainer: {
    marginTop: 10,
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF'
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#fff'
  },
  passwordContainer: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
  },
  eyeButton: {
    paddingLeft: 10,
    paddingVertical: 6,
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
    fontWeight: 'bold',
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
    borderColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  roleSelected: {
    backgroundColor: '#007AFF',
  },
  roleText: {
    color: '#007AFF',
  },
  roleTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: '#d0d7de',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  optionChipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionText: {
    color: '#333',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#34C759',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  link: {
    marginTop: 20,
    textAlign: 'center',
    color: '#007AFF',
    fontSize: 16,
  }
});
