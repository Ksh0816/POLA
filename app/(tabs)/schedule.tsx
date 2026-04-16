import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuthStore } from '../../store/authStore';
import { format, differenceInDays, startOfWeek, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function Schedule() {
  const { user } = useAuthStore();
  const [classes, setClasses] = useState<any[]>([]);
  const [studentsMap, setStudentsMap] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);

  const fetchClassesAndUsers = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const classesRef = collection(db, 'Classes');
      let q;
      if (user.role === 'teacher') {
        q = query(classesRef, where('teacherId', '==', user.uid));
      } else {
        q = query(classesRef, where('students', 'array-contains', user.uid));
      }
      
      const snap = await getDocs(q);
      const fetchedClasses = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setClasses(fetchedClasses);

      if (user.role === 'teacher') {
        const studentIds = new Set<string>();
        fetchedClasses.forEach(cls => {
          if (cls.students) {
            cls.students.forEach((id: string) => studentIds.add(id));
          }
        });

        const newStudentsMap: Record<string, string> = {};
        if (studentIds.size > 0) {
           const userPromises = Array.from(studentIds).map(id => getDoc(doc(db, 'Users', id)));
           const userSnaps = await Promise.all(userPromises);
           userSnaps.forEach(snap => {
             if (snap.exists()) {
               newStudentsMap[snap.id] = snap.data().name;
             }
           });
        }
        setStudentsMap(newStudentsMap);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
      fetchClassesAndUsers();
    }, [user])
  );

  useEffect(() => {
    fetchClassesAndUsers();
  }, [user]);

  const renderRelativeDate = (dateString: string) => {
    const lessonDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lessonDate.setHours(0, 0, 0, 0);
    const diff = differenceInDays(lessonDate, today);
    
    if (diff === 0) return '오늘';
    if (diff === 1) return '내일';
    if (diff === -1) return '어제';
    if (diff > 0) return `${diff}일 후`;
    return `${Math.abs(diff)}일 전`;
  };

  const selectedDateObj = new Date(selectedDate);
  const topDayNumber = format(selectedDateObj, 'd');
  const topDayOfWeek = format(selectedDateObj, 'EEEE', { locale: ko });
  const topMonthYearFmt = format(selectedDateObj, 'yyyy년 M월', { locale: ko });
  const relativeText = renderRelativeDate(selectedDate);

  const generateDates = () => {
    const dates = [];
    const today = new Date();
    // Generate dates from 30 days ago to 30 days in the future
    for (let i = -30; i <= 30; i++) {
      dates.push(addDays(today, i));
    }
    return dates;
  };

  const scrollDates = useMemo(() => generateDates(), []);
  
  const getInitialScrollIndex = () => {
    return scrollDates.findIndex(date => format(date, 'yyyy-MM-dd') === selectedDate) || 30; // 30 is today's index
  };

  const dayNamesMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const selectedDayId = dayNamesMap[selectedDateObj.getDay()];

  const convertTo24Hour = (timeStr: string) => {
    if (!timeStr) return '';
    if (!timeStr.includes('AM') && !timeStr.includes('PM')) return timeStr; // Already 24h format or different format
    
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':');
    
    if (hours === '12') {
      hours = '00';
    }
    
    if (modifier === 'PM') {
      hours = parseInt(hours, 10) + 12 + '';
    }
    
    return `${hours.padStart(2, '0')}:${minutes}`;
  };

  const dailySchedules = useMemo(() => {
    const schedulesList: any[] = [];
    classes.forEach(cls => {
      if (cls.schedules && Array.isArray(cls.schedules)) {
         const daySchedule = cls.schedules.find((s: any) => s.day === selectedDayId);
         if (daySchedule) {
            schedulesList.push({
               classId: cls.id,
               name: cls.name,
               categoryColor: cls.categoryColor,
               teacherName: cls.teacherName,
               students: cls.students || [],
               startTime: convertTo24Hour(daySchedule.startTime),
               endTime: convertTo24Hour(daySchedule.endTime),
            });
         }
      }
    });
    // Sort schedules by start time strings
    schedulesList.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    return schedulesList;
  }, [classes, selectedDayId]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.topLeft}>
          <Text style={styles.topLargeDate}>{topDayNumber}</Text>
          <View style={styles.topDateStack}>
            <Text style={styles.topDayOfWeek}>{topDayOfWeek}</Text>
            <Text style={styles.topMonthYear}>{topMonthYearFmt}</Text>
          </View>
        </View>
        <View style={styles.topRightPill}>
          <Text style={styles.topRightText}>{relativeText}</Text>
        </View>
      </View>

      {/* Week Strip */}
      <View style={styles.weekStripContainer}>
        <FlatList
          data={scrollDates}
          horizontal
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={getInitialScrollIndex()}
          getItemLayout={(data, index) => ({ length: 64, offset: 64 * index, index })} // Approximate width per item
          keyExtractor={(item) => format(item, 'yyyy-MM-dd')}
          renderItem={({ item }) => {
            const isSelected = format(item, 'yyyy-MM-dd') === selectedDate;
            const dayName = format(item, 'E', { locale: ko });
            const dayNum = format(item, 'd');
            
            return (
              <TouchableOpacity 
                style={[styles.weekDayContainer, isSelected && styles.weekDayContainerSelected]}
                onPress={() => setSelectedDate(format(item, 'yyyy-MM-dd'))}
              >
                <Text style={[styles.weekDayName, isSelected && styles.weekDayNameSelected]}>{dayName}</Text>
                <Text style={[styles.weekDayNum, isSelected && styles.weekDayNumSelected]}>{dayNum}</Text>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.weekStrip}
        />
      </View>

      <View style={styles.whiteBackgroundContainer}>
        <View style={styles.listContainerWrapper}>
          <View style={styles.fullVerticalDivider} />
          
          <View style={{ flex: 1, zIndex: 2 }}>
            {/* List Header */}
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderTime}>시간</Text>
              <Text style={styles.listHeaderCourse}>수업</Text>
            </View>

            {/* Schedule List */}
            <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
               {dailySchedules.length === 0 ? (
                  <Text style={styles.emptyText}>일정이 없습니다.</Text>
               ) : (
                  dailySchedules.map((schedule, index) => {
                     let subtitle = '';
                     if (user?.role === 'teacher') {
                        if (schedule.students.length === 0) subtitle = '학생 없음';
                        else if (schedule.students.length === 1) subtitle = studentsMap[schedule.students[0]] || '학생';
                        else subtitle = `${studentsMap[schedule.students[0]] || '학생'} 외 ${schedule.students.length - 1}명`;
                     } else {
                        subtitle = `${schedule.teacherName || '선생님'} 선생님`;
                     }

                     return (
                        <View key={index} style={styles.scheduleRow}>
                           <View style={styles.timeColumn}>
                              <Text style={styles.timeStart}>{schedule.startTime}</Text>
                              <Text style={styles.timeEnd}>{schedule.endTime}</Text>
                           </View>
                           <View style={styles.cardColumn}>
                              <View style={styles.lessonCard}>
                                 <View style={styles.colorBarWrapper}>
                                    <View style={[styles.lessonCardColorBar, { backgroundColor: schedule.categoryColor || Colors.primary }]} />
                                 </View>
                                 <View style={styles.lessonCardContent}>
                                    <Text style={styles.className}>{schedule.name}</Text>
                                    <Text style={styles.studentName}>{subtitle}</Text>
                                 </View>
                              </View>
                           </View>
                        </View>
                     );
                  })
               )}
               <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  whiteBackgroundContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
  topLeft: { flexDirection: 'row', alignItems: 'center' },
  topLargeDate: { fontFamily: 'Paybooc-Bold', fontSize: 40, color: Colors.grayscale[900], marginRight: 12 },
  topDateStack: { justifyContent: 'center' },
  topDayOfWeek: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[500], marginBottom: 4 },
  topMonthYear: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[500] },
  topRightPill: { backgroundColor: Colors.primary + '20', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 15 },
  topRightText: { fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.primary },

  weekStripContainer: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: Colors.grayscale[100] },
  weekStrip: { paddingHorizontal: 24, paddingVertical: 16, gap: 16 },
  weekDayContainer: { alignItems: 'center', justifyContent: 'center', width: 48, height: 72, borderRadius: 15, backgroundColor: 'transparent' },
  weekDayContainerSelected: { backgroundColor: Colors.primary },
  weekDayName: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[500], marginBottom: 8 },
  weekDayNameSelected: { color: '#FFF' },
  weekDayNum: { fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.grayscale[900] },
  weekDayNumSelected: { color: '#FFF' },
  
  listHeader: { flexDirection: 'row', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 },
  listHeaderTime: { width: 55, fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[500] },
  listHeaderCourse: { flex: 1, paddingLeft: 16, fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[500] },

  listContainerWrapper: { flex: 1, flexDirection: 'row' },
  fullVerticalDivider: { width: 1, backgroundColor: Colors.grayscale[100], position: 'absolute', left: 77, top: 0, bottom: 0, zIndex: 0, marginTop: 50 },

  listContainer: { flex: 1, paddingHorizontal: 24 },
  scheduleRow: { flexDirection: 'row', marginBottom: 16 },
  timeColumn: { width: 45, paddingRight: 6, paddingTop: 16 },
  timeStart: { fontFamily: 'Paybooc-Bold', fontSize: 13.5, color: Colors.grayscale[900] },
  timeEnd: { fontFamily: 'Paybooc-Bold', fontSize: 13, color: Colors.grayscale[500], marginTop: 11 },
  
  cardColumn: { flex: 1, paddingLeft: 16 },
  lessonCard: { backgroundColor: Colors.background, borderRadius: 24, flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 24, alignItems: 'center', elevation: 0 },
  colorBarWrapper: { justifyContent: 'center', marginRight: 16 },
  lessonCardColorBar: { width: 4, height: 44, borderRadius: 2 },
  lessonCardContent: { flex: 1, justifyContent: 'center' },
  className: { fontFamily: 'Paybooc-Bold', fontSize: 15, color: Colors.grayscale[900], marginBottom: 4 },
  studentName: { fontFamily: 'Paybooc-Bold', fontSize: 13, color: Colors.grayscale[500] },
  
  emptyText: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[500], textAlign: 'center', marginTop: 32 },
});