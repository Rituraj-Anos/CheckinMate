import { NextResponse } from "next/server";
import { db } from "../../../lib/firebase";
import { collection, addDoc } from "firebase/firestore";

// Proxy prevention logic: track recent scans
const recentScans: Record<string, number> = {}; // uid: timestamp
const DUPLICATE_WINDOW = 5000; // 5 seconds in ms

// Helper: get late flag (check-ins past 9:45 AM)
const CLASS_START_HOUR = 9;
const CLASS_START_MINUTE = 45;
const isLateCheckin = (timestamp: number, action: string) => {
  if (action !== "check-in") return false;
  const date = new Date(timestamp);
  return (
    date.getHours() > CLASS_START_HOUR ||
    (date.getHours() === CLASS_START_HOUR &&
      date.getMinutes() > CLASS_START_MINUTE)
  );
};

export async function POST(request: Request) {
  try {
    const { uid, action } = await request.json();
    const now = Date.now();

    // Proxy prevention: flag duplicate within window
    let suspicious = false;
    if (recentScans[uid] && now - recentScans[uid] < DUPLICATE_WINDOW) {
      suspicious = true;
    }
    recentScans[uid] = now;
    const late = isLateCheckin(now, action);

    // Persist scan to Firestore
    if (db) {
      try {
        await addDoc(collection(db, "scans"), {
          uid,
          action,
          timestamp: now,
          suspicious,
          late,
        });
      } catch (err) {
        console.warn("Error saving scan to Firestore:", err);
      }
    }

    return NextResponse.json({
      ok: true,
      suspicious,
      late,
      message: suspicious
        ? `Duplicate scan for ${uid} detected! Flagged as suspicious.`
        : `Scan for ${uid} accepted.`,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 400 });
  }
}
