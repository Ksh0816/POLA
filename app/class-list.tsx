import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { format, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function ClassList() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  const [classData, setClassData] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClassAndLessons = async () => {
      if (!id) return;
      try {
        const classRef = doc(db, 'Classes', id as string);
        const classSnap = await getDoc(classRef);
        
        if (classSnap.exists()) {
          setClassData({ id: classSnap.id, ...classSnap.data() });
        } else {
          Alert.alert('오류', '수업 정보를 찾을 수 없습니다.');
          router.back();
          return;
        }

        const lessonsRef = collection(db, 'Lessons');
        const q = query(lessonsRef, where('classId', '==', id));
        const lessonsSnap = await getDocs(q);
        
        const fetchedLessons = lessonsSnap.docs
          .map(d => ({ id: d.id, ...d.data() as any }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        setLessons(fetchedLessons);

        // Extract unique months (YYYY-MM)
        const uniqueMonths = Array.from(new Set(fetchedLessons.map(l => {
          const date = new Date(l.date);
          return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        })));
        
        setMonths(uniqueMonths);
        
        // Default to current month or first available month
        const currentMonth = `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`;
        if (uniqueMonths.includes(currentMonth)) {
          setSelectedMonth(currentMonth);
        } else if (uniqueMonths.length > 0) {
          setSelectedMonth(uniqueMonths[0]);
        }
        
      } catch (error) {
        console.error("Error fetching class lessons:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClassAndLessons();
  }, [id]);

  const renderRelativeDate = (dateString: string) => {
    const lessonDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lessonDate.setHours(0, 0, 0, 0);
    const diff = differenceInDays(lessonDate, today);
    
    if (diff === 0) return '오늘';
    if (diff > 0) return `${diff}일 후`;
    return `${Math.abs(diff)}일 전`;
  };

  const filteredLessons = lessons.filter(l => {
    const date = new Date(l.date);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}` === selectedMonth;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}><Text>로딩 중...</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.grayscale[900]} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{classData?.name}</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.monthSelectorContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthSelectorContent}>
          {months.map(month => {
            const isSelected = month === selectedMonth;
            const [, m] = month.split('-');
            return (
              <TouchableOpacity 
                key={month} 
                style={[styles.monthButton, isSelected && styles.monthButtonSelected]}
                onPress={() => setSelectedMonth(month)}
              >
                <Text style={[styles.monthText, isSelected && styles.monthTextSelected]}>
                  {parseInt(m)}월
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredLessons.length === 0 ? (
          <View style={styles.emptyState}>
             <Text style={styles.emptyText}>해당 월에 기록된 수업이 없습니다.</Text>
          </View>
        ) : (
          filteredLessons.map((lesson) => {
            const isPast = new Date(lesson.date) < new Date();
            const categoryColor = classData?.categoryColor || Colors.primary;
            
            // Format time correctly. If time wasn't saved in En format previously, it will show as is.
            const displayStartTime = lesson.startTime ? lesson.startTime.replace('오전', 'AM').replace('오후', 'PM') : '6:00 PM';
            const displayEndTime = lesson.endTime ? lesson.endTime.replace('오전', 'AM').replace('오후', 'PM') : '9:00 PM';

            return (
              <TouchableOpacity 
                key={lesson.id} 
                style={styles.lessonCard}
                onPress={() => router.push({ pathname: '/class-report', params: { lessonId: lesson.id } })}
              >
                <View style={styles.colorBarWrapper}>
                  <View style={[styles.lessonCardColorBar, { backgroundColor: isPast ? Colors.grayscale[400] : categoryColor }]} />
                </View>
                <View style={styles.lessonCardContent}>
                  <View>
                    <Text style={[styles.lessonDate, isPast && { color: Colors.grayscale[400] }]}>
                      {format(new Date(lesson.date), 'M월 d일 EEEE', { locale: ko })}
                    </Text>
                    <Text style={[styles.lessonTime, isPast && { color: Colors.grayscale[400] }]}>
                      {displayStartTime} ~ {displayEndTime}
                    </Text>
                  </View>
                  <View style={[styles.relativeDateBadge, isPast && { backgroundColor: Colors.grayscale[100] }]}>
                    <Text style={[styles.relativeDateText, isPast && { color: Colors.grayscale[700] }]}>
                      {renderRelativeDate(lesson.date)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#FFF' },
  title: { flex: 1, textAlign: 'center', fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.grayscale[900], paddingHorizontal: 16 },
  backButton: { width: 40, alignItems: 'flex-start' },
  headerRight: { width: 40, alignItems: 'flex-end' },
  monthSelectorContainer: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: Colors.grayscale[200] },
  monthSelectorContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  monthButton: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.grayscale[100], marginRight: 8 },
  monthButtonSelected: { backgroundColor: Colors.grayscale[900] },
  monthText: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[600] },
  monthTextSelected: { color: '#FFF' },
  content: { flex: 1, padding: 16, backgroundColor: Colors.grayscale[100] },
  emptyState: { padding: 32, alignItems: 'center', backgroundColor: '#FFF', borderRadius: 24, marginTop: 16 },
  emptyText: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[500] },
  lessonCard: { backgroundColor: '#FFF', borderRadius: 24, marginBottom: 12, flexDirection: 'row', paddingVertical: 20, paddingHorizontal: 24, alignItems: 'center' },
  colorBarWrapper: { justifyContent: 'center', marginRight: 16 },
  lessonCardColorBar: { width: 4, height: 44, borderRadius: 2 },
  lessonCardContent: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lessonDate: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[900], marginBottom: 4 },
  lessonTime: { fontFamily: 'Paybooc-Bold', fontSize: 12, color: Colors.grayscale[500] },
  relativeDateBadge: { backgroundColor: Colors.grayscale[100], paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  relativeDateText: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[700] },
});
