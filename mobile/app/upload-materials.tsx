import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';

type NamedItem = { _id: string; name: string };

export default function MaterialsScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const [subjects, setSubjects] = useState<NamedItem[]>([]);
  const [classes, setClasses] = useState<NamedItem[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [classId, setClassId] = useState('');

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const [subjectsRes, classesRes] = await Promise.all([
        api.get('/subjects'),
        api.get('/classes'),
      ]);

      setSubjects(subjectsRes.data?.subjects ?? []);
      setClasses(classesRes.data ?? []);
    } catch {
      Alert.alert('Materials', 'Failed to load classes and subjects');
    } finally {
      setLoading(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        setFile(result.assets[0]);
      }
    } catch {
      Alert.alert('Materials', 'Document picking failed');
    }
  };

  const uploadFile = async () => {
    if (!file || !title.trim()) {
      Alert.alert('Validation', 'Please provide a title and select a file');
      return;
    }

    if (!subjectId || !classId) {
      Alert.alert('Validation', 'Please select both class and subject');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('subjectId', subjectId);
      formData.append('schoolClassId', classId);
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      } as unknown as Blob);

      await api.post('/materials/create', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Success', 'Material uploaded successfully!');
      setTitle('');
      setDescription('');
      setFile(null);
      setSubjectId('');
      setClassId('');
    } catch (error: any) {
      Alert.alert('Upload Failed', error?.response?.data?.message || 'There was an issue uploading the file.');
    } finally {
      setUploading(false);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.header}>Upload Material</Text>
        <Text style={styles.heroText}>Share learning resources with selected class and subject.</Text>
      </View>

      <View style={styles.formCard}>
        <TextInput
          style={styles.input}
          placeholder="Material Title"
          placeholderTextColor="#8a94a6"
          value={title}
          onChangeText={setTitle}
          selectionColor="#3f51b5"
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description"
          placeholderTextColor="#8a94a6"
          value={description}
          onChangeText={setDescription}
          multiline
          selectionColor="#3f51b5"
        />

        <Text style={styles.label}>Class</Text>
        <View style={styles.optionWrap}>
          {classes.map((item) => (
            <TouchableOpacity
              key={item._id}
              style={[styles.optionChip, classId === item._id && styles.optionChipSelected]}
              onPress={() => setClassId(item._id)}
            >
              <Text style={classId === item._id ? styles.optionTextSelected : styles.optionText}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Subject</Text>
        <View style={styles.optionWrap}>
          {subjects.map((item) => (
            <TouchableOpacity
              key={item._id}
              style={[styles.optionChip, subjectId === item._id && styles.optionChipSelected]}
              onPress={() => setSubjectId(item._id)}
            >
              <Text style={subjectId === item._id ? styles.optionTextSelected : styles.optionText}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.pickerBtn} onPress={pickDocument}>
          <Ionicons name="document-attach-outline" size={20} color="#3f51b5" />
          <Text style={styles.pickerText}>
            {file ? `Selected: ${file.name}` : 'Pick a File / Document'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.uploadBtn} onPress={uploadFile} disabled={uploading}>
          <Ionicons name="cloud-upload-outline" size={20} color="#ffffff" />
          <Text style={styles.uploadText}>{uploading ? 'Uploading...' : 'Upload Material'}</Text>
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
    paddingBottom: 32,
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
  heroText: {
    marginTop: 6,
    color: '#64748b',
    lineHeight: 20,
    fontSize: 14,
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
    height: 96,
    textAlignVertical: 'top',
  },
  label: {
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginTop: 6,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
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
  pickerBtn: {
    backgroundColor: '#edf2ff',
    borderWidth: 1,
    borderColor: '#cfd8ff',
    padding: 15,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  pickerText: {
    color: '#3f51b5',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadBtn: {
    backgroundColor: '#3f51b5',
    padding: 15,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  uploadText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
