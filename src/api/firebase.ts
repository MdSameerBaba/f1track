import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// Firebase configuration using credentials provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyB8IBtZsXr-nFFMV308puni56aIt9GdfPg",
  authDomain: "f1app-241c9.firebaseapp.com",
  projectId: "f1app-241c9",
  storageBucket: "f1app-241c9.appspot.com",
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore
export const db = getFirestore(app);

export interface RadioClip {
  date: string;
  recording_url: string;
}

export interface FirestoreRadioDoc {
  clips: RadioClip[];
  syncedAt: any;
  count: number;
  sessionKey: number;
  driverNumber: number;
}

/**
 * Fetch team radio clips for a specific session and driver from Firestore.
 * Returns the clips array, or null if the document does not exist.
 */
export async function getRadioFromFirestore(
  sessionKey: number,
  driverNumber: number
): Promise<RadioClip[] | null> {
  try {
    const docRef = doc(db, "radio", `${sessionKey}_${driverNumber}`);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as FirestoreRadioDoc;
      return data.clips || [];
    }
  } catch (error) {
    console.error("Error reading from Firestore:", error);
  }
  return null;
}

/**
 * Save team radio clips for a specific session and driver to Firestore.
 */
export async function saveRadioToFirestore(
  sessionKey: number,
  driverNumber: number,
  clips: RadioClip[]
): Promise<void> {
  try {
    const docRef = doc(db, "radio", `${sessionKey}_${driverNumber}`);
    await setDoc(docRef, {
      clips,
      syncedAt: serverTimestamp(),
      count: clips.length,
      sessionKey,
      driverNumber,
    });
  } catch (error) {
    console.error("Error writing to Firestore:", error);
  }
}
