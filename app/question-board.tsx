import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/Colors';
import { collection, query, where, getDocs, orderBy, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';

export default function QuestionBoard() {
  const router = useRouter();
  const { classId, className, color } = useLocalSearchParams();
  const { user } = useAuthStore();
  const [questions, setQuestions] = useState<any[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({}); // local state for answering

  const fetchQuestions = async () => {
    if (!classId) return;
    const q = query(collection(db, 'Questions'), where('classId', '==', classId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetchQuestions();
  }, [classId]);

  const handleAsk = async () => {
    if (!newQuestion.trim()) return;
    try {
      await addDoc(collection(db, 'Questions'), {
        classId,
        studentId: user?.uid,
        studentName: user?.name,
        content: newQuestion,
        createdAt: new Date().toISOString(),
        answer: null
      });
      setNewQuestion('');
      fetchQuestions();
      Alert.alert('알림', '질문이 등록되었습니다.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleAnswer = async (qId: string) => {
    const answerContent = answers[qId];
    if (!answerContent?.trim()) return;
    try {
      await updateDoc(doc(db, 'Questions', qId), {
        answer: answerContent
      });
      fetchQuestions();
      Alert.alert('알림', '답변이 등록되었습니다.');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{className} 질문방</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.content}>
          {questions.length === 0 ? (
            <Text style={styles.emptyText}>등록된 질문이 없습니다.</Text>
          ) : (
            questions.map(q => (
              <View key={q.id} style={styles.card}>
                <View style={[styles.cardColorBar, { backgroundColor: (color as string) || Colors.primary }]} />
                <View style={styles.cardContent}>
                  <Text style={styles.qHeader}>Q. {q.studentName}</Text>
                  <Text style={styles.qContent}>{q.content}</Text>
                  
                  {q.answer ? (
                    <View style={styles.answerBox}>
                      <Text style={styles.aHeader}>A. 선생님의 답변</Text>
                      <Text style={styles.aContent}>{q.answer}</Text>
                    </View>
                  ) : (
                    user?.role === 'teacher' ? (
                      <View style={styles.answerInputBox}>
                        <TextInput
                          style={styles.answerInput}
                          placeholder="답변을 입력하세요"
                          value={answers[q.id] || ''}
                          onChangeText={(text) => setAnswers({...answers, [q.id]: text})}
                          multiline
                        />
                        <TouchableOpacity style={styles.answerBtn} onPress={() => handleAnswer(q.id)}>
                          <Text style={styles.answerBtnText}>등록</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text style={styles.waitingText}>선생님의 답변을 기다리고 있어요.</Text>
                    )
                  )}
                </View>
              </View>
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>

        {user?.role === 'student' && (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="궁금한 점을 질문해보세요!"
              value={newQuestion}
              onChangeText={setNewQuestion}
              multiline
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleAsk}>
              <Text style={styles.sendButtonText}>전송</Text>
            </TouchableOpacity>
          </View>
        )}
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
  content: { flex: 1, padding: 24 },
  emptyText: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[500], textAlign: 'center' },
  card: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 16, flexDirection: 'row', overflow: 'hidden', elevation: 2 },
  cardColorBar: { width: 8 },
  cardContent: { padding: 16, flex: 1 },
  qHeader: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.primary, marginBottom: 4 },
  qContent: { fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.grayscale[900], marginBottom: 16 },
  answerBox: { backgroundColor: Colors.lightBlue, padding: 12, borderRadius: 12 },
  aHeader: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.primary, marginBottom: 4 },
  aContent: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[900] },
  waitingText: { fontFamily: 'Paybooc-Bold', fontSize: 12, color: Colors.grayscale[500], fontStyle: 'italic' },
  answerInputBox: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: Colors.background, borderRadius: 12, padding: 8 },
  answerInput: { flex: 1, minHeight: 40, fontFamily: 'Paybooc-Bold', fontSize: 14 },
  answerBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginLeft: 8 },
  answerBtnText: { fontFamily: 'Paybooc-Bold', color: '#FFF' },
  inputContainer: { flexDirection: 'row', padding: 16, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: Colors.grayscale[300], alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: Colors.background, borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, minHeight: 48, maxHeight: 100, fontFamily: 'Paybooc-Bold', fontSize: 14 },
  sendButton: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, marginLeft: 12, justifyContent: 'center' },
  sendButtonText: { fontFamily: 'Paybooc-Bold', color: '#FFF', fontSize: 16 }
});
