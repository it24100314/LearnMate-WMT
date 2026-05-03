import React, { useEffect, useMemo, useState, useRef } from 'react';
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
  Modal,
  FlatList,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import api, { API_URL } from '../utils/api';
import { Linking } from 'react-native';

type Subject = { _id: string; name: string };
type SchoolClass = { _id: string; name: string };
type Student = { _id: string; name: string; username?: string; email?: string };

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

  // Admin UI state
  const [feeOptions, setFeeOptions] = useState<{ students: any[]; subjects: any[]; schoolClasses: any[] } | null>(null);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [showCreateFee, setShowCreateFee] = useState(false);
  const [showCreateSubjectFee, setShowCreateSubjectFee] = useState(false);
  const [createFeeDraft, setCreateFeeDraft] = useState<{ studentId?: string; subjectId?: string; schoolClassId?: string; amount?: string; dueDate?: string }>(
    {}
  );
  const [createSubjectDraft, setCreateSubjectDraft] = useState<{ subjectId?: string; schoolClassId?: string; amount?: string; dueDate?: string }>({});
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Fee[]>([]);
  const [searchMatches, setSearchMatches] = useState<Student[]>([]);

  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const [dateDrafts, setDateDrafts] = useState<Record<string, string>>({});

  const [studentSuggestions, setStudentSuggestions] = useState<Student[]>([]);
  const debounceRef = useRef<any>(null);

  // Picker modal state for subjects/classes
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerItems, setPickerItems] = useState<any[]>([]);
  const [pickerTitle, setPickerTitle] = useState('Select');
  const [pickerOnSelect, setPickerOnSelect] = useState<(id: string) => void>(() => () => {});
  const [pickerSelectedId, setPickerSelectedId] = useState<string | undefined>(undefined);

  const statusColor = useMemo(
    () => ({
      PENDING: '#b45309',
      OVERDUE: '#b91c1c',
      PAID_PENDING: '#1d4ed8',
      PAID: '#15803d',
    }),
    []
  );

  const loadFeeOptions = async () => {
    try {
      const res = await api.get('/fees/options');
      setFeeOptions(res.data || { students: [], subjects: [], schoolClasses: [] });
    } catch (err) {
      setFeeOptions({ students: [], subjects: [], schoolClasses: [] });
    }
  };

  const loadStudentsList = async () => {
    try {
      const res = await api.get('/users', { params: { role: 'STUDENT', q: '' } });
      setStudentsList(res.data || []);
    } catch (err) {
      setStudentsList([]);
    }
  };

  const fetchStudentSuggestions = async (q: string) => {
    try {
      const res = await api.get('/users', { params: { q, role: 'STUDENT' } });
      setStudentSuggestions(res.data || []);
    } catch (err) {
      setStudentSuggestions([]);
    }
  };

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
        await Promise.all([loadFeeOptions(), loadStudentsList()]);
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

  const openPicker = (title: string, items: any[], selectedId: string | undefined, onSelect: (id: string) => void) => {
    setPickerTitle(title);
    setPickerItems(items || []);
    setPickerSelectedId(selectedId);
    setPickerOnSelect(() => onSelect);
    setPickerVisible(true);
  };

  // Picker modal JSX
  const PickerModal = () => (
    <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{pickerTitle}</Text>
          <FlatList
            data={pickerItems}
            keyExtractor={(item) => item._id}
            style={{ maxHeight: 300 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  pickerOnSelect(item._id);
                  setPickerVisible(false);
                }}
                style={styles.modalItem}
              >
                <Text style={{ color: pickerSelectedId === item._id ? '#1d4ed8' : '#0f172a' }}>{item.name}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#edf2f7' }} />}
          />

          <TouchableOpacity style={styles.modalClose} onPress={() => setPickerVisible(false)}>
            <Text style={{ color: '#64748b', fontWeight: '700' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

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

      if (result.canceled || !result.assets?.[0]) return;

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

  const rejectFee = async (feeId: string) => {
    try {
      await api.put(`/fees/edit/${feeId}`, { status: 'PENDING' });
      Alert.alert('Rejected', 'Payment marked as pending/rejected');
      await loadFees();
    } catch (err: any) {
      Alert.alert('Reject Failed', err?.response?.data?.message || 'Unable to reject payment');
    }
  };

  const createFee = async () => {
    try {
      const body = {
        studentId: createFeeDraft.studentId,
        subjectId: createFeeDraft.subjectId,
        schoolClassId: createFeeDraft.schoolClassId,
        amount: Number(createFeeDraft.amount),
        dueDate: createFeeDraft.dueDate,
      };
      await api.post('/fees/create', body);
      Alert.alert('Success', 'Fee created');
      setShowCreateFee(false);
      setCreateFeeDraft({});
      await loadFees();
    } catch (error: any) {
      Alert.alert('Create Failed', error?.response?.data?.message || 'Unable to create fee');
    }
  };

  const createSubjectFee = async () => {
    try {
      const body = {
        subjectId: createSubjectDraft.subjectId,
        schoolClassId: createSubjectDraft.schoolClassId,
        amount: Number(createSubjectDraft.amount),
        dueDate: createSubjectDraft.dueDate,
      };
      await api.post('/fees/create-subject-fee', body);
      Alert.alert('Success', 'Subject fees created');
      setShowCreateSubjectFee(false);
      setCreateSubjectDraft({});
      await loadFees();
    } catch (error: any) {
      Alert.alert('Create Failed', error?.response?.data?.message || 'Unable to create subject fees');
    }
  };

  const deleteFee = async (feeId: string) => {
    try {
      await api.delete(`/fees/delete/${feeId}`);
      Alert.alert('Deleted', 'Fee deleted successfully');
      await loadFees();
    } catch (error: any) {
      Alert.alert('Delete Failed', error?.response?.data?.message || 'Unable to delete fee');
    }
  };

  const searchFees = async () => {
    try {
      if (!searchStudentQuery) {
        Alert.alert('Validation', 'Enter student username or email to search');
        return;
      }

      const usersRes = await api.get('/users', { params: { q: searchStudentQuery, role: 'STUDENT' } });
      const users: Student[] = usersRes.data || [];
      if (users.length === 0) {
        Alert.alert('Not found', 'No students matched that username or email');
        return;
      }

      if (users.length === 1) {
        const studentId = users[0]._id;
        const res = await api.get('/fees/search', { params: { studentId } });
        setSearchResults(res.data?.fees || []);
        return;
      }

      setSearchResults([]);
      setSearchMatches(users);
      Alert.alert('Multiple matches', 'Multiple students found — pick one from the list below');
    } catch (error: any) {
      Alert.alert('Search Failed', error?.response?.data?.message || 'Unable to search fees');
    }
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadFees(); }} />}
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Fee Management</Text>
        <Text style={styles.heroText}>{role === 'STUDENT' ? 'Review outstanding fees and upload your payment slips.' : 'Review submitted slips and verify student payments.'}</Text>
      </View>

      {pickerVisible && <PickerModal />}

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
                <TouchableOpacity style={styles.button} onPress={() => submitSlip(fee)} disabled={busyFeeId === fee._id}>
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
              {fee.submittedDate ? <Text style={styles.meta}>Submitted: {new Date(fee.submittedDate).toLocaleDateString()}</Text> : null}
              {fee.paymentDate ? <Text style={styles.meta}>Paid On: {new Date(fee.paymentDate).toLocaleDateString()}</Text> : null}
              <Text style={styles.amount}>Amount: {formatMoney(fee.amount)}</Text>
              <Text style={[styles.status, { color: statusColor[fee.status] || '#111827' }]}>Status: {fee.status}</Text>
            </View>
          ))}
        </>
      ) : null}

      {role === 'ADMIN' ? (
        <>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            <TouchableOpacity style={styles.button} onPress={() => setShowCreateFee((s) => !s)}>
              <Text style={styles.buttonText}>{showCreateFee ? 'Close Create' : 'Create Fee'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => setShowCreateSubjectFee((s) => !s)}>
              <Text style={styles.buttonText}>{showCreateSubjectFee ? 'Close Bulk' : 'Create Subject Fees'}</Text>
            </TouchableOpacity>
          </View>

          {showCreateFee && (
            <View style={styles.card}>
              <Text style={styles.title}>Create Fee</Text>

              <Text style={{ marginBottom: 6, color: '#475569' }}>Student (type username or email)</Text>
              <TextInput
                placeholder="Type username or email"
                value={searchStudentQuery}
                onChangeText={(t) => {
                  setSearchStudentQuery(t);
                  setCreateFeeDraft((p) => ({ ...p, studentId: undefined }));
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  debounceRef.current = setTimeout(() => {
                    if (String(t).trim().length > 1) fetchStudentSuggestions(t.trim());
                    else setStudentSuggestions([]);
                  }, 300);
                }}
                style={styles.input}
              />

              {studentSuggestions.length > 0 && (
                <View style={{ maxHeight: 140, marginBottom: 8 }}>
                  <ScrollView>
                    {studentSuggestions.map((s) => (
                      <TouchableOpacity
                        key={s._id}
                        onPress={() => {
                          setCreateFeeDraft((p) => ({ ...p, studentId: s._id }));
                          setSearchStudentQuery(`${s.name} • ${s.username} ${s.email ? `(${s.email})` : ''}`);
                          setStudentSuggestions([]);
                        }}
                        style={{ paddingVertical: 8 }}
                      >
                        <Text style={{ color: '#0f172a' }}>{s.name} — {s.username} {s.email ? `(${s.email})` : ''}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={{ marginBottom: 6, color: '#475569' }}>Subject</Text>
              <TouchableOpacity
                style={[styles.input, { justifyContent: 'center' }]}
                onPress={() => openPicker('Select Subject', feeOptions?.subjects || [], createFeeDraft.subjectId, (id) => setCreateFeeDraft((p) => ({ ...p, subjectId: id })))}
              >
                <Text style={{ color: createFeeDraft.subjectId ? '#0f172a' : '#8a94a6' }}>
                  {feeOptions?.subjects.find((s: any) => s._id === createFeeDraft.subjectId)?.name || 'Select subject...'}
                </Text>
              </TouchableOpacity>

              <Text style={{ marginBottom: 6, color: '#475569' }}>Class</Text>
              <TouchableOpacity
                style={[styles.input, { justifyContent: 'center' }]}
                onPress={() => openPicker('Select Class', feeOptions?.schoolClasses || [], createFeeDraft.schoolClassId, (id) => setCreateFeeDraft((p) => ({ ...p, schoolClassId: id })))}
              >
                <Text style={{ color: createFeeDraft.schoolClassId ? '#0f172a' : '#8a94a6' }}>
                  {feeOptions?.schoolClasses.find((c: any) => c._id === createFeeDraft.schoolClassId)?.name || 'Select class...'}
                </Text>
              </TouchableOpacity>

              <Text style={{ marginBottom: 6, color: '#475569' }}>Amount</Text>
              <TextInput placeholder="Amount" placeholderTextColor="#8a94a6" value={createFeeDraft.amount} onChangeText={(t) => setCreateFeeDraft((p) => ({ ...p, amount: t }))} keyboardType="decimal-pad" style={styles.input} />

              <Text style={{ marginBottom: 6, color: '#475569' }}>Due Date</Text>
              <TextInput placeholder="Due Date (YYYY-MM-DD)" placeholderTextColor="#8a94a6" value={createFeeDraft.dueDate} onChangeText={(t) => setCreateFeeDraft((p) => ({ ...p, dueDate: t }))} style={styles.input} />
              <TouchableOpacity style={styles.button} onPress={createFee}>
                <Text style={styles.buttonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          )}

          {showCreateSubjectFee && (
            <View style={styles.card}>
              <Text style={styles.title}>Create Subject Fees (Bulk)</Text>

              <Text style={{ marginBottom: 6, color: '#475569' }}>Subject</Text>
              <TouchableOpacity
                style={[styles.input, { justifyContent: 'center' }]}
                onPress={() => openPicker('Select Subject', feeOptions?.subjects || [], createSubjectDraft.subjectId, (id) => setCreateSubjectDraft((p) => ({ ...p, subjectId: id })))}
              >
                <Text style={{ color: createSubjectDraft.subjectId ? '#0f172a' : '#8a94a6' }}>
                  {feeOptions?.subjects.find((s: any) => s._id === createSubjectDraft.subjectId)?.name || 'Select subject...'}
                </Text>
              </TouchableOpacity>

              <Text style={{ marginBottom: 6, color: '#475569' }}>Class</Text>
              <TouchableOpacity
                style={[styles.input, { justifyContent: 'center' }]}
                onPress={() => openPicker('Select Class', feeOptions?.schoolClasses || [], createSubjectDraft.schoolClassId, (id) => setCreateSubjectDraft((p) => ({ ...p, schoolClassId: id })))}
              >
                <Text style={{ color: createSubjectDraft.schoolClassId ? '#0f172a' : '#8a94a6' }}>
                  {feeOptions?.schoolClasses.find((c: any) => c._id === createSubjectDraft.schoolClassId)?.name || 'Select class...'}
                </Text>
              </TouchableOpacity>

              <Text style={{ marginBottom: 6, color: '#475569' }}>Amount</Text>
              <TextInput placeholder="Amount" placeholderTextColor="#8a94a6" value={createSubjectDraft.amount} onChangeText={(t) => setCreateSubjectDraft((p) => ({ ...p, amount: t }))} keyboardType="decimal-pad" style={styles.input} />

              <Text style={{ marginBottom: 6, color: '#475569' }}>Due Date</Text>
              <TextInput placeholder="Due Date (YYYY-MM-DD)" placeholderTextColor="#8a94a6" value={createSubjectDraft.dueDate} onChangeText={(t) => setCreateSubjectDraft((p) => ({ ...p, dueDate: t }))} style={styles.input} />
              <TouchableOpacity style={styles.button} onPress={createSubjectFee}>
                <Text style={styles.buttonText}>Create</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>Search Student Fees</Text>
            <View style={{ marginBottom: 8 }}>
              <TextInput placeholder="Username or email" value={searchStudentQuery} onChangeText={setSearchStudentQuery} style={styles.input} />
              <TouchableOpacity style={styles.button} onPress={searchFees}>
                <Text style={styles.buttonText}>Search Fees</Text>
              </TouchableOpacity>
            </View>

            {searchResults.length > 0 && (
              <View>
                {searchResults.map((fee) => (
                  <View key={fee._id} style={styles.card}>
                    <Text style={styles.title}>{fee.subject?.name || 'Subject Fee'}</Text>
                    <Text style={styles.meta}>Student: {fee.student?.name || '-'}</Text>
                    <Text style={styles.meta}>Amount: {formatMoney(fee.amount)}</Text>
                    <Text style={styles.meta}>Status: {fee.status}</Text>
                  </View>
                ))}
              </View>
            )}

            {searchMatches.length > 0 && (
              <View>
                <Text style={{ fontWeight: '700', marginBottom: 6 }}>Choose Student</Text>
                {searchMatches.map((s) => (
                  <TouchableOpacity
                    key={s._id}
                    style={styles.card}
                    onPress={async () => {
                      try {
                        const res = await api.get('/fees/search', { params: { studentId: s._id } });
                        setSearchResults(res.data?.fees || []);
                        setSearchMatches([]);
                      } catch (err: any) {
                        Alert.alert('Fetch Failed', err?.response?.data?.message || 'Unable to fetch fees');
                      }
                    }}
                  >
                    <Text style={styles.title}>{s.name}</Text>
                    <Text style={styles.meta}>{s.username} {s.email ? `• ${s.email}` : ''}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <Text style={styles.sectionTitle}>Pending Slip Verification</Text>
          {pendingVerificationFees.length === 0 ? <Text style={styles.empty}>No pending slips to verify.</Text> : null}

          {pendingVerificationFees.map((fee) => (
            <View key={fee._id} style={styles.card}>
              <Text style={styles.title}>{fee.subject?.name || 'Subject Fee'}</Text>
              <Text style={styles.meta}>Student: {fee.student?.name || '-'}</Text>
              <Text style={styles.meta}>Class: {fee.schoolClass?.name || '-'}</Text>
              <Text style={styles.meta}>Due Date: {new Date(fee.dueDate).toLocaleDateString()}</Text>
              {fee.submittedDate ? <Text style={styles.meta}>Submitted Date: {new Date(fee.submittedDate).toLocaleDateString()}</Text> : null}
              <Text style={styles.meta}>Submitted Amount: {formatMoney(fee.submittedAmount || fee.amount)}</Text>
              <Text style={[styles.status, { color: statusColor[fee.status] || '#111827' }]}>Status: {fee.status}</Text>

              <TouchableOpacity style={[styles.button, styles.verifyButton]} onPress={() => verifyPayment(fee._id)} disabled={busyFeeId === fee._id}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
                <Text style={styles.buttonText}>{busyFeeId === fee._id ? 'Verifying...' : 'Verify Payment'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={() => {
                Alert.alert('Confirm', 'Delete this fee?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteFee(fee._id) },
                ]);
              }}>
                <Ionicons name="trash-outline" size={18} color="#ffffff" />
                <Text style={styles.buttonText}>Delete Fee</Text>
              </TouchableOpacity>

              {fee.paymentSlipPath ? (
                <TouchableOpacity style={[styles.button, { marginTop: 8, backgroundColor: '#0ea5a4' }]} onPress={() => {
                  const base = String(API_URL || '').replace(/\/api\/?$/, '').replace(/\/$/, '');
                  const url = `${base}/uploads/payment-slips/${fee.paymentSlipPath}`;
                  Linking.openURL(url).catch(() => Alert.alert('Open Failed', 'Unable to open payment slip'));
                }}>
                  <Ionicons name="document-text-outline" size={18} color="#ffffff" />
                  <Text style={styles.buttonText}>View Slip</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity style={[styles.button, { marginTop: 8, backgroundColor: '#f59e0b' }]} onPress={() => {
                Alert.alert('Confirm', 'Reject this payment?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Reject', style: 'destructive', onPress: () => rejectFee(fee._id) },
                ]);
              }}>
                <Ionicons name="close-circle-outline" size={18} color="#ffffff" />
                <Text style={styles.buttonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16, paddingBottom: 26 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
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
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#1f2937' },
  heroText: { marginTop: 6, color: '#64748b', lineHeight: 20, fontSize: 14 },
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
  summaryLabel: { color: '#475569', fontSize: 13, fontWeight: '600' },
  summaryAmount: { marginTop: 6, color: '#1d4ed8', fontSize: 28, fontWeight: '800' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1f2937', marginBottom: 10, marginTop: 4 },
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
  title: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 6 },
  meta: { fontSize: 13, color: '#475569', marginBottom: 3 },
  amount: { marginTop: 6, fontWeight: '700', color: '#0f172a' },
  status: { marginTop: 6, fontWeight: '700' },
  paySection: { marginTop: 10 },
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
  verifyButton: { backgroundColor: '#16a34a' },
  deleteButton: { backgroundColor: '#dc2626', marginTop: 8 },
  buttonText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  empty: { color: '#64748b', fontSize: 15, marginBottom: 14 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: 420 },
  modalTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12, color: '#0f172a' },
  modalItem: { paddingVertical: 12 },
  modalClose: { marginTop: 8, alignItems: 'center', paddingVertical: 12 },
});
