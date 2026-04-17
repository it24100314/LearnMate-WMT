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
  if (role === 'STUDENT' || role === 'PARENT' || role === 'ADMIN') {
    return <ExamsListForStudents />;
  }

  // For teachers, show create and manage options
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Exams</Text>
      <Text style={styles.subtitle}>Manage your exams</Text>

      <View style={styles.optionsContainer}>
        {/* Create New Exam */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={navigateToCreateExam}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>➕</Text>
          </View>
          <Text style={styles.optionTitle}>Create New Exam</Text>
          <Text style={styles.optionDescription}>Create and upload a new exam for your students</Text>
        </TouchableOpacity>

        {/* Manage Exams */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={navigateToManageExams}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>⚙️</Text>
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
      <Text style={styles.header}>Exams</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/exams')}
      >
        <Text style={styles.buttonText}>View Exams</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { fontSize: 24, fontWeight: '700', marginHorizontal: 20, marginTop: 25, marginBottom: 6, color: '#1f2937' },
  subtitle: { fontSize: 14, color: '#6b7280', marginHorizontal: 20, marginBottom: 25 },
  
  optionsContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  optionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  
  iconContainer: { marginBottom: 12, alignItems: 'center' },
  icon: { fontSize: 40 },
  
  optionTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 8, textAlign: 'center' },
  optionDescription: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 18 },

  button: { backgroundColor: '#2563eb', marginHorizontal: 20, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
