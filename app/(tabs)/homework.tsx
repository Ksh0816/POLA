import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../store/authStore';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Homework() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!user) return;
      const classesRef = collection(db, 'Classes');
      let q;
      if (user.role === 'teacher') {
        q = query(classesRef, where('teacherId', '==', user.uid));
      } else {
        q = query(classesRef, where('students', 'array-contains', user.uid));
      }
      const snap = await getDocs(q);
      setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchClasses();
  }, [user]);

  // Dummy progression calculation for student
  const progression = 75;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>과제</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {user?.role === 'student' && (
          <View style={styles.progressCard}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressTitle}>전체 과제 달성률</Text>
              <Text style={styles.progressSubtitle}>이번 주 과제를 잘 마무리하고 있어요!</Text>
            </View>
            <View style={styles.progressCircle}>
              <Text style={styles.progressText}>{progression}%</Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>내 과제 게시판</Text>

        {classes.length === 0 ? (
          <Text style={styles.emptyText}>진행 중인 수업이 없습니다.</Text>
        ) : (
          classes.map(cls => (
            <TouchableOpacity 
              key={cls.id} 
              style={styles.classCard}
              onPress={() => router.push({ pathname: '/homework-board', params: { classId: cls.id, className: cls.name, color: cls.categoryColor } })}
            >
              <View style={[styles.iconContainer, { backgroundColor: (cls.categoryColor || Colors.primary) + '33' }]}>
                <Ionicons name={cls.icon as any || 'book'} size={24} color={cls.categoryColor || Colors.primary} />
              </View>
              <View style={styles.classInfo}>
                <Text style={styles.className}>{cls.name} 과제</Text>
                {user?.role === 'student' && <Text style={styles.newBadge}>새 과제 있음</Text>}
              </View>
              <Ionicons name="chevron-forward" size={24} color={Colors.grayscale[500]} />
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 24, paddingBottom: 16 },
  title: { fontFamily: 'Paybooc-Bold', fontSize: 24, color: Colors.grayscale[900] },
  content: { flex: 1, paddingHorizontal: 24 },
  progressCard: { backgroundColor: Colors.primary, borderRadius: 16, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  progressInfo: { flex: 1 },
  progressTitle: { fontFamily: 'Paybooc-Bold', fontSize: 18, color: '#FFF', marginBottom: 8 },
  progressSubtitle: { fontFamily: 'Paybooc-Bold', fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  progressCircle: { width: 60, height: 60, borderRadius: 30, borderWidth: 4, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  progressText: { fontFamily: 'Paybooc-Bold', fontSize: 16, color: '#FFF' },
  sectionTitle: { fontFamily: 'Paybooc-Bold', fontSize: 18, color: Colors.grayscale[900], marginBottom: 16 },
  emptyText: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[500], textAlign: 'center', marginTop: 24 },
  classCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  iconContainer: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  classInfo: { flex: 1 },
  className: { fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.grayscale[900] },
  newBadge: { fontFamily: 'Paybooc-Bold', fontSize: 12, color: Colors.categories.red, marginTop: 4 }
});
