import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId,
)

export const firebaseApp: FirebaseApp = isFirebaseConfigured
  ? initializeApp(firebaseConfig)
  : (null as unknown as FirebaseApp)

export const auth: Auth = isFirebaseConfigured
  ? getAuth(firebaseApp)
  : (null as unknown as Auth)

export const db: Firestore = isFirebaseConfigured
  ? getFirestore(firebaseApp)
  : (null as unknown as Firestore)
