import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import type { AxiosError } from 'axios';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { storage } from '../utils/storage';

type ApiError = {
  message?: string;
};

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Validation Error', 'Please enter both username/email and password');
      return;
    }

    try {
      const response = await api.post('/auth/login', { identifier, password });
      
      if (response.data.token) {
        await storage.setItem('userToken', response.data.token);
        await storage.setItem('userRole', response.data.role);
        await storage.setItem('userId', response.data._id);

        if (response.data.role === 'STUDENT') {
          router.replace('/(tabs)/student-dashboard');
        } else if (response.data.role === 'TEACHER') {
          router.replace('/(tabs)/teacher-dashboard');
        } else if (response.data.role === 'ADMIN') {
          router.replace('/(tabs)/admin-dashboard');
        }
      }
    } catch (error: unknown) {
      const axiosError = error as AxiosError<ApiError>;
      const errorMessage = axiosError.response?.data?.message || 'Login failed. Please check your credentials and try again.';
      Alert.alert('Login Failed', errorMessage);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.accentTop} />
      <View style={styles.accentBottom} />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Ionicons name="school-outline" size={26} color="#3f51b5" />
          </View>
          <Text style={styles.welcome}>Welcome Back</Text>
          <Text style={styles.title}>LearnMate Academy</Text>
          <Text style={styles.subtitle}>
            Welcome to Learn Mate. Sign in to access your educational portal.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>
          <Text style={styles.cardSubtitle}>Use your account credentials to continue.</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Username or Email"
              placeholderTextColor="#8a94a6"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              selectionColor="#3f51b5"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#8a94a6"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              selectionColor="#3f51b5"
            />
            <TouchableOpacity onPress={() => setShowPassword((s) => !s)} style={{ paddingHorizontal: 8 }}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.forgotPasswordContainer} onPress={() => router.push('/forgot-password')}>
            <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleLogin} activeOpacity={0.9}>
            <Text style={styles.buttonText}>Login</Text>
            <Ionicons name="arrow-forward" size={18} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.registerRow} onPress={() => router.push('/register')}>
            <Text style={styles.registerHint}>Don&apos;t have an account?</Text>
            <Text style={styles.link}>Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  accentTop: {
    position: 'absolute',
    top: -120,
    right: -90,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#dbe2ff',
  },
  accentBottom: {
    position: 'absolute',
    bottom: -130,
    left: -100,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#e8edff',
  },
  content: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  header: {
    marginBottom: 20,
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  welcome: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: '#3f51b5',
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6b7280',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d5dbe5',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: '#1f2937',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 10,
    marginTop: -4,
  },
  forgotPasswordText: {
    color: '#3f51b5',
    fontWeight: '600',
    fontSize: 14,
  },
  button: {
    marginTop: 4,
    backgroundColor: '#3f51b5',
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  registerRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  registerHint: {
    color: '#6b7280',
    fontSize: 14,
  },
  link: {
    color: '#3f51b5',
    fontSize: 14,
    fontWeight: '700',
  },
});
