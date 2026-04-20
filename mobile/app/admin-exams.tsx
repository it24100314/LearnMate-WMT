import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../utils/api';
import { handleApiError } from '../utils/auth';

type ExamData = {
  _id: string;
  title: string;
  description: string;
  subject: { _id: string; name: string };
  schoolClass: { _id: string; name: string };
  teacher: { _id: string; name: string };
  deadline: string;
};

type FilterOption = { _id: string; name: string };

export default function AdminExamsScreen() {
  const router = useRouter();
  const [exams, setExams] = useState<ExamData[]>([]);
  const [filteredExams, setFilteredExams] = useState<ExamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [classes, setClasses] = useState<FilterOption[]>([]);
  const [subjects, setSubjects] = useState<FilterOption[]>([]);
  
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [exams, selectedClass, selectedSubject]);

  const fetchData = async () => {
    try {
      const [examsRes, optionsRes] = await Promise.all([
        api.get('/exams/all'),
        api.get('/auth/register-options')
      ]);
      setExams(examsRes.data);
      setClasses([{ _id: 'ALL', name: 'All Grades' }, ...optionsRes.data.schoolClasses]);
      setSubjects([{ _id: 'ALL', name: 'All Subjects' }, ...optionsRes.data.subjects]);
    } catch (error) {
      handleApiError(error, router, 'Failed to load exams data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const applyFilters = () => {
    let filtered = [...exams];
    if (selectedClass !== 'ALL') {
      filtered = filtered.filter(e => e.schoolClass?._id === selectedClass);
    }
    if (selectedSubject !== 'ALL') {
      filtered = filtered.filter(e => e.subject?._id === selectedSubject);
    }
    setFilteredExams(filtered);
  };

  const navigateToResults = (examId: string, examTitle: string) => {
    router.push(`/admin-results?examId=${examId}&examTitle=${encodeURIComponent(examTitle)}` as any);
  };

  const renderFilterChips = (data: FilterOption[], selected: string, onSelect: (id: string) => void) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
      {data.map(item => (
        <TouchableOpacity
          key={item._id}
          style={[styles.chip, selected === item._id && styles.chipActive]}
          onPress={() => onSelect(item._id)}
        >
          <Text style={[styles.chipText, selected === item._id && styles.chipTextActive]}>
            {item.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3f51b5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#3f51b5" />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>All Exams</Text>
          <Text style={styles.subtitle}>Institution-wide overview</Text>
        </View>
      </View>

      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Filter by Grade</Text>
        {renderFilterChips(classes, selectedClass, setSelectedClass)}
        <Text style={[styles.filterLabel, { marginTop: 10 }]}>Filter by Subject</Text>
        {renderFilterChips(subjects, selectedSubject, setSelectedSubject)}
      </View>

      <FlatList
        data={filteredExams}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3f51b5']} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
             <Ionicons name="folder-open-outline" size={48} color="#cbd5e1" />
             <Text style={styles.emptyText}>No exams match these filters.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
             style={styles.card} 
             onPress={() => navigateToResults(item._id, item.title)}
          >
            <View style={styles.cardTop}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="document-text" size={20} color="#3f51b5" />
                <Text style={styles.cardTitle}>{item.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
            </View>
            
            <View style={styles.infoRow}>
               <Ionicons name="school-outline" size={16} color="#64748b" />
               <Text style={styles.infoText}>{item.schoolClass?.name || 'No Class'}</Text>
            </View>
            <View style={styles.infoRow}>
               <Ionicons name="library-outline" size={16} color="#64748b" />
               <Text style={styles.infoText}>{item.subject?.name || 'No Subject'}</Text>
            </View>
            <View style={styles.infoRow}>
               <Ionicons name="person-outline" size={16} color="#64748b" />
               <Text style={styles.infoText}>{item.teacher?.name || 'Unknown Teacher'}</Text>
            </View>
            <View style={styles.infoRow}>
               <Ionicons name="time-outline" size={16} color="#64748b" />
               <Text style={styles.infoText}>Due: {new Date(item.deadline).toLocaleDateString()}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
    zIndex: 10,
  },
  backBtn: {
    marginRight: 16,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  filterSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  chipScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  chip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#3f51b5',
  },
  chipText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#edf0f5',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginLeft: 8,
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: 14,
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '500',
  },
});