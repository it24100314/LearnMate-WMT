import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DashboardHeader from '../../components/dashboard-header';
import api from '../../utils/api';
import * as Storage from '../../utils/storage';

type TeacherDashboardResponse = {
  teacherName?: string;
  totalStudents?: number;
  attendanceRecorded?: number;
  pendingAttendance?: number;
};

type Exam = {
  _id: string;
  deadline?: string;
};

type SummaryStat = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
};

type ActionCard = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  buttonLabel: string;
  route: '/classes' | '/mark-attendance' | '/enter-marks' | '/manage-timetable' | '/exams' | '/upload-materials';
  accent: string;
};

const ACTION_CARDS: ActionCard[] = [
  {
    title: 'Manage Classes',
    description: 'View your assigned classes and student lists.',
    icon: 'school-outline',
    buttonLabel: 'Open Classes',
    route: '/classes',
    accent: '#2563eb',
  },
  {
    title: 'Mark Attendance',
    description: 'Record daily attendance for each class session.',
    icon: 'checkmark-done-outline',
    buttonLabel: 'Mark Attendance',
    route: '/mark-attendance',
    accent: '#16a34a',
  },
  {
    title: 'Enter Marks',
    description: 'Submit and publish assessment marks for students.',
    icon: 'create-outline',
    buttonLabel: 'Enter Marks',
    route: '/enter-marks',
    accent: '#7c3aed',
  },
  {
    title: 'View Timetable',
    description: 'Manage teaching sessions and schedule updates.',
    icon: 'calendar-outline',
    buttonLabel: 'Manage Timetable',
    route: '/manage-timetable',
    accent: '#0ea5e9',
  },
  {
    title: 'Manage Exams',
    description: 'Create, review, and grade class examinations.',
    icon: 'document-text-outline',
    buttonLabel: 'Open Exams',
    route: '/exams',
    accent: '#0f766e',
  },
  {
    title: 'Manage Materials',
    description: 'Upload and organize lesson notes and resources.',
    icon: 'cloud-upload-outline',
    buttonLabel: 'Upload Materials',
    route: '/upload-materials',
    accent: '#b45309',
  },
];

