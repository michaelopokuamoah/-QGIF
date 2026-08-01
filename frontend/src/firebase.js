// QGIF Firebase Configuration
// Project: qgif-database
// Used for: CNN image tile storage and annotation

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDl0n3MOxcOYliIJVHfA55w9XSY_L1x9ms",
  authDomain: "qgif-database.firebaseapp.com",
  projectId: "qgif-database",
  storageBucket: "qgif-database.firebasestorage.app",
  messagingSenderId: "28821373460",
  appId: "1:28821373460:web:0bcb58c577044064665d01",
  measurementId: "G-LXNB6Y868P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── FIRESTORE COLLECTIONS ──────────────────────────────────
// cnn_tiles — stores labeled image tile data for CNN training
// annotations — stores spectral index annotations (existing)

// Save a new CNN tile annotation
export async function saveCNNTile(tileData) {
  try {
    const docRef = await addDoc(collection(db, "cnn_tiles"), {
      ...tileData,
      created_at: new Date().toISOString(),
    });
    return { success: true, id: docRef.id };
  } catch (e) {
    console.error("Firebase save error:", e);
    return { success: false, error: e.message };
  }
}

// Get all CNN tiles
export async function getCNNTiles(limitCount = 1000) {
  try {
    const q = query(
      collection(db, "cnn_tiles"),
      orderBy("created_at", "desc"),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error("Firebase fetch error:", e);
    return [];
  }
}

// Get tile count by label
export async function getTileStats() {
  try {
    const snapshot = await getDocs(collection(db, "cnn_tiles"));
    const stats = { total: 0, mining: 0, not_mining: 0 };
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      stats.total++;
      if (data.label === "mining") stats.mining++;
      else stats.not_mining++;
    });
    return stats;
  } catch (e) {
    console.error("Firebase stats error:", e);
    return { total: 0, mining: 0, not_mining: 0 };
  }
}

export { db };