import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

/**
 * Clears all stored authentication data
 */
export const clearAuthData = async () => {
  try {
    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('userRole');
    await SecureStore.deleteItemAsync('userId');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

/**
 * Logs out the user and redirects to login screen
 */
export const logout = async (router: any, message: string = 'Session expired. Please log in again.') => {
  try {
    await clearAuthData();
    
    // Show alert if message is provided
    if (message) {
      Alert.alert('Session Expired', message, [
        {
          text: 'OK',
          onPress: () => router.replace('/'),
        },
      ]);
    } else {
      router.replace('/');
    }
  } catch (error) {
    console.error('Error during logout:', error);
    router.replace('/');
  }
};

/**
 * Handles API errors and performs logout if needed
 */
export const handleApiError = async (
  error: any,
  router: any,
  defaultMessage: string = 'Something went wrong'
) => {
  const status = error?.response?.status;
  const message = error?.response?.data?.message || defaultMessage;

  // If unauthorized, log out the user
  if (status === 401 || status === 403) {
    await logout(router, 'Your session has expired. Please log in again.');
    return 'unauthorized';
  }

  // For other errors, show the error message
  if (message) {
    Alert.alert('Error', message);
  } else {
    Alert.alert('Error', defaultMessage);
  }

  return 'error';
};
