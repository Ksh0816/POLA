import { Tabs } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.grayscale[500],
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          borderTopColor: Colors.grayscale[300],
          height: 85,
          paddingBottom: 36,
          paddingTop: 8,
          paddingHorizontal: 24,
        },
        tabBarLabelStyle: {
          fontFamily: 'Paybooc-Bold',
          fontSize: 12,
          paddingTop: 8, 
        },
        tabBarItemStyle: {
          paddingVertical: 0,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: '홈',
          tabBarIcon: ({ focused, color, size }) => (
            <View style={{
              backgroundColor: focused ? Colors.lightBlue : 'transparent',
              width: 40,
              height: 40,
              borderRadius: 16,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 4,
            }}>
              <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: '일정',
          tabBarIcon: ({ focused, color, size }) => (
            <View style={{
              backgroundColor: focused ? Colors.lightBlue : 'transparent',
              width: 40,
              height: 40,
              borderRadius: 16,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 4,
            }}>
              <Ionicons name={focused ? "calendar" : "calendar-outline"} size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="homework"
        options={{
          title: '과제',
          tabBarIcon: ({ focused, color, size }) => (
            <View style={{
              backgroundColor: focused ? Colors.lightBlue : 'transparent',
              width: 40,
              height: 40,
              borderRadius: 16,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 4,
            }}>
              <Ionicons name={focused ? "document-text" : "document-text-outline"} size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="question"
        options={{
          title: '질문',
          tabBarIcon: ({ focused, color, size }) => (
            <View style={{
              backgroundColor: focused ? Colors.lightBlue : 'transparent',
              width: 40,
              height: 40,
              borderRadius: 16,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 4,
            }}>
              <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={24} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
