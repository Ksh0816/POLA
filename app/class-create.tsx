import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ScrollView, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuthStore } from '../store/authStore';

const DAYS = [
  { id: 'mon', label: 'M' },
  { id: 'tue', label: 'T' },
  { id: 'wed', label: 'W' },
  { id: 'thu', label: 'T' },
  { id: 'fri', label: 'F' },
  { id: 'sat', label: 'S' },
  { id: 'sun', label: 'S' },
];

const ICONS = ['book', 'language', 'calculator', 'musical-notes', 'flask', 'earth'];

export default function ClassCreate() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [className, setClassName] = useState('');
  const [icon, setIcon] = useState('book');
  const [categoryColor, setCategoryColor] = useState(Colors.categories.purple);
  const [iconModalVisible, setIconModalVisible] = useState(false);
  
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(new Date().setMonth(new Date().getMonth() + 1)));
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);

  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [dayTimes, setDayTimes] = useState<Record<string, { start: Date, end: Date }>>({});
  const [showTimePicker, setShowTimePicker] = useState<{day: string, type: 'start' | 'end'} | null>(null);
  
  const [loading, setLoading] = useState(false);

  const toggleDay = (dayId: string) => {
    if (selectedDays.includes(dayId)) {
      setSelectedDays(selectedDays.filter(d => d !== dayId));
      const newTimes = { ...dayTimes };
      delete newTimes[dayId];
      setDayTimes(newTimes);
    } else {
      setSelectedDays([...selectedDays, dayId]);
      const defaultStart = new Date(); defaultStart.setHours(18, 0, 0);
      const defaultEnd = new Date(); defaultEnd.setHours(20, 0, 0);
      setDayTimes({ ...dayTimes, [dayId]: { start: defaultStart, end: defaultEnd } });
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  const formatDate = (date: Date) => {
    return `${date.getFullYear()}.${(date.getMonth()+1).toString().padStart(2,'0')}.${date.getDate().toString().padStart(2,'0')}`;
  };

  const handleCreate = async () => {
    if (!className) {
      Alert.alert('알림', '수업 이름을 입력해주세요.');
      return;
    }
    if (selectedDays.length === 0) {
      Alert.alert('알림', '수업 요일을 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const schedules = selectedDays.map(dayId => ({
        day: dayId,
        startTime: formatTime(dayTimes[dayId].start),
        endTime: formatTime(dayTimes[dayId].end),
      }));

      await addDoc(collection(db, 'Classes'), {
        teacherId: user?.uid,
        teacherName: user?.name,
        name: className,
        icon: icon,
        categoryColor: categoryColor,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        schedules: schedules,
        students: [],
        inviteCode: inviteCode,
        createdAt: new Date().toISOString(),
      });

      Alert.alert('성공', '수업이 성공적으로 생성되었습니다.', [
        { text: '확인', onPress: () => router.replace('/(tabs)/home') }
      ]);
    } catch (e: any) {
      console.error(e);
      Alert.alert('오류', '수업 생성 중 오류가 발생했습니다.');
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
        <Text style={styles.title}>수업 생성</Text>
        <TouchableOpacity onPress={handleCreate} disabled={loading}>
           <Text style={[styles.saveText, loading && { color: Colors.grayscale[500] }]}>저장</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.label}>수업 이름</Text>
          <View style={styles.nameIconContainer}>
            <TouchableOpacity 
              style={[styles.iconPreview, { backgroundColor: categoryColor + '33' }]}
              onPress={() => setIconModalVisible(true)}
            >
              <Ionicons name={icon as any} size={24} color={categoryColor} />
              <View style={styles.editBadge}>
                <Ionicons name="pencil" size={10} color="#FFF" />
              </View>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="수업 이름을 입력하세요"
              value={className}
              onChangeText={setClassName}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>수업 기간</Text>
          <View style={styles.dateContainer}>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker('start')}>
              <Text style={styles.dateText}>{formatDate(startDate)}</Text>
            </TouchableOpacity>
            <Text style={styles.dateDivider}>~</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker('end')}>
              <Text style={styles.dateText}>{formatDate(endDate)}</Text>
            </TouchableOpacity>
          </View>
          {showDatePicker && (
            <DateTimePicker
              value={showDatePicker === 'start' ? startDate : endDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(null);
                if (selectedDate) {
                  if (showDatePicker === 'start') setStartDate(selectedDate);
                  else setEndDate(selectedDate);
                }
              }}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>수업 요일 및 시간</Text>
          <View style={styles.daysContainer}>
            {DAYS.map((day, index) => {
              const isSelected = selectedDays.includes(day.id);
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.dayButton, isSelected && { backgroundColor: Colors.primary }]}
                  onPress={() => toggleDay(day.id)}
                >
                  <Text style={[styles.dayText, isSelected && { color: '#FFF' }]}>{day.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedDays.map(dayId => (
            <View key={dayId} style={styles.timeSettingsContainer}>
              <Text style={styles.timeDayLabel}>{DAYS.find(d => d.id === dayId)?.label}요일</Text>
              <View style={styles.timeSelectContainer}>
                <TouchableOpacity style={styles.timeButton} onPress={() => setShowTimePicker({day: dayId, type: 'start'})}>
                  <Text style={styles.timeText}>{formatTime(dayTimes[dayId].start)}</Text>
                </TouchableOpacity>
                <Text style={styles.dateDivider}>~</Text>
                <TouchableOpacity style={styles.timeButton} onPress={() => setShowTimePicker({day: dayId, type: 'end'})}>
                  <Text style={styles.timeText}>{formatTime(dayTimes[dayId].end)}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {showTimePicker && (
            <DateTimePicker
              value={dayTimes[showTimePicker.day][showTimePicker.type]}
              mode="time"
              display="default"
              onChange={(event, selectedDate) => {
                const currentPicker = showTimePicker;
                setShowTimePicker(null);
                if (selectedDate && currentPicker) {
                  setDayTimes({
                    ...dayTimes,
                    [currentPicker.day]: {
                      ...dayTimes[currentPicker.day],
                      [currentPicker.type]: selectedDate
                    }
                  });
                }
              }}
            />
          )}
        </View>

        <TouchableOpacity 
          style={[styles.createButton, loading && { backgroundColor: Colors.grayscale[500] }]} 
          onPress={handleCreate}
          disabled={loading}
        >
          <Text style={styles.createButtonText}>{loading ? '생성 중...' : '수업 생성하기'}</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={iconModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>아이콘 및 색상 선택</Text>
            
            <Text style={styles.modalLabel}>색상</Text>
            <View style={styles.colorContainer}>
              {Object.values(Colors.categories).map((color, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.colorCircle, { backgroundColor: color }, categoryColor === color && styles.colorSelected]} 
                  onPress={() => setCategoryColor(color)}
                />
              ))}
            </View>

            <Text style={styles.modalLabel}>아이콘</Text>
            <View style={styles.iconSelectContainer}>
              {ICONS.map((ic, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.iconOption, icon === ic && { borderColor: Colors.primary, borderWidth: 2 }]} 
                  onPress={() => setIcon(ic)}
                >
                  <Ionicons name={ic as any} size={28} color={categoryColor} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setIconModalVisible(false)}>
              <Text style={styles.modalCloseText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: Colors.grayscale[100] },
  title: { fontFamily: 'Paybooc-Bold', fontSize: 18, color: Colors.grayscale[900] },
  backButton: { padding: 8 },
  backText: { fontFamily: 'Paybooc-Bold', fontSize: 24, color: Colors.grayscale[900] },
  saveText: { fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.primary, padding: 8 },
  content: { flex: 1, padding: 24 },
  section: { marginBottom: 32 },
  label: { fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.grayscale[900], marginBottom: 12 },
  nameIconContainer: { flexDirection: 'row', alignItems: 'center' },
  iconPreview: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  editBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: Colors.grayscale[700], borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.background },
  input: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 16, fontSize: 16, fontFamily: 'Paybooc-Bold', borderWidth: 1, borderColor: Colors.grayscale[300] },
  dateContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateButton: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.grayscale[300] },
  dateText: { fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.grayscale[900] },
  dateDivider: { marginHorizontal: 16, fontFamily: 'Paybooc-Bold', fontSize: 18, color: Colors.grayscale[500] },
  daysContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  dayButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.grayscale[300], justifyContent: 'center', alignItems: 'center' },
  dayText: { fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.grayscale[700] },
  timeSettingsContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: '#FFF', padding: 12, borderRadius: 12 },
  timeDayLabel: { fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.grayscale[900], width: 60 },
  timeSelectContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeButton: { flex: 1, backgroundColor: Colors.grayscale[100], borderRadius: 8, padding: 12, alignItems: 'center' },
  timeText: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[900] },
  createButton: { backgroundColor: Colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  createButtonText: { fontFamily: 'Paybooc-Bold', fontSize: 18, color: '#FFF' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#FFF', borderRadius: 24, padding: 24 },
  modalTitle: { fontFamily: 'Paybooc-Bold', fontSize: 20, color: Colors.grayscale[900], marginBottom: 24, textAlign: 'center' },
  modalLabel: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[700], marginBottom: 12 },
  colorContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  colorCircle: { width: 40, height: 40, borderRadius: 20 },
  colorSelected: { borderWidth: 3, borderColor: Colors.grayscale[900] },
  iconSelectContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  iconOption: { width: '30%', aspectRatio: 1, backgroundColor: Colors.grayscale[100], borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  modalCloseBtn: { backgroundColor: Colors.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  modalCloseText: { fontFamily: 'Paybooc-Bold', fontSize: 16, color: '#FFF' }
});