import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { downloadAndShareApiFile } from '../utils/download';

interface Material {
  _id: string;
  title: string;
  description?: string;
  fileType: string;
  originalFileName: string;
  fileSize: number;
  subject?: { name: string };
  schoolClass?: { name: string };
  teacher?: { name: string };
  uploadedAt: string;
}

export default function MaterialsScreen() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadMaterials = async () => {
    try {
      // Backend /materials returns materials scoped to the student's class
      const response = await api.get('/materials');
      setMaterials(response.data?.materials || []);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'Failed to load materials.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  const handleDownload = async (material: Material) => {
    try {
      setDownloadingId(material._id);
      
      const fileName = material.originalFileName || `material_${material._id}_${material.title}.pdf`;
      const endpoint = `/materials/download/${material._id}`;
      
      const result = await downloadAndShareApiFile({
        endpoint,
        fileName,
        dialogTitle: `Open ${material.title}`,
      });

      if (!result.shared) {
        Alert.alert('Success', `File downloaded to: ${result.uri}\n\nCould not show share dialog.`);
      }
    } catch (err: any) {
      Alert.alert('Download Error', err.message || 'Failed to download file.');
    } finally {
      setDownloadingId(null);
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadMaterials(); }} />}
    >
      <View style={styles.heroCard}>
        <Text style={styles.header}>Class Materials</Text>
        <Text style={styles.heroText}>Access resources, notes, and documents shared by your teachers.</Text>
      </View>

      {materials.length === 0 ? (
        <Text style={styles.empty}>No materials available right now.</Text>
      ) : (
        <View style={styles.list}>
          {materials.map((item) => {
            const isDownloading = downloadingId === item._id;
            const kbSize = item.fileSize ? (item.fileSize / 1024).toFixed(1) : '0.0';
            const uploadDate = item.uploadedAt ? new Date(item.uploadedAt).toLocaleDateString() : 'Unknown';

            return (
              <View key={item._id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.typeBadge}>{item.fileType || 'FILE'}</Text>
                </View>

                {item.description ? (
                  <Text style={styles.descText} numberOfLines={2}>{item.description}</Text>
                ) : null}

                <View style={styles.metaRow}>
                  <View style={styles.metaInline}>
                    <Ionicons name="book-outline" size={14} color="#64748b" />
                    <Text style={styles.metaText}>{item.subject?.name || 'Any Subject'}</Text>
                  </View>
                  <View style={styles.metaInline}>
                    <Ionicons name="person-outline" size={14} color="#64748b" />
                    <Text style={styles.metaText}>{item.teacher?.name || 'Staff'}</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaSubText}>Uploaded: {uploadDate}</Text>
                  <Text style={styles.metaSubText}>Size: {kbSize} KB</Text>
                </View>

                <TouchableOpacity
                  style={[styles.downloadBtn, isDownloading && styles.downloadBtnDisabled]}
                  onPress={() => handleDownload(item)}
                  disabled={isDownloading}
                >
                  <Ionicons name="download-outline" size={18} color="#ffffff" />
                  <Text style={styles.downloadText}>
                    {isDownloading ? 'Downloading...' : 'Download File'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 28 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f8f9fa' },
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
  header: { fontSize: 22, fontWeight: '800', color: '#1f2937' },
  heroText: { marginTop: 6, color: '#64748b', lineHeight: 20, fontSize: 14 },
  list: { paddingBottom: 16 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#edf0f5',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', color: '#1f2937', flex: 1, marginRight: 10 },
  typeBadge: { backgroundColor: '#edf2ff', color: '#2e3a8c', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, fontSize: 11, fontWeight: '700', overflow: 'hidden' },
  descText: { fontSize: 14, color: '#475569', marginBottom: 10, lineHeight: 20 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8 },
  metaInline: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  metaText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  metaSubText: { fontSize: 12, color: '#64748b' },
  downloadBtn: {
    backgroundColor: '#3f51b5',
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  downloadBtnDisabled: { opacity: 0.7 },
  downloadText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  empty: { color: '#64748b', fontSize: 15, textAlign: 'center' },
});
