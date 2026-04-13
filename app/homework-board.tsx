import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/Colors';
import { collection, query, where, getDocs, orderBy, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuthStore } from '../store/authStore';
import { Ionicons } from '@expo/vector-icons';

export default function HomeworkBoard() {
  const router = useRouter();
  const { classId, className, color } = useLocalSearchParams();
  const { user } = useAuthStore();
  const [homeworks, setHomeworks] = useState<any[]>([]);

  useEffect(() => {
    const fetchHomeworks = async () => {
      if (!classId) return;
      const q = query(collection(db, 'Homeworks'), where('classId', '==', classId), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setHomeworks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchHomeworks();
  }, [classId]);

  const handleComplete = async (hwId: string) => {
    if (!user) return;
    try {
      const hwRef = doc(db, 'Homeworks', hwId);
      await updateDoc(hwRef, {
        submissions: arrayUnion(user.uid)
      });
      // update local state
      setHomeworks(prev => prev.map(hw => hw.id === hwId ? { ...hw, submissions: [...(hw.submissions || []), user.uid] } : hw));
      Alert.alert('완료', '과제를 완료했습니다!');
    } catch (e) {
      console.error(e);
      Alert.alert('오류', '처리 중 오류가 발생했습니다.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{className} 과제</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.content}>
        {homeworks.length === 0 ? (
          <Text style={styles.emptyText}>등록된 과제가 없습니다.</Text>
        ) : (
          homeworks.map(hw => {
            const isCompleted = hw.submissions?.includes(user?.uid);
            return (
              <View key={hw.id} style={styles.card}>
                <View style={[styles.cardColorBar, { backgroundColor: (color as string) || Colors.primary }]} />
                <View style={styles.cardContent}>
                  <Text style={styles.hwTitle}>{hw.title}</Text>
                  {hw.description ? <Text style={styles.hwDesc}>{hw.description}</Text> : null}
                  <Text style={styles.dueDate}>마감: {hw.dueDate}</Text>
                  
                  {user?.role === 'student' && (
                    <TouchableOpacity 
                      style={[styles.completeButton, isCompleted && styles.completedButton]}
                      onPress={() => !isCompleted && handleComplete(hw.id)}
                      disabled={isCompleted}
                    >
                      <Ionicons name={isCompleted ? "checkmark-circle" : "ellipse-outline"} size={20} color={isCompleted ? Colors.primary : Colors.grayscale[500]} />
                      <Text style={[styles.completeText, isCompleted && styles.completedText]}>
                        {isCompleted ? '완료됨' : '완료하기'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {user?.role === 'teacher' && (
                    <Text style={styles.submissionText}>제출 완료 학생: {hw.submissions?.length || 0}명</Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: Colors.grayscale[100] },
  title: { fontFamily: 'Paybooc-Bold', fontSize: 18, color: Colors.grayscale[900] },
  backButton: { width: 40, alignItems: 'flex-start' },
  backText: { fontFamily: 'Paybooc-Bold', fontSize: 24, color: Colors.grayscale[900] },
  content: { flex: 1, padding: 24 },
  emptyText: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[500], textAlign: 'center' },
  card: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 16, flexDirection: 'row', overflow: 'hidden', elevation: 2 },
  cardColorBar: { width: 8 },
  cardContent: { padding: 16, flex: 1 },
  hwTitle: { fontFamily: 'Paybooc-Bold', fontSize: 18, color: Colors.grayscale[900], marginBottom: 8 },
  hwDesc: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[700], marginBottom: 8 },
  dueDate: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.categories.red, marginBottom: 16 },
  completeButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.grayscale[100], padding: 12, borderRadius: 12, justifyContent: 'center' },
  completedButton: { backgroundColor: Colors.lightBlue },
  completeText: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[700], marginLeft: 8 },
  completedText: { color: Colors.primary },
  submissionText: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[700] }
});
