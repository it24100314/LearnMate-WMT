import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ModalScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.card}>
        <ThemedText type="title" style={styles.title}>Learn Mate Modal</ThemedText>
        <ThemedText style={styles.subtitle}>Quick actions and contextual information appear here.</ThemedText>
        <Link href="/" dismissTo style={styles.link}>
          <ThemedText type="link" style={styles.linkText}>Go to home screen</ThemedText>
        </Link>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  title: {
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    color: '#64748b',
    marginBottom: 14,
    lineHeight: 20,
  },
  link: {
    marginTop: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#edf2ff',
    alignItems: 'center',
  },
  linkText: {
    color: '#3f51b5',
  },
});
