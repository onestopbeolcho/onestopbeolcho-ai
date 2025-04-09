import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, Timestamp, addDoc } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import { getStorage, ref } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBWADxFFsfyJGRqI09AJx1pDQhrWv_pQzo",
  authDomain: "onestop-88b05.firebaseapp.com",
  projectId: "onestop-88b05",
  storageBucket: "onestop-88b05.firebasestorage.app",
  messagingSenderId: "189609926021",
  appId: "1:189609926021:web:19a330a166ff2ba58378ec",
  measurementId: "G-FKZLEVZ8M8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage, ref, firebaseConfig, setPersistence, browserLocalPersistence, collection, query, where, getDocs, Timestamp, addDoc };