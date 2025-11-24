// js/firebase.js - Configuración Firebase

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  increment
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyByhD4vM7DCjjIOBoaUuLH_wRh93DcRdkw",
  authDomain: "inventario-b4431.firebaseapp.com",
  projectId: "inventario-b4431",
  storageBucket: "inventario-b4431.firebasestorage.app",
  messagingSenderId: "229641140897",
  appId: "1:229641140897:web:c1ac156045b0edbf110ee0",
  measurementId: "G-RG2Y7DXCEC"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Exponer Firebase al global para scripts no-módulo
window.FB = {
  app,
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  increment
};

console.log("✅ Firebase inicializado correctamente");
