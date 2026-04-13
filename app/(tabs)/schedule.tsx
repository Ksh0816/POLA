import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Calendar, CalendarProvider, ExpandableCalendar, LocaleConfig } from 'react-native-calendars';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuthStore } from '../../store/authStore';
import { format } from 'date-fns';

LocaleConfig.locales['ko'] = {
  monthNames: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  monthNamesShort: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  dayNames: ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'],
  dayNamesShort: ['일','월','화','수','목','금','토'],
  today: '오늘'
};
LocaleConfig.defaultLocale = 'ko';

export default function Schedule() {
  const { user } = useAuthStore();
  const [classes, setClasses] = useState<any[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isWeekly, setIsWeekly] = useState(false);

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
      const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setClasses(fetched);

      const marks: any = {};
      fetched.forEach(cls => {
        if (cls.schedules && cls.schedules.length > 0) {
           const todayStr = format(new Date(), 'yyyy-MM-dd');
           marks[todayStr] = { marked: true, dotColor: cls.categoryColor || Colors.primary };
        }
      });
      setMarkedDates(marks);
    };

    fetchClasses();
  }, [user]);

  const onDayPress = (day: any) => {
    setSelectedDate(day.dateString);
  };

  const getSchedulesForSelectedDate = () => {
    return classes; 
  };

  const schedules = getSchedulesForSelectedDate();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>일정</Text>
        <TouchableOpacity style={styles.toggleButton} onPress={() => setIsWeekly(!isWeekly)}>
          <Text style={styles.toggleText}>{isWeekly ? '월별 보기' : '주별 보기'}</Text>
        </TouchableOpacity>
      </View>

      <CalendarProvider date={selectedDate} onDateChanged={onDayPress}>
        {isWeekly ? (
          <ExpandableCalendar 
            firstDay={1}
            markedDates={{
              ...markedDates,
              [selectedDate]: { ...markedDates[selectedDate], selected: true, selectedColor: Colors.primary }
            }}
            theme={{
              todayTextColor: Colors.primary,
              selectedDayBackgroundColor: Colors.primary,
            }}
          />
        ) : (
          <Calendar
            current={selectedDate}
            onDayPress={onDayPress}
            markedDates={{
              ...markedDates,
              [selectedDate]: { ...markedDates[selectedDate], selected: true, selectedColor: Colors.primary }
            }}
            theme={{
              todayTextColor: Colors.primary,
              selectedDayBackgroundColor: Colors.primary,
            }}
          />
        )}
      </CalendarProvider>

      <View style={styles.scheduleListContainer}>
        <Text style={styles.listTitle}>{format(new Date(selectedDate), 'M월 d일')} 일정</Text>
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {schedules.length === 0 ? (
            <Text style={styles.emptyText}>일정이 없습니다.</Text>
          ) : (
            schedules.map(cls => (
              <View key={cls.id} style={styles.scheduleCard}>
                <View style={[styles.cardColorBar, { backgroundColor: cls.categoryColor || Colors.primary }]} />
                <View style={styles.cardContent}>
                  <Text style={styles.className}>{cls.name}</Text>
                  <Text style={styles.timeText}>
                    {cls.schedules?.[0]?.startTime || '18:00'} ~ {cls.schedules?.[0]?.endTime || '20:00'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 16 },
  title: { fontFamily: 'Paybooc-Bold', fontSize: 24, color: Colors.grayscale[900] },
  toggleButton: { backgroundColor: Colors.grayscale[300], paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  toggleText: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[700] },
  scheduleListContainer: { flex: 1, padding: 24, backgroundColor: Colors.background },
  listTitle: { fontFamily: 'Paybooc-Bold', fontSize: 18, color: Colors.grayscale[900], marginBottom: 16 },
  list: { flex: 1 },
  emptyText: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[500], textAlign: 'center', marginTop: 24 },
  scheduleCard: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 12, flexDirection: 'row', overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  cardColorBar: { width: 8 },
  cardContent: { flex: 1, padding: 16 },
  className: { fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.grayscale[900], marginBottom: 4 },
  timeText: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[500] },
});