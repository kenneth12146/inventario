// js/firebase.js (module)
// Exposes window.FB with db + Firestore helpers using user's firebaseConfig
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyByhD4vM7DCjjIOBoaUuLH_wRh93DcRdkw",
  authDomain: "inventario-b4431.firebaseapp.com",
  projectId: "inventario-b4431",
  storageBucket: "inventario-b4431.firebasestorage.app",
  messagingSenderId: "229641140897",
  appId: "1:229641140897:web:c1ac156045b0edbf110ee0",
  measurementId: "G-RG2Y7DXCEC"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// expose to non-module scripts
window.FB = { db, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, query, where };
