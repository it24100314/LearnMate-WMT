import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
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
  paymentSlipPath?: string;
  updatedAt?: string;
};

const today = new Date().toISOString().slice(0, 10);

const formatMoney = (value: number) => `$${Number(value || 0).toFixed(2)}`;

export default function FeesScreen() {
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyFeeId, setBusyFeeId] = useState<string | null>(null);

  const [outstandingFees, setOutstandingFees] = useState<Fee[]>([]);
  const [historyFees, setHistoryFees] = useState<Fee[]>([]);
  const [pendingVerificationFees, setPendingVerificationFees] = useState<Fee[]>([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);

  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const [dateDrafts, setDateDrafts] = useState<Record<string, string>>({});

  const statusColor = useMemo(
    () => ({
      PENDING: '#b45309',
      OVERDUE: '#b91c1c',
      PAID_PENDING: '#1d4ed8',
      PAID: '#15803d',
    }),
    []
  );

  const loadFees = async () => {
    try {
      const savedRole = (await SecureStore.getItemAsync('userRole')) || '';
      setRole(savedRole);

      if (savedRole === 'STUDENT') {
        const response = await api.get('/fees/my-fees');
        const nextOutstanding: Fee[] = response.data?.outstandingFees ?? [];
        const nextHistory: Fee[] = response.data?.historyFees ?? [];

        setOutstandingFees(nextOutstanding);
        setHistoryFees(nextHistory);
        setTotalOutstanding(Number(response.data?.totalOutstanding ?? 0));
        setPendingVerificationFees([]);

        const nextAmounts: Record<string, string> = {};
        const nextDates: Record<string, string> = {};
        nextOutstanding.forEach((fee) => {
          nextAmounts[fee._id] = String(fee.amount ?? '');
          nextDates[fee._id] = today;
        });
        setAmountDrafts(nextAmounts);
        setDateDrafts(nextDates);
        return;
      }

      if (savedRole === 'ADMIN') {
        const response = await api.get('/fees/list');
        const allFees: Fee[] = response.data?.fees ?? [];
        const pending = allFees
          .filter((fee) => fee.status === 'PAID_PENDING')
          .sort((a, b) => {
            const left = new Date(a.submittedDate || a.updatedAt || a.dueDate).getTime();
            const right = new Date(b.submittedDate || b.updatedAt || b.dueDate).getTime();
            return right - left;
          });

        setPendingVerificationFees(pending);
        setOutstandingFees([]);
        setHistoryFees([]);
        setTotalOutstanding(0);
        return;
      }

      setOutstandingFees([]);
      setHistoryFees([]);
      setPendingVerificationFees([]);
      setTotalOutstanding(0);
    } catch (error: any) {
      Alert.alert('Fees', error?.response?.data?.message || 'Failed to load fees');
      setOutstandingFees([]);
      setHistoryFees([]);
      setPendingVerificationFees([]);
      setTotalOutstanding(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFees();
  }, []);

  const submitSlip = async (fee: Fee) => {
    const amountText = (amountDrafts[fee._id] || '').trim();
    const slipDate = (dateDrafts[fee._id] || today).trim();
    const amount = Number(amountText);

    if (!amountText || Number.isNaN(amount) || amount <= 0) {
      Alert.alert('Validation', 'Enter a valid payment amount.');
      return;
    }

    if (!slipDate) {
      Alert.alert('Validation', 'Enter slip date in YYYY-MM-DD format.');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: ['application/pdf', 'image/*'],
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const picked = result.assets[0];
      setBusyFeeId(fee._id);

      const formData = new FormData();
      formData.append('feeId', fee._id);
      formData.append('amount', amountText);
      formData.append('slipDate', slipDate);
      formData.append('slip', {
        uri: picked.uri,
        name: picked.name || 'slip.pdf',
        type: picked.mimeType || 'application/pdf',
      } as any);

      await api.post('/fees/upload-slip', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Success', 'Payment slip uploaded. Waiting for admin verification.');
      await loadFees();
    } catch (error: any) {
      Alert.alert('Upload Failed', error?.response?.data?.message || 'Unable to upload payment slip');
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

  const onRefresh = () => {
    setRefreshing(true);
    loadFees();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3f51b5" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Fee Management</Text>
        <Text style={styles.heroText}>
          {role === 'STUDENT'
            ? 'Review outstanding fees and upload your payment slips.'
            : 'Review submitted slips and verify student payments.'}
        </Text>
      </View>

      {role === 'STUDENT' ? (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Outstanding</Text>
            <Text style={styles.summaryAmount}>{formatMoney(totalOutstanding)}</Text>
          </View>

          <Text style={styles.sectionTitle}>Outstanding Fees</Text>
          {outstandingFees.length === 0 ? <Text style={styles.empty}>No outstanding fees.</Text> : null}

          {outstandingFees.map((fee) => (
            <View key={fee._id} style={styles.card}>
              <Text style={styles.title}>{fee.subject?.name || 'Subject Fee'}</Text>
              <Text style={styles.meta}>Due Date: {new Date(fee.dueDate).toLocaleDateString()}</Text>
              <Text style={styles.amount}>Amount: {formatMoney(fee.amount)}</Text>
              <Text style={[styles.status, { color: statusColor[fee.status] || '#111827' }]}>Status: {fee.status}</Text>

              <View style={styles.paySection}>
                <TextInput
                  value={amountDrafts[fee._id]}
                  onChangeText={(value) => setAmountDrafts((prev) => ({ ...prev, [fee._id]: value }))}
                  keyboardType="decimal-pad"
                  style={styles.input}
                  placeholder="Amount"
                  placeholderTextColor="#8a94a6"
                  selectionColor="#3f51b5"
                />
                <TextInput
                  value={dateDrafts[fee._id]}
                  onChangeText={(value) => setDateDrafts((prev) => ({ ...prev, [fee._id]: value }))}
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#8a94a6"
                  selectionColor="#3f51b5"
                />
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => submitSlip(fee)}
                  disabled={busyFeeId === fee._id}
                >
                  <Ionicons name="cloud-upload-outline" size={18} color="#ffffff" />
                  <Text style={styles.buttonText}>{busyFeeId === fee._id ? 'Uploading...' : 'Upload Payment Slip'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <Text style={styles.sectionTitle}>Payment History</Text>
          {historyFees.length === 0 ? <Text style={styles.empty}>No payment history yet.</Text> : null}

          {historyFees.map((fee) => (
            <View key={fee._id} style={styles.card}>
              <Text style={styles.title}>{fee.subject?.name || 'Subject Fee'}</Text>
              <Text style={styles.meta}>Due Date: {new Date(fee.dueDate).toLocaleDateString()}</Text>
              {fee.submittedDate ? (
                <Text style={styles.meta}>Submitted: {new Date(fee.submittedDate).toLocaleDateString()}</Text>
              ) : null}
              {fee.paymentDate ? (
                <Text style={styles.meta}>Paid On: {new Date(fee.paymentDate).toLocaleDateString()}</Text>
              ) : null}
              <Text style={styles.amount}>Amount: {formatMoney(fee.amount)}</Text>
              <Text style={[styles.status, { color: statusColor[fee.status] || '#111827' }]}>Status: {fee.status}</Text>
            </View>
          ))}
        </>
      ) : null}

      {role === 'ADMIN' ? (
        <>
          <Text style={styles.sectionTitle}>Pending Slip Verification</Text>
          {pendingVerificationFees.length === 0 ? <Text style={styles.empty}>No pending slips to verify.</Text> : null}

          {pendingVerificationFees.map((fee) => (
            <View key={fee._id} style={styles.card}>
              <Text style={styles.title}>{fee.subject?.name || 'Subject Fee'}</Text>
              <Text style={styles.meta}>Student: {fee.student?.name || '-'}</Text>
              <Text style={styles.meta}>Class: {fee.schoolClass?.name || '-'}</Text>
              <Text style={styles.meta}>Due Date: {new Date(fee.dueDate).toLocaleDateString()}</Text>
              {fee.submittedDate ? (
                <Text style={styles.meta}>Submitted Date: {new Date(fee.submittedDate).toLocaleDateString()}</Text>
              ) : null}
              <Text style={styles.meta}>Submitted Amount: {formatMoney(fee.submittedAmount || fee.amount)}</Text>
              <Text style={[styles.status, { color: statusColor[fee.status] || '#111827' }]}>Status: {fee.status}</Text>

              <TouchableOpacity
                style={[styles.button, styles.verifyButton]}
                onPress={() => verifyPayment(fee._id)}
                disabled={busyFeeId === fee._id}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
                <Text style={styles.buttonText}>{busyFeeId === fee._id ? 'Verifying...' : 'Verify Payment'}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 16,
    paddingBottom: 26,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#dbe4ff',
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  summaryLabel: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  summaryAmount: {
    marginTop: 6,
    color: '#1d4ed8',
    fontSize: 28,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 10,
    marginTop: 4,
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
    marginBottom: 14,
  },
});
