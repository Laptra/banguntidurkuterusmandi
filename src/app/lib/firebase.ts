import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// isi konfigurasi sesuai dengan konfigurasi firebase kalian
const firebaseConfig = {
  apiKey: "AIzaSyB5mdtMbEFVHc6nLpGsc-q6OJ8EQaD38oE",
  authDomain: "todolist-e8873.firebaseapp.com",
  projectId: "todolist-e8873",
  storageBucket: "todolist-e8873.firebasestorage.app",
  messagingSenderId: "342242132804",
  appId: "1:342242132804:web:1997093d09ccb4cbaa8d11"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
