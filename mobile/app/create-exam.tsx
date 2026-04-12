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
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import FormData from 'form-data';
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
    if (Platform.OS === 'android') {
      setShowDeadlinePicker(false);
    }
    if (selectedDate) {
      setDeadline(selectedDate);
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

      await api.post('/exams/create', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

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
      Alert.alert('Creation Failed', error?.response?.data?.message || 'There was an issue creating the exam.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Create Exam</Text>

      <Text style={styles.label}>Title *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Mid-Term Mathematics"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Max Marks *</Text>
      <TextInput
        style={styles.input}
        placeholder="100"
        value={maxMarks}
        onChangeText={setMaxMarks}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Pass Mark *</Text>
      <TextInput
        style={styles.input}
        placeholder="40"
        value={passMark}
        onChangeText={setPassMark}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Deadline (Date & Time) *</Text>
      <TouchableOpacity
        style={styles.datePickerButton}
        onPress={() => setShowDeadlinePicker(true)}
      >
        <Text style={styles.datePickerText}>{formatDateTimeForDisplay(deadline)}</Text>
      </TouchableOpacity>

      {showDeadlinePicker && (
        <DateTimePicker
          value={deadline}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDeadlineChange}
        />
      )}

      <Text style={styles.label}>Additional Instructions (Optional)</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        placeholder="Any special instructions for students..."
        value={additionalInstructions}
        onChangeText={setAdditionalInstructions}
        multiline
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
        <Text style={styles.filePickerText}>
          {selectedFile ? `Selected: ${selectedFile.name}` : 'Choose Exam PDF'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.uploadBtn, saving && styles.uploadBtnDisabled]}
        onPress={handleCreate}
        disabled={saving}
      >
        <Text style={styles.uploadText}>{saving ? 'Creating...' : 'Create Exam'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
  },
  label: {
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    marginTop: 6,
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    justifyContent: 'center',
  },
  datePickerText: {
    fontSize: 16,
    color: '#374151',
  },
  filePickerButton: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    padding: 20,
    borderRadius: 8,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
  },
  filePickerText: {
    fontSize: 16,
    color: '#007AFF',
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
    color: '#999',
    fontStyle: 'italic',
  },
  optionChip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  optionChipSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb',
  },
  optionText: {
    color: '#374151',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  uploadBtn: {
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  uploadBtnDisabled: {
    opacity: 0.6,
  },
  uploadText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
