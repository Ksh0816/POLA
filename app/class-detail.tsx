import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuthStore } from '../store/authStore';
import { format, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';

const profileImages: Record<string, any> = {
  '1': require('../assets/profiles/1.png'),
  '2': require('../assets/profiles/2.png'),
  '3': require('../assets/profiles/3.png'),
  '4': require('../assets/profiles/4.png'),
  '5': require('../assets/profiles/5.png'),
  '6': require('../assets/profiles/6.png'),
};

export default function ClassDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  
  const [classData, setClassData] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [recentLessons, setRecentLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClassData = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'Classes', id as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setClassData({ id: docSnap.id, ...data });

          if (user?.role === 'teacher') {
             if (data.students && data.students.length > 0) {
               const studentRefs = data.students.map((sid: string) => getDoc(doc(db, 'Users', sid)));
               const studentSnaps = await Promise.all(studentRefs);
               const students = studentSnaps.filter(s => s.exists()).map(s => s.data());
               setMembers(students);
             }
          } else {
             const teacherSnap = await getDoc(doc(db, 'Users', data.teacherId));
             if (teacherSnap.exists()) {
               setMembers([teacherSnap.data()]);
             }
          }

          const lessonsRef = collection(db, 'Lessons');
          const q = query(lessonsRef, where('classId', '==', id), orderBy('date', 'desc'), limit(4));
          const lessonsSnap = await getDocs(q);
          const lessons = lessonsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          setRecentLessons(lessons);

        } else {
          Alert.alert('오류', '수업 정보를 찾을 수 없습니다.');
          router.back();
        }
      } catch (error) {
        console.error("Error fetching class details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClassData();
  }, [id]);

  const handleInvite = () => {
    Alert.alert('수업 초대 코드', `초대 코드: ${classData?.inviteCode}\n학생들에게 이 코드를 공유하세요.`, [
      { text: '확인', style: 'default' }
    ]);
  };

  const renderRelativeDate = (dateString: string) => {
    const lessonDate = new Date(dateString);
    const today = new Date();
    const diff = differenceInDays(lessonDate, today);
    
    if (diff === 0) return '오늘';
    if (diff > 0) return `${diff}일 후`;
    return `${Math.abs(diff)}일 전`;
  };

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
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{classData?.name}</Text>
        <View style={styles.headerRight}>
          {user?.role === 'teacher' && (
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="ellipsis-vertical" size={24} color={Colors.grayscale[900]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{user?.role === 'teacher' ? '학생' : '선생님'}</Text>
            {user?.role === 'teacher' && (
              <TouchableOpacity onPress={() => {/* Go to student list */}}>
                <Ionicons name="chevron-forward" size={20} color={Colors.grayscale[500]} />
              </TouchableOpacity>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.membersList}>
            {members.map((member, idx) => (
              <View key={idx} style={styles.memberItem}>
                <Image 
                  source={member.profileImage ? profileImages[member.profileImage] : profileImages['1']} 
                  style={styles.memberProfile} 
                />
                <Text style={styles.memberName}>{member.name}</Text>
              </View>
            ))}
            {members.length === 0 && (
              <Text style={styles.emptyText}>등록된 인원이 없습니다.</Text>
            )}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>최근 수업</Text>
            <TouchableOpacity onPress={() => {/* Go to class list */}}>
              <Ionicons name="chevron-forward" size={20} color={Colors.grayscale[500]} />
            </TouchableOpacity>
          </View>

          {recentLessons.length === 0 ? (
            <View style={styles.emptyState}>
               <Text style={styles.emptyText}>기록된 수업이 없습니다.</Text>
            </View>
          ) : (
            recentLessons.map((lesson) => (
              <TouchableOpacity key={lesson.id} style={styles.lessonCard}>
                <View style={[styles.lessonCardColorBar, { backgroundColor: classData.categoryColor }]} />
                <View style={styles.lessonCardContent}>
                  <View>
                    <Text style={styles.lessonDate}>{format(new Date(lesson.date), 'M월 d일 EEEE', { locale: ko })}</Text>
                    <Text style={styles.lessonTime}>오후 6:00 ~ 오후 9:00</Text>
                  </View>
                  <View style={styles.relativeDateBadge}>
                    <Text style={styles.relativeDateText}>{renderRelativeDate(lesson.date)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>메뉴</Text>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuButton}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="list" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.menuText}>커리큘럼</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuButton}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="document-text" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.menuText}>과제 게시판</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuButton}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="chatbubbles" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.menuText}>질문 게시판</Text>
            </TouchableOpacity>

            {user?.role === 'teacher' && (
              <TouchableOpacity style={styles.menuButton} onPress={handleInvite}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name="person-add" size={24} color={Colors.primary} />
                </View>
                <Text style={styles.menuText}>수업 초대</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: Colors.grayscale[100] },
  title: { flex: 1, textAlign: 'center', fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.grayscale[900], paddingHorizontal: 16 },
  backButton: { width: 40, alignItems: 'flex-start' },
  backText: { fontFamily: 'Paybooc-Bold', fontSize: 24, color: Colors.grayscale[900] },
  headerRight: { width: 40, alignItems: 'flex-end' },
  iconButton: { padding: 4 },
  content: { flex: 1, padding: 24 },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontFamily: 'Paybooc-Bold', fontSize: 18, color: Colors.grayscale[900] },
  membersList: { flexDirection: 'row' },
  memberItem: { alignItems: 'center', marginRight: 16 },
  memberProfile: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.grayscale[300], marginBottom: 8 },
  memberName: { fontFamily: 'Paybooc-Bold', fontSize: 12, color: Colors.grayscale[700] },
  emptyState: { padding: 16, alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12 },
  emptyText: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[500] },
  lessonCard: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 12, flexDirection: 'row', overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  lessonCardColorBar: { width: 8 },
  lessonCardContent: { flex: 1, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lessonDate: { fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.grayscale[900], marginBottom: 4 },
  lessonTime: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[500] },
  relativeDateBadge: { backgroundColor: Colors.grayscale[100], paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  relativeDateText: { fontFamily: 'Paybooc-Bold', fontSize: 12, color: Colors.grayscale[700] },
  menuContainer: { gap: 12 },
  menuButton: { backgroundColor: '#FFF', borderRadius: 16, padding: 10, flexDirection: 'row', alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  menuIconContainer: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.lightBlue, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  menuText: { fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.grayscale[700] },
});