import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';

type Subject = { _id: string; name: string };
type SchoolClass = { _id: string; name: string };
type Student = { _id: string; name: string; username?: string };
type Fee = {
  _id: string;
  student?: Student;
  subject?: Subject;
  schoolClass?: SchoolClass;
  amount: number;
  dueDate: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'PAID_PENDING';
  submittedAmount?: number;
  submittedDate?: string;
  paymentDate?: string;
};

const today = new Date().toISOString().slice(0, 10);

export default function FeesScreen() {
  const [role, setRole] = useState('');
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyFeeId, setBusyFeeId] = useState<string | null>(null);
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const [dateDrafts, setDateDrafts] = useState<Record<string, string>>({});

  const loadFees = async () => {
    try {
      const savedRole = await SecureStore.getItemAsync('userRole');
      setRole(savedRole || '');

      const response = await api.get('/fees/list');
      const items: Fee[] = response.data?.fees ?? [];
      setFees(items);

      const nextAmounts: Record<string, string> = {};
      const nextDates: Record<string, string> = {};
      items.forEach((fee) => {
        nextAmounts[fee._id] = String(fee.amount ?? '');
        nextDates[fee._id] = today;
      });
      setAmountDrafts(nextAmounts);
      setDateDrafts(nextDates);
    } catch (error: any) {
      Alert.alert('Fees', error?.response?.data?.message || 'Failed to load fees');
      setFees([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFees();
  }, []);

  const statusColor = useMemo(() => ({
    PENDING: '#b45309',
    OVERDUE: '#b91c1c',
    PAID_PENDING: '#1d4ed8',
    PAID: '#15803d',
  }), []);

  const submitPayment = async (fee: Fee) => {
    try {
      const amount = amountDrafts[fee._id] || '';
      const slipDate = dateDrafts[fee._id] || today;

      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: ['application/pdf', 'image/*'],
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      setBusyFeeId(fee._id);
      const picked = result.assets[0];

      const formData = new FormData();
      formData.append('studentId', fee.student?._id || '');
      formData.append('subjectId', fee.subject?._id || '');
      formData.append('amount', amount);
      formData.append('slipDate', slipDate);
      formData.append('slip', {
        uri: picked.uri,
        name: picked.name || 'slip.pdf',
        type: picked.mimeType || 'application/pdf',
      } as unknown as Blob);

      await api.post('/fees/student-pay', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Success', 'Payment submitted for verification.');
      await loadFees();
    } catch (error: any) {
      Alert.alert('Payment Failed', error?.response?.data?.message || 'Unable to submit payment');
    } finally {
      setBusyFeeId(null);
    }
  };

  const verifyPayment = async (feeId: string) => {
    try {
      setBusyFeeId(feeId);
      await api.post(`/fees/verify/${feeId}`);
      Alert.alert('Success', 'Payment verified successfully.');
      await loadFees();
    } catch (error: any) {
      Alert.alert('Verify Failed', error?.response?.data?.message || 'Unable to verify payment');
    } finally {
      setBusyFeeId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3f51b5" />
      </View>
    );
  }

  return (
    <FlatList
      data={fees}
      keyExtractor={(item) => item._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadFees(); }} />}
      ListHeaderComponent={
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Fee Management</Text>
          <Text style={styles.heroText}>Track fee status, upload payment slips, and verify pending submissions.</Text>
        </View>
      }
      contentContainerStyle={fees.length === 0 ? styles.center : styles.list}
      ListEmptyComponent={<Text style={styles.empty}>No fee records available.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.title}>{item.subject?.name || 'Subject Fee'}</Text>
          <Text style={styles.meta}>Student: {item.student?.name || '-'}</Text>
          <Text style={styles.meta}>Class: {item.schoolClass?.name || '-'}</Text>
          <Text style={styles.meta}>Due Date: {new Date(item.dueDate).toLocaleDateString()}</Text>
          <Text style={styles.amount}>Amount: ${item.amount}</Text>
          <Text style={[styles.status, { color: statusColor[item.status] || '#111827' }]}>Status: {item.status}</Text>

          {item.status === 'PAID_PENDING' && item.submittedAmount ? (
            <Text style={styles.meta}>Submitted: ${item.submittedAmount}</Text>
          ) : null}

          {role === 'STUDENT' && item.status === 'PENDING' ? (
            <View style={styles.paySection}>
              <TextInput
                value={amountDrafts[item._id]}
                onChangeText={(value) => setAmountDrafts((prev) => ({ ...prev, [item._id]: value }))}
                keyboardType="decimal-pad"
                style={styles.input}
                placeholder="Amount"
                placeholderTextColor="#8a94a6"
                selectionColor="#3f51b5"
              />
              <TextInput
                value={dateDrafts[item._id]}
                onChangeText={(value) => setDateDrafts((prev) => ({ ...prev, [item._id]: value }))}
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#8a94a6"
                selectionColor="#3f51b5"
              />
              <TouchableOpacity
                style={styles.button}
                onPress={() => submitPayment(item)}
                disabled={busyFeeId === item._id}
              >
                <Ionicons name="cloud-upload-outline" size={18} color="#ffffff" />
                <Text style={styles.buttonText}>{busyFeeId === item._id ? 'Submitting...' : 'Upload Slip & Submit'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {role === 'ADMIN' && item.status === 'PAID_PENDING' ? (
            <TouchableOpacity
              style={[styles.button, styles.verifyButton]}
              onPress={() => verifyPayment(item._id)}
              disabled={busyFeeId === item._id}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
              <Text style={styles.buttonText}>{busyFeeId === item._id ? 'Verifying...' : 'Verify Payment'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  list: {
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1f2937',
  },
  heroText: {
    marginTop: 6,
    color: '#64748b',
    lineHeight: 20,
    fontSize: 14,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#edf0f5',
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
  },
  meta: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 3,
  },
  amount: {
    marginTop: 6,
    fontWeight: '700',
    color: '#0f172a',
  },
  status: {
    marginTop: 6,
    fontWeight: '700',
  },
  paySection: {
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d5dbe5',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    color: '#1f2937',
  },
  button: {
    marginTop: 4,
    backgroundColor: '#3f51b5',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  verifyButton: {
    backgroundColor: '#16a34a',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  empty: {
    color: '#64748b',
    fontSize: 15,
  },
});
