import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth, db } from '../../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

export default function SignUp() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const role = params.role as 'teacher' | 'student';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('알림', '모든 항목을 입력해주세요.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('알림', '비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Firestore에 사용자 정보 저장
      await setDoc(doc(db, 'Users', firebaseUser.uid), {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: name,
        role: role,
        profileImage: '1', // 기본 프로필
        createdAt: new Date(),
      });

      // 인증 이메일 전송
      await sendEmailVerification(firebaseUser);
      Alert.alert(
        '회원가입 완료', 
        '가입하신 이메일로 인증 메일을 발송했습니다. 인증 완료 후 로그인해주세요.',
        [{ text: '확인', onPress: () => router.replace('/(auth)/role-selection') }]
      );
      
    } catch (error: any) {
      console.error(error);
      Alert.alert('오류', error.message || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backText}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.roleText}>{role === 'teacher' ? '선생님' : '학생'} 회원가입</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>실명</Text>
            <TextInput
              style={styles.input}
              placeholder="실명을 입력하세요"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>이메일</Text>
            <TextInput
              style={styles.input}
              placeholder="이메일을 입력하세요"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>비밀번호</Text>
            <TextInput
              style={styles.input}
              placeholder="비밀번호를 입력하세요 (6자 이상)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Text style={styles.label}>비밀번호 확인</Text>
            <TextInput
              style={styles.input}
              placeholder="비밀번호를 다시 입력하세요"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={handleSignUp}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? '가입 중...' : '회원가입'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    paddingTop: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  backText: {
    fontFamily: 'Paybooc-Bold',
    fontSize: 24,
    color: Colors.grayscale[900],
  },
  roleText: {
    fontFamily: 'Paybooc-Bold',
    fontSize: 24,
    color: Colors.primary,
  },
  form: {
    padding: 24,
  },
  label: {
    fontFamily: 'Paybooc-Bold',
    fontSize: 16,
    color: Colors.grayscale[700],
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Paybooc-Bold',
    color: Colors.grayscale[900],
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.grayscale[300],
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    backgroundColor: Colors.grayscale[500],
  },
  buttonText: {
    fontFamily: 'Paybooc-Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
});
