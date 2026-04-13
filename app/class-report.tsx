import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function ClassReport() {
  const router = useRouter();
  const { classId, date } = useLocalSearchParams(); 
  
  const [activeTab, setActiveTab] = useState<'curriculum' | 'homework'>('curriculum');
  const [curriculumContent, setCurriculumContent] = useState('');
  
  const [hwTitle, setHwTitle] = useState('');
  const [hwDesc, setHwDesc] = useState('');
  const [hwDueDate, setHwDueDate] = useState('');

  const [loading, setLoading] = useState(false);

  const displayDate = date ? format(new Date(date as string), 'M월 d일 EEEE', { locale: ko }) : format(new Date(), 'M월 d일 EEEE', { locale: ko });

  const handleSave = async () => {
    if (!classId) {
      Alert.alert('오류', '수업 정보를 찾을 수 없습니다.');
      return;
    }

    setLoading(true);
    try {
      if (activeTab === 'curriculum') {
        if (!curriculumContent) {
          Alert.alert('알림', '커리큘럼 내용을 입력해주세요.');
          setLoading(false);
          return;
        }
        await addDoc(collection(db, 'Lessons'), {
          classId,
          date: date || new Date().toISOString(),
          curriculum: curriculumContent,
          createdAt: new Date().toISOString()
        });
        Alert.alert('성공', '커리큘럼이 저장되었습니다.', [{ text: '확인', onPress: () => router.back() }]);
      } else {
        if (!hwTitle || !hwDueDate) {
          Alert.alert('알림', '과제 제목과 제출 기한을 입력해주세요.');
          setLoading(false);
          return;
        }
        await addDoc(collection(db, 'Homeworks'), {
          classId,
          title: hwTitle,
          description: hwDesc,
          dueDate: hwDueDate, 
          createdAt: new Date().toISOString(),
          submissions: []
        });
        Alert.alert('성공', '과제가 등록되었습니다.', [{ text: '확인', onPress: () => router.back() }]);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('오류', '저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{displayDate}</Text>
        <TouchableOpacity style={styles.kebabButton}>
          <Ionicons name="ellipsis-vertical" size={24} color={Colors.grayscale[900]} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.contentContainer}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'curriculum' && styles.activeTabButton]}
              onPress={() => setActiveTab('curriculum')}
            >
              <Text style={[styles.tabText, activeTab === 'curriculum' && styles.activeTabText]}>커리큘럼 기록</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'homework' && styles.activeTabButton]}
              onPress={() => setActiveTab('homework')}
            >
              <Text style={[styles.tabText, activeTab === 'homework' && styles.activeTabText]}>과제 등록</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            {activeTab === 'curriculum' ? (
              <View>
                <Text style={styles.label}>오늘의 진도 / 수업 내용</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="수업 내용을 기록하세요"
                  multiline
                  value={curriculumContent}
                  onChangeText={setCurriculumContent}
                  textAlignVertical="top"
                />
              </View>
            ) : (
              <View>
                <Text style={styles.label}>과제 제목</Text>
                <TextInput
                  style={styles.input}
                  placeholder="과제 제목을 입력하세요"
                  value={hwTitle}
                  onChangeText={setHwTitle}
                />
                
                <Text style={styles.label}>설명 (선택)</Text>
                <TextInput
                  style={[styles.input, { height: 100 }]}
                  placeholder="과제에 대한 설명을 입력하세요"
                  multiline
                  value={hwDesc}
                  onChangeText={setHwDesc}
                  textAlignVertical="top"
                />

                <Text style={styles.label}>제출 기한 (예: 2024-04-15)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={hwDueDate}
                  onChangeText={setHwDueDate}
                />
              </View>
            )}
          </View>

          <TouchableOpacity 
            style={[styles.saveButton, loading && { backgroundColor: Colors.grayscale[500] }]} 
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>{loading ? '저장 중...' : '저장하기'}</Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: Colors.grayscale[100] },
  title: { fontFamily: 'Paybooc-Bold', fontSize: 18, color: Colors.grayscale[900] },
  backButton: { width: 40, alignItems: 'flex-start' },
  backText: { fontFamily: 'Paybooc-Bold', fontSize: 24, color: Colors.grayscale[900] },
  kebabButton: { width: 40, alignItems: 'flex-end', padding: 4 },
  contentContainer: { flex: 1 },
  content: { flex: 1, padding: 24 },
  tabContainer: { flexDirection: 'row', marginBottom: 24, backgroundColor: Colors.grayscale[300], borderRadius: 12, padding: 4 },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  activeTabButton: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  tabText: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[700] },
  activeTabText: { color: Colors.primary },
  formContainer: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, marginBottom: 24 },
  label: { fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.grayscale[900], marginBottom: 12 },
  input: { backgroundColor: Colors.background, borderRadius: 12, padding: 16, fontSize: 16, fontFamily: 'Paybooc-Bold', borderWidth: 1, borderColor: Colors.grayscale[300], marginBottom: 20 },
  textArea: { height: 200 },
  saveButton: { backgroundColor: Colors.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { fontFamily: 'Paybooc-Bold', fontSize: 18, color: '#FFF' },
});