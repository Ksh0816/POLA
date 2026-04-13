import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthStore } from '../../store/authStore';

export default function SignIn() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const role = params.role as 'teacher' | 'student';
  const { setUser } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('알림', '이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const userDoc = await getDoc(doc(db, 'Users', firebaseUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role !== role) {
           Alert.alert('알림', '선택한 역할과 계정의 역할이 일치하지 않습니다.');
           // signOut ?
        } else {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: userData.name,
            role: userData.role,
            profileImage: userData.profileImage,
          });
          router.replace('/(tabs)/home');
        }
      } else {
         Alert.alert('오류', '사용자 정보를 찾을 수 없습니다.');
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('로그인 실패', '이메일 또는 비밀번호를 확인해주세요.');
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.roleText}>{role === 'teacher' ? '선생님' : '학생'} 로그인</Text>
        </View>

        <View style={styles.form}>
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
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleSignIn}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? '로그인 중...' : '로그인'}</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <TouchableOpacity onPress={() => {/* TODO: Forgot Password */}}>
              <Text style={styles.footerText}>비밀번호 찾기</Text>
            </TouchableOpacity>
            <Text style={styles.divider}>|</Text>
            <TouchableOpacity onPress={() => router.push({ pathname: '/(auth)/sign-up', params: { role } })}>
              <Text style={styles.footerText}>회원가입</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    flex: 1,
    padding: 24,
    justifyContent: 'center',
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontFamily: 'Paybooc-Bold',
    fontSize: 14,
    color: Colors.grayscale[700],
  },
  divider: {
    marginHorizontal: 16,
    color: Colors.grayscale[500],
  },
});
