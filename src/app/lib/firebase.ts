import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// isi konfigurasi sesuai dengan konfigurasi firebase kalian
const firebaseConfig = {
  apiKey: 'AIzaSyD1ghqKfecshWORn-Ap8YZ8k49HQduQSzE',
  authDomain: 'atrilaptra.firebaseapp.com',
  projectId: 'atrilaptra',
  storageBucket: 'atrilaptra.firebasestorage.app',
  messagingSenderId: '161592312636',
  appId: '1:161592312636:web:42656a0365ecf5506cd439',
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
