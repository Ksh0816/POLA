import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../store/authStore';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Question() {
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>질문</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>내 질문 게시판</Text>

        {classes.length === 0 ? (
          <Text style={styles.emptyText}>진행 중인 수업이 없습니다.</Text>
        ) : (
          classes.map(cls => (
            <TouchableOpacity 
              key={cls.id} 
              style={styles.classCard}
              onPress={() => router.push({ pathname: '/question-board', params: { classId: cls.id, className: cls.name, color: cls.categoryColor } })}
            >
              <View style={[styles.iconContainer, { backgroundColor: (cls.categoryColor || Colors.primary) + '33' }]}>
                <Ionicons name="chatbubbles" size={24} color={cls.categoryColor || Colors.primary} />
              </View>
              <View style={styles.classInfo}>
                <Text style={styles.className}>{cls.name} 질문방</Text>
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
  sectionTitle: { fontFamily: 'Paybooc-Bold', fontSize: 18, color: Colors.grayscale[900], marginBottom: 16 },
  emptyText: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[500], textAlign: 'center', marginTop: 24 },
  classCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  iconContainer: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  classInfo: { flex: 1 },
  className: { fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.grayscale[900] }
});
