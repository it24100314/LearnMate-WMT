import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
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
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Class Materials</Text>

      <FlatList
        data={materials}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadMaterials(); }} />}
        contentContainerStyle={materials.length === 0 ? styles.center : styles.list}  
        ListEmptyComponent={<Text style={styles.empty}>No materials available right now.</Text>}
        renderItem={({ item }) => {
          const isDownloading = downloadingId === item._id;
          const kbSize = item.fileSize ? (item.fileSize / 1024).toFixed(1) : '0.0';
          const uploadDate = item.uploadedAt ? new Date(item.uploadedAt).toLocaleDateString() : 'Unknown';

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.typeBadge}>{item.fileType || 'FILE'}</Text>
              </View>

              {item.description ? (
                <Text style={styles.descText} numberOfLines={2}>{item.description}</Text>
              ) : null}

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>📚 {item.subject?.name || 'Any Subject'}</Text>
                <Text style={styles.metaText}>🧑‍🏫 {item.teacher?.name || 'Staff'}</Text>
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
                <Text style={styles.downloadText}>
                  {isDownloading ? 'Downloading...' : 'Download File'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { fontSize: 20, fontWeight: 'bold', marginHorizontal: 20, marginTop: 30, marginBottom: 15, color: '#1f2937' },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 15, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#007AFF' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1, marginRight: 10 },
  typeBadge: { backgroundColor: '#e0e7ff', color: '#3730a3', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontSize: 11, fontWeight: 'bold', overflow: 'hidden' },
  descText: { fontSize: 14, color: '#4b5563', marginBottom: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  metaText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  metaSubText: { fontSize: 12, color: '#9ca3af' },
  downloadBtn: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  downloadBtnDisabled: { backgroundColor: '#93c5fd' },
  downloadText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  empty: { color: '#6b7280', fontSize: 15, textAlign: 'center' },
});
