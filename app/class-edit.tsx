import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ScrollView, Modal, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuthStore } from '../store/authStore';

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const DAYS = [
  { id: 'mon', label: 'M' },
  { id: 'tue', label: 'T' },
  { id: 'wed', label: 'W' },
  { id: 'thu', label: 'T' },
  { id: 'fri', label: 'F' },
  { id: 'sat', label: 'S' },
  { id: 'sun', label: 'S' },
];

const ICONS = [
  'calculator', 'book', 'document-text', 'flask', 'color-palette', 
  'musical-notes', 'earth', 'pencil', 'star', 'barbell', 
  'bulb', 'code-slash', 'construct', 'brush', 'language'
];

export default function ClassEdit() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  
  const [className, setClassName] = useState('');
  const [icon, setIcon] = useState('calculator');
  const [categoryColor, setCategoryColor] = useState(Colors.categories.purple);
  const [iconModalVisible, setIconModalVisible] = useState(false);
  
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(new Date().setMonth(new Date().getMonth() + 1)));
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [dayTimes, setDayTimes] = useState<Record<string, { start: Date, end: Date }>>({});
  const [showTimePicker, setShowTimePicker] = useState<{day: string, type: 'start' | 'end'} | null>(null);
  const [tempTime, setTempTime] = useState<Date>(new Date());
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchClass = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'Classes', id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setClassName(data.name || '');
          setIcon(data.icon || 'calculator');
          setCategoryColor(data.categoryColor || Colors.categories.purple);
          if (data.startDate) setStartDate(new Date(data.startDate));
          if (data.endDate) setEndDate(new Date(data.endDate));
          
          if (data.schedules) {
            const d = data.schedules.map((s: any) => s.day);
            setSelectedDays(d);
            const dt: Record<string, { start: Date, end: Date }> = {};
            data.schedules.forEach((s: any) => {
              const parseTime = (timeStr: string) => {
                 const cleanTimeStr = timeStr.replace('오전', 'AM').replace('오후', 'PM');
                 const [time, period] = cleanTimeStr.split(' ');
                 const [h, m] = time.split(':');
                 let hours = parseInt(h, 10);
                 if (period === 'PM' && hours < 12) hours += 12;
                 if (period === 'AM' && hours === 12) hours = 0;
                 const d = new Date();
                 d.setHours(hours, parseInt(m, 10), 0, 0);
                 return d;
              };
              dt[s.day] = {
                start: s.startTime ? parseTime(s.startTime) : new Date(),
                end: s.endTime ? parseTime(s.endTime) : new Date()
              };
            });
            setDayTimes(dt);
          }
        }
      } catch (error) {
        console.error("Error fetching class to edit:", error);
      }
    };
    fetchClass();
  }, [id]);

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

  const formatTimeEn = (date: Date) => {
    return format(date, 'h:mm a');
  };
  
  const formatDateStr = (date: Date) => {
    return `${date.getFullYear()}.${(date.getMonth()+1).toString().padStart(2,'0')}.${date.getDate().toString().padStart(2,'0')}`;
  };

  const openDatePicker = (type: 'start' | 'end') => {
    setTempDate(type === 'start' ? startDate : endDate);
    setShowDatePicker(type);
  };
  
  const handleDateConfirm = () => {
    if (showDatePicker === 'start') setStartDate(tempDate);
    if (showDatePicker === 'end') setEndDate(tempDate);
    setShowDatePicker(null);
  };

  const openTimePicker = (day: string, type: 'start' | 'end') => {
    setTempTime(dayTimes[day][type]);
    setShowTimePicker({day, type});
  };

  const handleTimeConfirm = () => {
    if (showTimePicker) {
       setDayTimes({
         ...dayTimes,
         [showTimePicker.day]: {
           ...dayTimes[showTimePicker.day],
           [showTimePicker.type]: tempTime
         }
       });
       setShowTimePicker(null);
    }
  };

  const handleUpdate = async () => {
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
      const schedules = selectedDays.map(dayId => ({
        day: dayId,
        startTime: formatTimeEn(dayTimes[dayId].start),
        endTime: formatTimeEn(dayTimes[dayId].end),
      }));

      await updateDoc(doc(db, 'Classes', id as string), {
        name: className,
        icon: icon,
        categoryColor: categoryColor,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        schedules: schedules,
      });

      Alert.alert('성공', '수업이 성공적으로 수정되었습니다.', [
        { text: '확인', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      console.error(e);
      Alert.alert('오류', '수업 수정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.grayscale[900]} />
        </TouchableOpacity>
        <Text style={styles.title}>수업 수정</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.label}>수업 이름</Text>
          <View style={styles.nameIconContainer}>
            <TouchableOpacity 
              style={[styles.iconPreview, { backgroundColor: categoryColor + '33' }]}
              onPress={() => setIconModalVisible(true)}
            >
              <Ionicons name={icon as any} size={28} color={categoryColor} />
            </TouchableOpacity>
            <TextInput
              style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' } as any]}
              placeholder="수업 이름을 입력하세요"
              value={className}
              onChangeText={setClassName}
              underlineColorAndroid="transparent"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>수업 기간</Text>
          <View style={styles.periodContainer}>
            <TouchableOpacity style={styles.periodCard} onPress={() => openDatePicker('start')}>
              <View style={[styles.periodIconWrapper, { backgroundColor: Colors.primary + '1A' }]}>
                <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.periodTextWrapper}>
                <Text style={styles.periodSubtitle}>시작일</Text>
                <Text style={styles.periodValue}>{formatDateStr(startDate)}</Text>
              </View>
              <Ionicons name="chevron-down" size={20} color={Colors.grayscale[400]} />
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.periodCard, { marginTop: 12 }]} onPress={() => openDatePicker('end')}>
              <View style={[styles.periodIconWrapper, { backgroundColor: Colors.primary + '1A' }]}>
                <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.periodTextWrapper}>
                <Text style={styles.periodSubtitle}>종료일</Text>
                <Text style={styles.periodValue}>{formatDateStr(endDate)}</Text>
              </View>
              <Ionicons name="chevron-down" size={20} color={Colors.grayscale[400]} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>수업 요일</Text>
          <View style={styles.daysBoxContainer}>
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
          </View>
        </View>

        {selectedDays.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>수업 시간</Text>
            {selectedDays.map(dayId => {
              const dayObj = DAYS.find(d => d.id === dayId);
              return (
                <View key={dayId} style={styles.timeSettingsCard}>
                  <View style={[styles.dayButton, { backgroundColor: Colors.primary, marginRight: 16 }]}>
                    <Text style={[styles.dayText, { color: '#FFF' }]}>{dayObj?.label}</Text>
                  </View>
                  <View style={styles.timeSelectContainer}>
                    <TouchableOpacity style={styles.timeButton} onPress={() => openTimePicker(dayId, 'start')}>
                      <Text style={styles.timeText}>{formatTimeEn(dayTimes[dayId].start)}</Text>
                    </TouchableOpacity>
                    <Text style={styles.dateDivider}>~</Text>
                    <TouchableOpacity style={styles.timeButton} onPress={() => openTimePicker(dayId, 'end')}>
                      <Text style={styles.timeText}>{formatTimeEn(dayTimes[dayId].end)}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity 
          style={[styles.createButton, loading && { backgroundColor: Colors.grayscale[500] }]} 
          onPress={handleUpdate}
          disabled={loading}
        >
          <Text style={styles.createButtonText}>{loading ? '수정 중...' : '수정하기'}</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* DatePicker Modal for iOS */}
      {Platform.OS === 'ios' ? (
        <Modal visible={!!showDatePicker} transparent animationType="slide">
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerModalHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(null)}>
                  <Text style={styles.pickerCancelText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDateConfirm}>
                  <Text style={styles.pickerConfirmText}>완료</Text>
                </TouchableOpacity>
              </View>
              {showDatePicker && (
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={(e, d) => d && setTempDate(d)}
                  style={styles.datePicker}
                />
              )}
            </View>
          </View>
        </Modal>
      ) : (
        showDatePicker && (
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
        )
      )}

      {/* TimePicker Modal for iOS */}
      {Platform.OS === 'ios' ? (
        <Modal visible={!!showTimePicker} transparent animationType="slide">
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerModalHeader}>
                <TouchableOpacity onPress={() => setShowTimePicker(null)}>
                  <Text style={styles.pickerCancelText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleTimeConfirm}>
                  <Text style={styles.pickerConfirmText}>완료</Text>
                </TouchableOpacity>
              </View>
              {showTimePicker && (
                <DateTimePicker
                  value={tempTime}
                  mode="time"
                  display="spinner"
                  onChange={(e, d) => d && setTempTime(d)}
                  style={styles.datePicker}
                />
              )}
            </View>
          </View>
        </Modal>
      ) : (
        showTimePicker && (
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
        )
      )}

      {/* Icon & Color Bottom Sheet Modal */}
      <Modal visible={iconModalVisible} transparent animationType="slide">
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContent}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>아이콘 수정</Text>
              <TouchableOpacity onPress={() => setIconModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={Colors.grayscale[900]} />
              </TouchableOpacity>
            </View>

            <View style={styles.iconPreviewContainer}>
              <View style={[styles.largeIconPreview, { backgroundColor: categoryColor + '33' }]}>
                <Ionicons name={icon as any} size={40} color={categoryColor} />
              </View>
            </View>
            
            <Text style={styles.modalSectionLabel}>컬러</Text>
            <View style={styles.colorContainer}>
              {Object.values(Colors.categories).map((color, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={[
                    styles.colorCircle, 
                    { backgroundColor: color }, 
                    categoryColor === color && styles.colorSelected
                  ]} 
                  onPress={() => setCategoryColor(color)}
                />
              ))}
            </View>

            <Text style={styles.modalSectionLabel}>아이콘</Text>
            <View style={styles.iconSelectGrid}>
              {ICONS.map((ic, idx) => {
                const isSelected = icon === ic;
                return (
                  <TouchableOpacity 
                    key={idx} 
                    style={[
                      styles.iconOption, 
                      { backgroundColor: isSelected ? categoryColor : Colors.grayscale[100] }
                    ]} 
                    onPress={() => setIcon(ic)}
                  >
                    <Ionicons 
                      name={ic as any} 
                      size={24} 
                      color={isSelected ? '#FFF' : Colors.grayscale[500]} 
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.applyButton} onPress={() => setIconModalVisible(false)}>
              <Text style={styles.applyButtonText}>적용하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, backgroundColor: '#FFFFFF' },
  title: { fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.grayscale[900] },
  backButton: { padding: 8 },
  saveText: { fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.primary, padding: 8 },
  content: { flex: 1, padding: 24, backgroundColor: Colors.grayscale[100] },
  section: { marginBottom: 32 },
  label: { fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.grayscale[900], marginBottom: 12 },
  
  nameIconContainer: { flexDirection: 'row', alignItems: 'center' },
  iconPreview: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  input: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 16, fontSize: 16, fontFamily: 'Paybooc-Bold', borderWidth: 0 },
  
  periodContainer: {},
  periodCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' },
  periodIconWrapper: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  periodTextWrapper: { flex: 1 },
  periodSubtitle: { fontFamily: 'Paybooc-Bold', fontSize: 12, color: Colors.grayscale[500], marginBottom: 4 },
  periodValue: { fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.grayscale[900] },
  
  daysBoxContainer: { backgroundColor: '#FFF', borderRadius: 16, padding: 16 },
  daysContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  dayButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary + '1A', justifyContent: 'center', alignItems: 'center' },
  dayText: { fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.primary },
  
  timeSettingsCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  timeSelectContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeButton: { flex: 1, backgroundColor: Colors.grayscale[100], borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  timeText: { fontFamily: 'Paybooc-Bold', fontSize: 14, color: Colors.grayscale[900] },
  dateDivider: { marginHorizontal: 12, fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.grayscale[400] },
  
  createButton: { backgroundColor: Colors.primary, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  createButtonText: { fontFamily: 'Paybooc-Bold', fontSize: 18, color: '#FFF' },
  
  pickerModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  pickerModalContent: { backgroundColor: '#FFF', paddingBottom: 32, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  pickerModalHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: Colors.grayscale[100] },
  pickerCancelText: { fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.grayscale[500] },
  pickerConfirmText: { fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.primary },
  datePicker: { alignSelf: 'center', width: '100%', height: 200 },
  
  bottomSheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  bottomSheetContent: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, height: '85%' },
  bottomSheetHeader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
  bottomSheetTitle: { fontFamily: 'Paybooc-Bold', fontSize: 18, color: Colors.grayscale[900] },
  closeButton: { position: 'absolute', right: 0, backgroundColor: Colors.grayscale[100], borderRadius: 20, padding: 4 },
  
  iconPreviewContainer: { alignItems: 'center', marginBottom: 32 },
  largeIconPreview: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  
  modalSectionLabel: { fontFamily: 'Paybooc-Bold', fontSize: 16, color: Colors.grayscale[900], marginBottom: 16 },
  colorContainer: { flexDirection: 'row', gap: 12, marginBottom: 32, flexWrap: 'wrap' },
  colorCircle: { width: 48, height: 48, borderRadius: 24 },
  colorSelected: { borderWidth: 3, borderColor: Colors.grayscale[300] },
  
  iconSelectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 32 },
  iconOption: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  
  applyButton: { backgroundColor: Colors.primary, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 'auto', marginBottom: 32 },
  applyButtonText: { fontFamily: 'Paybooc-Bold', fontSize: 18, color: '#FFF' }
});