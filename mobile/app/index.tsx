import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import type { AxiosError } from 'axios';
import api from '../utils/api';

type ApiError = {
  message?: string;
};

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Validation Error', 'Please enter both username/email and password');
      return;
    }

    try {
      const response = await api.post('/auth/login', { identifier, password });
      
      if (response.data.token) {
        await SecureStore.setItemAsync('userToken', response.data.token);
        await SecureStore.setItemAsync('userRole', response.data.role);
        await SecureStore.setItemAsync('userId', response.data._id);

        if (response.data.role === 'STUDENT') {
          router.replace('/(tabs)/student-dashboard');
        } else if (response.data.role === 'TEACHER') {
          router.replace('/(tabs)/teacher-dashboard');
        } else if (response.data.role === 'PARENT') {
          router.replace('/(tabs)/parent-dashboard');
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
      <Text style={styles.title}>Learn Mate Login</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Username or Email"
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/register')}>
        <Text style={styles.link}>Don&apos;t have an account? Register</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
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
  link: {
    marginTop: 20,
    textAlign: 'center',
    color: '#007AFF',
    fontSize: 16,
  }
});
