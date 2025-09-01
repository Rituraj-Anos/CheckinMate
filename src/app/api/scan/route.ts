import { NextResponse } from "next/server";

// In-memory list of SSE controllers
const clients: {
  id: number;
  controller: ReadableStreamDefaultController;
}[] = [];
let clientId = 0;

// Proxy prevention logic: track recent scans
const recentScans: Record<string, number> = {}; // uid: timestamp
const DUPLICATE_WINDOW = 5000; // 5 seconds in ms

export async function GET() {
  const id = clientId++;
  const stream = new ReadableStream({
    start(controller) {
      clients.push({ id, controller });
    },
    cancel() {
      const idx = clients.findIndex((c) => c.id === id);
      if (idx !== -1) clients.splice(idx, 1);
    },
  });
  return new NextResponse(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}

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

    const payload = JSON.stringify({ uid, action, timestamp: now, suspicious });
    // Broadcast to all connected clients
    clients.forEach(({ controller }) => {
      controller.enqueue(`data: ${payload}\n\n`);
    });
    return NextResponse.json({
      ok: true,
      suspicious,
      message: suspicious
        ? `Duplicate scan for ${uid} detected! Flagged as suspicious.`
        : `Scan for ${uid} accepted.`,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 400 });
  }
}
