import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';

export default function RoleSelection() {
  const router = useRouter();

  const handleRoleSelect = (role: 'teacher' | 'student') => {
    router.push({ pathname: '/(auth)/sign-in', params: { role } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>POLA</Text>
        <Text style={styles.subtitle}>당신의 역할을 선택해주세요</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.teacherButton]} 
            onPress={() => handleRoleSelect('teacher')}
          >
            <Text style={styles.buttonText}>선생님</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.studentButton]} 
            onPress={() => handleRoleSelect('student')}
          >
            <Text style={styles.buttonText}>학생</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontFamily: 'Paybooc-Bold',
    fontSize: 48,
    color: Colors.primary,
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: 'Paybooc-Bold',
    fontSize: 18,
    color: Colors.grayscale[700],
    marginBottom: 64,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  button: {
    width: '100%',
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherButton: {
    backgroundColor: Colors.primary,
  },
  studentButton: {
    backgroundColor: Colors.categories.green,
  },
  buttonText: {
    fontFamily: 'Paybooc-Bold',
    fontSize: 20,
    color: '#FFFFFF',
  },
});
