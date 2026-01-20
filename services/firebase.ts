
import * as firebaseApp from "firebase/app";
import * as firebaseAuth from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Workaround for potential type definition mismatch (v8 types vs v9 runtime)
const { initializeApp } = firebaseApp as any;
const { getAuth } = firebaseAuth as any;

// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyB_-Cx0a2s-4PVHdyTaHc7zeI5flFHtOkg",
  authDomain: "rabelotour-190bd.firebaseapp.com",
  projectId: "rabelotour-190bd",
  storageBucket: "rabelotour-190bd.firebasestorage.app",
  messagingSenderId: "6395348284",
  appId: "1:6395348284:web:0c14f48454df5b5b8fca39",
  measurementId: "G-TXM4ERGKPQ"
};

// Verifica se o projeto está configurado (não é mais o placeholder)
export const isConfigured = firebaseConfig.projectId !== "seu-projeto";

// Initialize Firebase (Modular SDK)
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
