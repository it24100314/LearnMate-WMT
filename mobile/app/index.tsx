import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { AxiosError } from 'axios';
import api, { getActiveApiUrl } from '../utils/api';
import * as Storage from '../utils/storage';

type ApiError = {
  message?: string;
};

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    if (loading) return;

    if (!username.trim() || !password) {
      setLoginError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setLoginError('');
    try {
      const response = await api.post('/auth/login', { username, password });
      
      if (response.data.token) {
        await Storage.setItemAsync('userToken', response.data.token);
        await Storage.setItemAsync('userRole', response.data.role);
        await Storage.setItemAsync('userId', response.data._id);

        if (response.data.role === 'STUDENT') {
          router.replace('/(tabs)/student-dashboard');
        } else if (response.data.role === 'TEACHER') {
          router.replace('/(tabs)/teacher-dashboard');
        } else if (response.data.role === 'PARENT') {
          router.replace('/(tabs)/parent-dashboard');
        } else {
          router.replace('/(tabs)/admin-dashboard');
        }
      }
    } catch (error: unknown) {
      const axiosError = error as AxiosError<ApiError>;
      const message = axiosError.response?.data?.message
        || (!axiosError.response
          ? `Cannot connect to server (${getActiveApiUrl()}). Check backend and network.`
          : 'Something went wrong');
      setLoginError(message);
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.brand}>LearnMate</Text>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Login to continue to your dashboard</Text>

          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} style={styles.eyeButton}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
          </TouchableOpacity>

          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={() => router.push('/forgot-password')}>
              <Text style={styles.link}>Forgot Password?</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.link}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#eef2ff',
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbeafe',
    padding: 22,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  brand: {
    textAlign: 'center',
    color: '#1d4ed8',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 15,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  passwordContainer: {
    height: 48,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    marginBottom: 15,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
  },
  eyeButton: {
    paddingLeft: 10,
    paddingVertical: 6,
  },
  button: {
    backgroundColor: '#2563eb',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  errorText: {
    marginBottom: 8,
    color: '#DC2626',
    textAlign: 'left',
    fontSize: 14,
  },
  actionsRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  link: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  }
});
