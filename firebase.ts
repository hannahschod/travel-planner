import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB9y-xeVO8risL0phw0uEvgxpxXXvzLg6g",
  authDomain: "travel-planner-883dd.firebaseapp.com",
  projectId: "travel-planner-883dd",
  storageBucket: "travel-planner-883dd.firebasestorage.app",
  messagingSenderId: "367643891697",
  appId: "1:367643891697:web:bc374b96d16919b0059650"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);