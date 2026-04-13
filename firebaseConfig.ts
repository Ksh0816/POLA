import { initializeApp, getApps, getApp } from "firebase/app";
// @ts-ignore
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Replace with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyC-kcThTaryuWqLo8HUdRjcHWz8H0ioVGg",
  authDomain: "pola-2d358.firebaseapp.com",
  projectId: "pola-2d358",
  storageBucket: "pola-2d358.firebasestorage.app",
  messagingSenderId: "186238776116",
  appId: "1:186238776116:web:4513684213b7dbfc05ab61"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with AsyncStorage
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
