import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

// Firebase configuration using credentials
const firebaseConfig = {
  apiKey: "AIzaSyB8IBtZsXr-nFFMV308puni56aIt9GdfPg",
  authDomain: "f1app-241c9.firebaseapp.com",
  projectId: "f1app-241c9",
  storageBucket: "f1app-241c9.appspot.com",
};

// Initialize Firebase App securely in serverless environment
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export default async function handler(req: any, res: any) {
  // Set CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { session_key } = req.query;
  if (!session_key) {
    return res.status(400).json({ error: "Missing session_key parameter" });
  }

  const sessionKey = parseInt(session_key as string, 10);
  if (isNaN(sessionKey)) {
    return res.status(400).json({ error: "Invalid session_key parameter" });
  }

  console.log(`[Sync Webhook] Syncing radio tapes for session ${sessionKey}...`);

  try {
    // Fetch all team radio clips for the session from OpenF1
    const openF1Url = `https://api.openf1.org/v1/team_radio?session_key=${sessionKey}`;
    const response = await fetch(openF1Url);
    
    if (!response.ok) {
      throw new Error(`OpenF1 API returned HTTP ${response.status}`);
    }

    const data = (await response.json()) as any[];
    console.log(`[Sync Webhook] Fetched ${data.length} total clips for session ${sessionKey}.`);

    if (!data || data.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No radio clips found for this session on OpenF1.",
        syncedCount: 0
      });
    }

    // Group clips by driver number
    const clipsByDriver: Record<number, Array<{ date: string; recording_url: string }>> = {};
    data.forEach((clip) => {
      const driverNum = clip.driver_number;
      if (!driverNum) return;

      if (!clipsByDriver[driverNum]) {
        clipsByDriver[driverNum] = [];
      }

      clipsByDriver[driverNum].push({
        date: clip.date,
        recording_url: clip.recording_url,
      });
    });

    // Write groups in parallel to Firestore
    const syncPromises = Object.entries(clipsByDriver).map(async ([driverNumStr, clips]) => {
      const driverNumber = parseInt(driverNumStr, 10);
      const docRef = doc(db, "radio", `${sessionKey}_${driverNumber}`);

      // Sort chronologically
      clips.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      await setDoc(docRef, {
        clips,
        syncedAt: serverTimestamp(),
        count: clips.length,
        sessionKey,
        driverNumber,
      });
    });

    await Promise.all(syncPromises);
    console.log(`[Sync Webhook] Successfully synced radio data for ${Object.keys(clipsByDriver).length} drivers.`);

    return res.status(200).json({
      success: true,
      message: "Sync completed successfully.",
      syncedDrivers: Object.keys(clipsByDriver).map(Number),
      totalClips: data.length,
    });

  } catch (error: any) {
    console.error(`[Sync Webhook] Sync error:`, error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal Server Error",
    });
  }
}
