import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/Colors';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function Curriculum() {
  const router = useRouter();
  const { classId } = useLocalSearchParams();
  const [lessons, setLessons] = useState<any[]>([]);

  useEffect(() => {
    const fetchCurriculum = async () => {
      if (!classId) return;
      const q = query(collection(db, 'Lessons'), where('classId', '==', classId), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setLessons(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchCurriculum();
  }, [classId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>커리큘럼</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.content}>
        {lessons.length === 0 ? (
          <Text style={styles.emptyText}>기록된 커리큘럼이 없습니다.</Text>
        ) : (
          lessons.map(lesson => (
            <View key={lesson.id} style={styles.card}>
              <View style={styles.cardColorBar} />
              <View style={styles.cardContent}>
                <Text style={styles.dateText}>{format(new Date(lesson.date), 'M월 d일 EEEE', { locale: ko })}</Text>
                <Text style={styles.curriculumText}>{lesson.curriculum}</Text>
              </View>
            </View>
          ))
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
  card: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 16, flexDirection: 'row', overflow: 'hidden' },
  cardColorBar: { width: 8, backgroundColor: Colors.primary },
  cardContent: { padding: 16, flex: 1 },
  dateText: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[500], marginBottom: 8 },
  curriculumText: { fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.grayscale[900] }
});