export default function TeacherDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [teacherName, setTeacherName] = useState('Teacher');
  const [stats, setStats] = useState<SummaryStat[]>([
    { label: 'Total Classes', value: '--', icon: 'layers-outline', tint: '#2563eb' },
    { label: 'Total Students', value: '--', icon: 'people-outline', tint: '#16a34a' },
    { label: 'Upcoming Exams', value: '--', icon: 'hourglass-outline', tint: '#7c3aed' },
    { label: 'Attendance Recorded', value: '--', icon: 'checkmark-circle-outline', tint: '#0ea5e9' },
  ]);

  const isTablet = width >= 768 && width < 1200;
  const isDesktop = width >= 1200;
  const statWidth = useMemo(() => {
    if (width < 520) return '100%';
    if (isDesktop) return '24%';
    return '48.5%';
  }, [isDesktop, width]);
  const cardWidth = useMemo(() => {
    if (width < 520) return '100%';
    if (isDesktop) return '32.2%';
    if (isTablet) return '48.8%';
    return '100%';
  }, [isDesktop, isTablet, width]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const [savedRole, userId] = await Promise.all([
          Storage.getItemAsync('userRole'),
          Storage.getItemAsync('userId'),
        ]);

        setRole(savedRole);
        if (savedRole !== 'TEACHER') {
          return;
        }

        const requests = await Promise.allSettled([
          api.get<TeacherDashboardResponse>('/dashboard/teacher'),
          userId ? api.get(`/classes/teacher/${userId}`) : Promise.resolve({ data: [] }),
          api.get('/exams/list'),
          api.get('/attendance'),
        ]);

        const dashboard = requests[0].status === 'fulfilled' ? requests[0].value.data : {};
        const classes = requests[1].status === 'fulfilled' && Array.isArray((requests[1].value as any).data)
          ? (requests[1].value as any).data
          : [];
        const exams: Exam[] = requests[2].status === 'fulfilled'
          ? requests[2].value.data?.exams ?? []
          : [];
        const attendanceRecords = requests[3].status === 'fulfilled'
          ? requests[3].value.data?.attendances ?? []
          : [];

        const now = new Date();
        const upcomingExams = exams.filter((exam) => exam.deadline && new Date(exam.deadline) >= now).length;
        const totalClasses = classes.length;
        const totalStudents = Number(dashboard?.totalStudents ?? 0);
        const attendanceRecorded = Number(dashboard?.attendanceRecorded ?? attendanceRecords.length ?? 0);

        setTeacherName(dashboard?.teacherName || 'Teacher');
        setStats([
          { label: 'Total Classes', value: String(totalClasses), icon: 'layers-outline', tint: '#2563eb' },
          { label: 'Total Students', value: String(totalStudents), icon: 'people-outline', tint: '#16a34a' },
          { label: 'Upcoming Exams', value: String(upcomingExams), icon: 'hourglass-outline', tint: '#7c3aed' },
          { label: 'Attendance Recorded', value: String(attendanceRecorded), icon: 'checkmark-circle-outline', tint: '#0ea5e9' },
        ]);

        if (requests.every((result) => result.status === 'rejected')) {
          setError('Dashboard summary is temporarily unavailable. Quick actions are still ready.');
        }
      } catch {
        setError('Unable to load teacher dashboard summary. Quick actions are still available.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (role === null || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.helperText}>Loading teacher dashboard...</Text>
      </View>
    );
  }

  if (role !== 'TEACHER') {
    return (
      <View style={styles.center}>
        <Text style={styles.deniedTitle}>Access Restricted</Text>
        <Text style={styles.helperText}>This dashboard is available only for teacher accounts.</Text>
      </View>
    );
  }

  const hasAnySummaryData = stats.some((item) => item.value !== '0' && item.value !== '--');

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <DashboardHeader
        title="Teacher Dashboard"
        subtitle={`Welcome, ${teacherName}. Manage classes, attendance, and assessments.`}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.statsGrid}>
        {stats.map((item) => (
          <View key={item.label} style={[styles.statCard, { width: statWidth }]}>
            <View style={[styles.statIconWrap, { backgroundColor: `${item.tint}1F` }]}>
              <Ionicons name={item.icon} size={18} color={item.tint} />
            </View>
            <Text style={styles.statLabel}>{item.label}</Text>
            <Text style={styles.statValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      {!hasAnySummaryData ? (
        <View style={styles.emptySummaryCard}>
          <Ionicons name="information-circle-outline" size={18} color="#64748b" />
          <Text style={styles.emptySummaryText}>Summary will appear as classes, exams, and attendance records are added.</Text>
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Teaching Modules</Text>
        <Text style={styles.sectionNote}>Use these modules to complete day-to-day academic workflows.</Text>
      </View>

      <View style={styles.modulesGrid}>
        {ACTION_CARDS.map((card) => (
          <Pressable
            key={card.title}
            onPress={() => router.push(card.route as any)}
            style={({ hovered }) => [
              styles.moduleCard,
              { width: cardWidth, borderColor: `${card.accent}33` },
              hovered && styles.moduleCardHover,
            ]}
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.cardIconWrap, { backgroundColor: `${card.accent}1A` }]}>
                <Ionicons name={card.icon} size={22} color={card.accent} />
              </View>
            </View>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardText}>{card.description}</Text>
            <View style={styles.cardFooter}>
              <View style={[styles.cardButton, { backgroundColor: card.accent }]}>
                <Text style={styles.cardButtonText}>{card.buttonLabel}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  container: {
    padding: 18,
    paddingBottom: 30,
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f1f5f9',
  },
  deniedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 8,
  },
  helperText: {
    color: '#475569',
    marginTop: 10,
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 14,
  },
  errorText: {
    color: '#b91c1c',
    marginBottom: 10,
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    columnGap: 10,
    rowGap: 10,
    marginBottom: 14,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptySummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 14,
  },
  emptySummaryText: {
    color: '#64748b',
    fontSize: 13,
    flex: 1,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  sectionNote: {
    color: '#64748b',
    fontSize: 13,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    columnGap: 12,
    rowGap: 12,
  },
  moduleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    minHeight: 180,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
    minWidth: 0,
  },
  moduleCardHover: {
    transform: [{ translateY: -2 }],
    shadowOpacity: 0.12,
    borderColor: '#93c5fd',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  cardText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 16,
  },
  cardFooter: {
    marginTop: 'auto',
    alignItems: 'flex-start',
  },
  cardButton: {
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  cardButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
