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
import * as Storage from '../utils/storage';
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
      const savedRole = await Storage.getItemAsync('userRole');
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

      await api.post('/fees/parent-pay', formData, {
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
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <FlatList
      data={fees}
      keyExtractor={(item) => item._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadFees(); }} />}
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

          {role === 'PARENT' && item.status === 'PENDING' ? (
            <View style={styles.paySection}>
              <TextInput
                value={amountDrafts[item._id]}
                onChangeText={(value) => setAmountDrafts((prev) => ({ ...prev, [item._id]: value }))}
                keyboardType="decimal-pad"
                style={styles.input}
                placeholder="Amount"
              />
              <TextInput
                value={dateDrafts[item._id]}
                onChangeText={(value) => setDateDrafts((prev) => ({ ...prev, [item._id]: value }))}
                style={styles.input}
                placeholder="YYYY-MM-DD"
              />
              <TouchableOpacity
                style={styles.button}
                onPress={() => submitPayment(item)}
                disabled={busyFeeId === item._id}
              >
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
    backgroundColor: '#f9fafb',
  },
  list: {
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1d4ed8',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  meta: {
    fontSize: 13,
    color: '#4b5563',
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
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 4,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  verifyButton: {
    backgroundColor: '#059669',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  empty: {
    color: '#6b7280',
    fontSize: 15,
  },
});

