import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDCafsrtsHRc8f_uCo1NBz4fpkdEQAPrPU",
  authDomain: "echo-485a9.firebaseapp.com",
  projectId: "echo-485a9",
  storageBucket: "echo-485a9.firebasestorage.app",
  messagingSenderId: "921605423315",
  appId: "1:921605423315:web:159210ab3366d280c75426",
  measurementId: "G-YVHX9QRBW7",
};

// Init Firebase services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ✅ Auth functions
export const signupUser = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);
    await signOut(auth);
    return { success: true, message: 'Verification email sent. Please verify before logging in.' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    if (!user.emailVerified) {
      await signOut(auth);
      return { success: false, message: 'Please verify your email before logging in.' };
    }
    return { success: true, user };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const monitorAuthState = (callback) => {
  onAuthStateChanged(auth, (user) => {
    callback(user);
  });
};

export const uploadProfilePicture = async (userId, imageUri) => {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const imageRef = ref(storage, `profile_images/${userId}.jpg`);
      await uploadBytes(imageRef, blob);
      const downloadURL = await getDownloadURL(imageRef);
      return downloadURL;
    } catch (error) {
      console.error("❌ Image upload failed:", error);
      return null;
    }
  };
  

export const saveUserProfile = async (userId, username, imageUrl) => {
  try {
    await setDoc(doc(db, "users", userId), {
      username,
      imageUrl,
    });
  } catch (error) {
    console.error("Failed to save user profile:", error);
  }
};

// ✅ Fetch user profile data
export const getUserProfile = async (userId) => {
  try {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};

// Export services
export {
  auth,
  db,
  storage,
};

export default app;
