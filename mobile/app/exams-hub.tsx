import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';

export default function ExamsScreen() {
  const router = useRouter();
  const [role, setRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadRole = async () => {
      const userRole = await SecureStore.getItemAsync('userRole');
      setRole(userRole);
    };
    loadRole();
  }, []);

  const navigateToCreateExam = () => {
    router.push('/create-exam');
  };

  const navigateToManageExams = () => {
    router.push('/manage-exams');
  };

  // For students, just show the exams list directly
  if (role === 'STUDENT' || role === 'ADMIN') {
    return <ExamsListForStudents />;
  }

  // For teachers, show create and manage options
  return (
    <ScrollView style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.header}>Exams</Text>
        <Text style={styles.subtitle}>Create new exams or manage your existing exam schedule.</Text>
      </View>

      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={styles.optionCard}
          onPress={navigateToCreateExam}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="add-circle-outline" size={34} color="#3f51b5" />
          </View>
          <Text style={styles.optionTitle}>Create New Exam</Text>
          <Text style={styles.optionDescription}>Create and upload a new exam for your students</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={navigateToManageExams}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="settings-outline" size={34} color="#3f51b5" />
          </View>
          <Text style={styles.optionTitle}>Manage Exams</Text>
          <Text style={styles.optionDescription}>Edit or delete your existing exams</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function ExamsListForStudents() {
  const router = useRouter();
  
  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.header}>Exams</Text>
        <Text style={styles.subtitle}>Open your exam list and track your submissions.</Text>
      </View>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/exams')}
      >
        <Ionicons name="document-text-outline" size={18} color="#ffffff" />
        <Text style={styles.buttonText}>View Exams</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 14,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  header: { fontSize: 24, fontWeight: '800', color: '#1f2937' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 6, lineHeight: 20 },
  
  optionsContainer: { paddingHorizontal: 16, paddingBottom: 40 },
  optionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#edf0f5',
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  
  iconContainer: { marginBottom: 12, alignItems: 'center' },
  
  optionTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 8, textAlign: 'center' },
  optionDescription: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 18 },

  button: {
    backgroundColor: '#3f51b5',
    marginHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
});
