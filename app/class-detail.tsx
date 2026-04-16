import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image, Alert, Modal, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
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
  
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
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
            const q = query(lessonsRef, where('classId', '==', id));
            const lessonsSnap = await getDocs(q);
            const allLessons = lessonsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            allLessons.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            const now = new Date();
            const pastLessons = allLessons.filter(l => new Date(l.date) < now).reverse().slice(0, 2).reverse();
            const upcomingLessons = allLessons.filter(l => new Date(l.date) >= now).slice(0, 2);
            
            setRecentLessons([...pastLessons, ...upcomingLessons]);

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
    }, [id])
  );

  const handleInvite = () => {
    Alert.alert('수업 초대 코드', `초대 코드: ${classData?.inviteCode}\n학생들에게 이 코드를 공유하세요.`, [
      { text: '확인', style: 'default' }
    ]);
  };

  const handleDeleteClass = async () => {
    try {
      setDeleteModalVisible(false);
      await deleteDoc(doc(db, 'Classes', id as string));
      
      const lessonsRef = collection(db, 'Lessons');
      const q = query(lessonsRef, where('classId', '==', id));
      const lessonsSnap = await getDocs(q);
      
      const deletePromises = lessonsSnap.docs.map(d => deleteDoc(doc(db, 'Lessons', d.id)));
      await Promise.all(deletePromises);

      Alert.alert('삭제 완료', '수업이 삭제되었습니다.', [
        { text: '확인', onPress: () => router.replace('/(tabs)/home') }
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('오류', '수업 삭제 중 오류가 발생했습니다.');
    }
  };

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
          <Ionicons name="arrow-back" size={20} color={Colors.grayscale[900]} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{classData?.name}</Text>
        <View style={styles.headerRight}>
          {user?.role === 'teacher' ? (
            <View>
              <TouchableOpacity style={styles.iconButton} onPress={() => setDropdownVisible(!dropdownVisible)}>
                <Ionicons name="ellipsis-vertical" size={20} color={Colors.grayscale[900]} />
              </TouchableOpacity>
              
              {dropdownVisible && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity 
                    style={styles.dropdownItem} 
                    onPress={() => {
                      setDropdownVisible(false);
                      router.push({ pathname: '/class-edit', params: { id } });
                    }}
                  >
                    <Ionicons name="pencil" size={17} color={Colors.grayscale[700]} />
                    <Text style={styles.dropdownText}>수정하기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.dropdownItem, { borderBottomWidth: 0 }]} 
                    onPress={() => {
                      setDropdownVisible(false);
                      setDeleteModalVisible(true);
                    }}
                  >
                    <Ionicons name="trash" size={17} color={Colors.categories.red} />
                    <Text style={[styles.dropdownText, { color: Colors.categories.red }]}>삭제하기</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={{ width: 24 }} />
          )}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => setDropdownVisible(false)}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{user?.role === 'teacher' ? '학생' : '선생님'}</Text>
              {user?.role === 'teacher' && (
                <TouchableOpacity onPress={() => {/* Go to student list */}} style={styles.moreButton}>
                  <Text style={styles.moreText}>더보기</Text>
                  <Ionicons name="chevron-forward" size={15} color={Colors.grayscale[500]} />
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
              <TouchableOpacity onPress={() => router.push({ pathname: '/class-list', params: { id } })} style={styles.moreButton}>
                <Text style={styles.moreText}>더보기</Text>
                <Ionicons name="chevron-forward" size={15} color={Colors.grayscale[500]} />
              </TouchableOpacity>
            </View>

            {recentLessons.length === 0 ? (
              <View style={styles.emptyState}>
                 <Text style={styles.emptyText}>기록된 수업이 없습니다.</Text>
              </View>
            ) : (
              recentLessons.map((lesson) => {
                const isPast = new Date(lesson.date) < new Date();
                const categoryColor = classData?.categoryColor || Colors.primary;
                
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
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>메뉴</Text>
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
        </Pressable>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>수업 삭제</Text>
            <Text style={styles.modalMessage}>이 수업을 삭제하면 되돌릴 수 없습니다.{'\n'}정말 삭제하시겠습니까?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setDeleteModalVisible(false)}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalDeleteButton} onPress={handleDeleteClass}>
                <Text style={styles.modalDeleteText}>삭제하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, backgroundColor: '#FFFFFF', zIndex: 10 },
  title: { flex: 1, textAlign: 'center', fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.grayscale[900], paddingHorizontal: 16 },
  backButton: { padding: 8, width: 40, alignItems: 'flex-start' },
  headerRight: { width: 40, alignItems: 'flex-end', padding: 8 },
  iconButton: { padding: 4 },
  dropdownMenu: { position: 'absolute', top: 40, right: 0, backgroundColor: '#FFF', borderRadius: 12, padding: 8, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, width: 120, zIndex: 100 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: Colors.grayscale[100], gap: 8 },
  dropdownText: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[900] },
  content: { flex: 1, padding: 24, backgroundColor: Colors.grayscale[100] },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontFamily: 'Paybooc-Bold', fontSize: 18, color: Colors.grayscale[900] },
  moreButton: { flexDirection: 'row', alignItems: 'center' },
  moreText: { fontFamily: 'Paybooc-Bold', fontSize: 12, color: Colors.grayscale[500], marginRight: 4 },
  membersList: { flexDirection: 'row' },
  memberItem: { alignItems: 'center', marginRight: 16 },
  memberProfile: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.grayscale[300], marginBottom: 8 },
  memberName: { fontFamily: 'Paybooc-Bold', fontSize: 12, color: Colors.grayscale[700] },
  emptyState: { padding: 16, alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12 },
  emptyText: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[500] },
  
  lessonCard: { backgroundColor: '#FFF', borderRadius: 24, marginBottom: 12, flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 24, alignItems: 'center' },
  colorBarWrapper: { justifyContent: 'center', marginRight: 16 },
  lessonCardColorBar: { width: 4, height: 44, borderRadius: 2 },
  lessonCardContent: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lessonDate: { fontFamily: 'Paybooc-Bold', fontSize: 15, color: Colors.grayscale[900], marginBottom: 4 },
  lessonTime: { fontFamily: 'Paybooc-Bold', fontSize: 13, color: Colors.grayscale[500] },
  relativeDateBadge: { backgroundColor: Colors.grayscale[100], paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  relativeDateText: { fontFamily: 'Paybooc-Bold', fontSize: 12, color: Colors.grayscale[700] },
  
  menuContainer: { gap: 12 },
  menuButton: { backgroundColor: '#FFF', borderRadius: 16, padding: 10, flexDirection: 'row', alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  menuIconContainer: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.lightBlue, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  menuText: { fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.grayscale[700] },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, width: '100%', alignItems: 'center' },
  modalTitle: { fontFamily: 'Paybooc-Bold', fontSize: 20, color: Colors.grayscale[900], marginBottom: 12 },
  modalMessage: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[500], textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancelButton: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: Colors.grayscale[100], alignItems: 'center' },
  modalCancelText: { fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.grayscale[600] },
  modalDeleteButton: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: Colors.categories.red, alignItems: 'center' },
  modalDeleteText: { fontFamily: 'Paybooc-Bold', fontSize: 16, color: '#FFF' },
});
