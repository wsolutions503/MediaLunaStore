import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCuXaLGLXMkzMJ97HdC1mnqXjx0lsjF_9s",
  authDomain: "medialunastore.firebaseapp.com",
  projectId: "medialunastore",
  storageBucket: "medialunastore.firebasestorage.app",
  messagingSenderId: "105888169662",
  appId: "1:105888169662:web:da563c6a584916035ee8ef",
  measurementId: "G-PQGZW2DYE9"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
