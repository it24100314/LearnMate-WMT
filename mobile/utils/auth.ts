import { storage } from './storage';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

/**
 * Clears all stored authentication data
 */
export const clearAuthData = async () => {
  try {
    await storage.deleteItem('userToken');
    await storage.deleteItem('userRole');
    await storage.deleteItem('userId');
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
    
    const executeLogout = () => {
      try {
        if (router.dismissAll) router.dismissAll();
      } catch(e) {}
      router.replace('/');
    };

    // Show alert if message is provided
    if (message) {
      Alert.alert('Logged Out', message, [
        {
          text: 'OK',
          onPress: executeLogout,
        },
      ]);
    } else {
      executeLogout();
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

  // Don't auto-logout to prevent navigation bugs on swipe-back.
  // The user must manually click logout to reach the login screen.
  if (status === 401 || status === 403) {
    Alert.alert('Access Denied', message || 'You do not have permission for this action.');
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
