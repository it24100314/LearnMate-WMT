import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import FormData from 'form-data';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';

type NamedItem = { _id: string; name: string };

export default function CreateExamScreen() {
  const [title, setTitle] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [maxMarks, setMaxMarks] = useState('100');
  const [passMark, setPassMark] = useState('40');
  const [deadline, setDeadline] = useState(new Date());
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);

  const [subjects, setSubjects] = useState<NamedItem[]>([]);
  const [classes, setClasses] = useState<NamedItem[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [classId, setClassId] = useState('');

  const [selectedFile, setSelectedFile] = useState<{ name: string; uri: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTeacherAssignments();
  }, []);

  const loadTeacherAssignments = async () => {
    try {
      const response = await api.get('/users/me/assignments');
      const { schoolClasses, subjects: teacherSubjects } = response.data;

      setClasses(schoolClasses || []);
      setSubjects(teacherSubjects || []);

      // Auto-select if only one class/subject
      if (schoolClasses?.length === 1) {
        setClassId(schoolClasses[0]._id);
      }
      if (teacherSubjects?.length === 1) {
        setSubjectId(teacherSubjects[0]._id);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load your class and subject assignments. Ensure you are a teacher.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeadlineChange = (event: any, selectedDate?: Date) => {
    // iOS: Use declarative component handler
    setShowDeadlinePicker(false);
    
    if (event.type === 'set' && selectedDate) {
      setDeadline(selectedDate);
    }
  };

  const showDatepicker = () => {
    // Android: Use imperative API (modal-based, no dismiss issues)
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: deadline || new Date(),
        onChange: (event, selectedDate) => {
          // Android handles Cancel natively - no crash on dismiss
          if (event.type === 'set' && selectedDate) {
            setDeadline(selectedDate);
          }
        },
        mode: 'datetime',
      });
    } else {
      // iOS: Render component
      setShowDeadlinePicker(true);
    }
  };

  const pickExamPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        setSelectedFile({
          name: asset.name,
          uri: asset.uri,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  const formatDateTimeForDisplay = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Please provide a title');
      return;
    }

    if (!classId) {
      Alert.alert('Validation', 'Please select your class');
      return;
    }

    if (!subjectId) {
      Alert.alert('Validation', 'Please select your subject');
      return;
    }

    if (!selectedFile) {
      Alert.alert('Validation', 'Please upload an exam PDF');
      return;
    }

    if (Number.isNaN(Number(maxMarks)) || Number(maxMarks) <= 0) {
      Alert.alert('Validation', 'Max marks must be a positive number');
      return;
    }

    if (Number.isNaN(Number(passMark)) || Number(passMark) < 0) {
      Alert.alert('Validation', 'Pass mark must be a non-negative number');
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('deadline', deadline.toISOString());
      formData.append('maxMarks', Number(maxMarks));
      formData.append('passMark', Number(passMark));
      formData.append('additionalInstructions', additionalInstructions.trim());
      formData.append('subjectId', subjectId);
      formData.append('schoolClassId', classId);

      // Append file
      if (selectedFile) {
        formData.append('file', {
          uri: selectedFile.uri,
          type: 'application/pdf',
          name: selectedFile.name,
        } as any);
      }

      console.log('Creating exam with file:', selectedFile?.name);
      await api.post('/exams/create', formData);

      Alert.alert('Success', 'Exam created successfully!');
      setTitle('');
      setAdditionalInstructions('');
      setMaxMarks('100');
      setPassMark('40');
      setDeadline(new Date());
      setSubjectId('');
      setClassId('');
      setSelectedFile(null);
    } catch (error: any) {
      console.error('Exam creation error:', error?.response?.status, error?.response?.data, error?.message);
      Alert.alert('Creation Failed', error?.response?.data?.message || error?.message || 'There was an issue creating the exam.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3f51b5" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.header}>Create Exam</Text>
        <Text style={styles.heroSubText}>Publish exam details, attach PDF, and assign to your class.</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Mid-Term Mathematics"
          placeholderTextColor="#8a94a6"
          value={title}
          onChangeText={setTitle}
          selectionColor="#3f51b5"
        />

        <View style={styles.rowInputs}>
          <View style={styles.flexField}>
            <Text style={styles.label}>Max Marks *</Text>
            <TextInput
              style={styles.input}
              placeholder="100"
              placeholderTextColor="#8a94a6"
              value={maxMarks}
              onChangeText={setMaxMarks}
              keyboardType="numeric"
              selectionColor="#3f51b5"
            />
          </View>

          <View style={styles.flexField}>
            <Text style={styles.label}>Pass Mark *</Text>
            <TextInput
              style={styles.input}
              placeholder="40"
              placeholderTextColor="#8a94a6"
              value={passMark}
              onChangeText={setPassMark}
              keyboardType="numeric"
              selectionColor="#3f51b5"
            />
          </View>
        </View>

        <Text style={styles.label}>Deadline (Date & Time) *</Text>
        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={showDatepicker}
        >
          <Ionicons name="calendar-outline" size={18} color="#3f51b5" />
          <Text style={styles.datePickerText}>{formatDateTimeForDisplay(deadline)}</Text>
        </TouchableOpacity>

        {showDeadlinePicker && Platform.OS === 'ios' && (
          <DateTimePicker
            value={deadline}
            mode="datetime"
            display="spinner"
            onChange={handleDeadlineChange}
            onDismiss={() => setShowDeadlinePicker(false)}
          />
        )}

        <Text style={styles.label}>Additional Instructions (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Any special instructions for students..."
          placeholderTextColor="#8a94a6"
          value={additionalInstructions}
          onChangeText={setAdditionalInstructions}
          multiline
          selectionColor="#3f51b5"
        />

        <Text style={styles.label}>Select Your Class *</Text>
        <View style={styles.optionWrap}>
          {classes.length === 0 ? (
            <Text style={styles.noOptionsText}>No classes assigned</Text>
          ) : (
            classes.map((item) => (
              <TouchableOpacity
                key={item._id}
                style={[styles.optionChip, classId === item._id && styles.optionChipSelected]}
                onPress={() => setClassId(item._id)}
              >
                <Text style={[styles.optionText, classId === item._id && styles.optionTextSelected]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <Text style={styles.label}>Select Your Subject *</Text>
        <View style={styles.optionWrap}>
          {subjects.length === 0 ? (
            <Text style={styles.noOptionsText}>No subjects assigned</Text>
          ) : (
            subjects.map((item) => (
              <TouchableOpacity
                key={item._id}
                style={[styles.optionChip, subjectId === item._id && styles.optionChipSelected]}
                onPress={() => setSubjectId(item._id)}
              >
                <Text style={[styles.optionText, subjectId === item._id && styles.optionTextSelected]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <Text style={styles.label}>Upload Exam PDF *</Text>
        <TouchableOpacity style={styles.filePickerButton} onPress={pickExamPDF}>
          <Ionicons name="document-attach-outline" size={20} color="#3f51b5" />
          <Text style={styles.filePickerText}>
            {selectedFile ? `Selected: ${selectedFile.name}` : 'Choose Exam PDF'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.uploadBtn, saving && styles.uploadBtnDisabled]}
          onPress={handleCreate}
          disabled={saving}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
          <Text style={styles.uploadText}>{saving ? 'Creating...' : 'Create Exam'}</Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 40,
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
    marginTop: 6,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  header: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
  },
  heroSubText: {
    marginTop: 6,
    color: '#64748b',
    lineHeight: 20,
    fontSize: 14,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  flexField: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d5dbe5',
    padding: 15,
    borderRadius: 16,
    marginBottom: 12,
    fontSize: 15,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 88,
    textAlignVertical: 'top',
  },
  label: {
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginTop: 4,
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: '#d5dbe5',
    padding: 15,
    borderRadius: 16,
    marginBottom: 12,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
  },
  datePickerText: {
    fontSize: 15,
    color: '#334155',
  },
  filePickerButton: {
    borderWidth: 1,
    borderColor: '#cfd8ff',
    borderStyle: 'dashed',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#edf2ff',
    gap: 6,
  },
  filePickerText: {
    fontSize: 14,
    color: '#3f51b5',
    fontWeight: '600',
    textAlign: 'center',
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  noOptionsText: {
    color: '#8a94a6',
    fontStyle: 'italic',
  },
  optionChip: {
    borderWidth: 1,
    borderColor: '#d5dbe5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#ffffff',
  },
  optionChipSelected: {
    borderColor: '#3f51b5',
    backgroundColor: '#3f51b5',
  },
  optionText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  uploadBtn: {
    backgroundColor: '#3f51b5',
    padding: 15,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  uploadBtnDisabled: {
    opacity: 0.6,
  },
  uploadText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
