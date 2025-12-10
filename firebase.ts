import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import { getFirestore } from "firebase/firestore";

// User provided configuration
const firebaseConfig = {
  apiKey: "AIzaSyAzrQR2C_0odr6zWroCZFzm4tobke_nGFA",
  authDomain: "notulen-73701.firebaseapp.com",
  projectId: "notulen-73701",
  storageBucket: "notulen-73701.firebasestorage.app",
  messagingSenderId: "439747860142",
  appId: "1:439747860142:web:206f400597467d6a9e7f3f",
  measurementId: "G-00M63J8WZM"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = firebase.auth();

export { db, auth };