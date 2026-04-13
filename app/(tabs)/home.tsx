import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useRouter } from 'expo-router';

// Dummy mapping for profile images
const profileImages: Record<string, any> = {
  '1': require('../../assets/profiles/1.png'),
  '2': require('../../assets/profiles/2.png'),
  '3': require('../../assets/profiles/3.png'),
  '4': require('../../assets/profiles/4.png'),
  '5': require('../../assets/profiles/5.png'),
  '6': require('../../assets/profiles/6.png'),
};

export default function Home() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    // Fetch classes
    const fetchClasses = async () => {
      if (!user) return;
      
      const classesRef = collection(db, 'Classes');
      let q;
      if (user.role === 'teacher') {
        q = query(classesRef, where('teacherId', '==', user.uid));
      } else {
        q = query(classesRef, where('students', 'array-contains', user.uid));
      }

      try {
        const querySnapshot = await getDocs(q);
        const fetchedClasses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setClasses(fetchedClasses);
      } catch (e) {
        console.error("Error fetching classes:", e);
      }
    };

    fetchClasses();
  }, [user]);

  const handleFabPress = () => {
    if (user?.role === 'teacher') {
      router.push('/class-create');
    } else {
      // Show join popup
      console.log('Show join class popup');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.name} 님</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role === 'teacher' ? '선생님' : '학생'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={logout}>
           <Image 
            source={user?.profileImage ? profileImages[user.profileImage] : profileImages['1']} 
            style={styles.profileImage} 
          />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>나의 수업</Text>
        
        <ScrollView style={styles.classList} showsVerticalScrollIndicator={false}>
          {classes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>진행 중인 수업이 없습니다.</Text>
            </View>
          ) : (
            classes.map(cls => (
              <TouchableOpacity 
                key={cls.id} 
                style={styles.classCard}
                onPress={() => router.push({ pathname: '/class-detail', params: { id: cls.id } })}
              >
                <View style={[styles.iconContainer, { backgroundColor: cls.categoryColor + '33' }]}>
                  {/* Dummy Icon - later use the specific icon name */}
                  <Ionicons name="book" size={24} color={cls.categoryColor} />
                </View>
                
                <View style={styles.classInfo}>
                  <Text style={styles.className}>{cls.name}</Text>
                  <Text style={styles.classSchedule}>
                    {cls.schedules?.map((s: any) => s.day).join(', ')}
                  </Text>
                </View>

                <View style={styles.statusBadge}>
                  {user?.role === 'teacher' ? (
                    <>
                      <Ionicons name="people" size={12} color={Colors.grayscale[700]} />
                      <Text style={styles.statusText}>{cls.students?.length || 0}명의 학생 연결됨</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="person" size={12} color={Colors.grayscale[700]} />
                      <Text style={styles.statusText}>{cls.teacherName || '선생님'}</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleFabPress}>
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontFamily: 'Paybooc-Bold',
    fontSize: 24,
    color: Colors.grayscale[900],
    marginRight: 8,
  },
  roleBadge: {
    backgroundColor: Colors.grayscale[300],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleText: {
    fontFamily: 'Paybooc-Bold',
    fontSize: 12,
    color: Colors.grayscale[700],
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.grayscale[300],
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontFamily: 'Paybooc-Bold',
    fontSize: 20,
    color: Colors.grayscale[900],
    marginBottom: 16,
  },
  classList: {
    flex: 1,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Paybooc-Bold',
    fontSize: 16,
    color: Colors.grayscale[500],
  },
  classCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontFamily: 'Paybooc-Bold',
    fontSize: 18,
    color: Colors.grayscale[900],
    marginBottom: 4,
  },
  classSchedule: {
    fontFamily: 'Paybooc-Bold',
    fontSize: 14,
    color: Colors.grayscale[500],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightBlue,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    position: 'absolute',
    top: 20,
    right: 20,
  },
  statusText: {
    fontFamily: 'Paybooc-Bold',
    fontSize: 12,
    color: Colors.grayscale[700],
    marginLeft: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});
