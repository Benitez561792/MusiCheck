import AsyncStorage from "@react-native-async-storage/async-storage"
import { getApp, getApps, initializeApp } from "firebase/app"
import { Auth, getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

// Projeto Firebase do MusiCheck (musicheck-fiap). Os valores vêm do .env (modelo em .env.example).
// A configuração web do Firebase não é secreta: quem protege os dados são as regras do Firestore.
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "musicheck-fiap.firebaseapp.com",
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "musicheck-fiap",
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "musicheck-fiap.firebasestorage.app",
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

// A persistência no AsyncStorage mantém o usuário logado ao reabrir o app
function createAuth(): Auth {
    try {
        return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
    } catch {
        // Fast Refresh: o Auth já foi inicializado
        return getAuth(app)
    }
}

export const auth = createAuth()

export const firestore = getFirestore(app)
