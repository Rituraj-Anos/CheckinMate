"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MonitorDot, IdCard, Clock, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

// Mock data for students (would normally come from Firebase)
const mockStudents = [
  { id: "STU001", name: "Alice Johnson" },
  { id: "STU002", name: "Bob Smith" },
  { id: "STU003", name: "Carol Williams" },
  { id: "STU004", name: "David Brown" },
  { id: "STU005", name: "Emma Davis" },
];

const CLASS_START_HOUR = 9;
const CLASS_START_MINUTE = 45;

interface LogEntry {
  id: string;
  timestamp: Date;
  studentId: string;
  studentName: string;
  action: "check-in" | "check-out";
  suspicious?: boolean;
  late?: boolean; // <-- new for late highlight
}

const LoggerSection = () => {
  const [rfidInput, setRfidInput] = useState("");
  const [lastScannedId, setLastScannedId] = useState("");
  const [detectorStatus, setDetectorStatus] = useState<"active" | "idle">(
    "idle"
  );
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState<Date | null>(null);

  // Helper: check for late arrival (after 9:45 AM)
  const isLate = (timestamp: Date, action: "check-in" | "check-out") => {
    if (action !== "check-in") return false; // Only check-ins count
    const classStart = new Date(timestamp);
    classStart.setHours(CLASS_START_HOUR, CLASS_START_MINUTE, 0, 0);
    // If timestamp is after today at class start time, and on same date
    return (
      timestamp.getHours() > CLASS_START_HOUR ||
      (timestamp.getHours() === CLASS_START_HOUR &&
        timestamp.getMinutes() > CLASS_START_MINUTE)
    );
  };

  // Live scan event stream from API
  useEffect(() => {
    const evtSource = new EventSource("/api/scan");
    evtSource.onmessage = (e) => {
      try {
        const { uid, action, timestamp, suspicious } = JSON.parse(e.data);
        const student = mockStudents.find((s) => s.id === uid) || {
          name: "Unknown Student",
        };
        const logTime = new Date(timestamp);
        const newLog: LogEntry = {
          id: String(timestamp),
          timestamp: logTime,
          studentId: uid,
          studentName: student.name,
          action,
          suspicious,
          late: isLate(logTime, action), // mark late if after 9:45
        };
        setLogs((prev) => [newLog, ...prev.slice(0, 19)]);
        setLastScannedId(uid);
        setLastActivityTime(new Date(timestamp));
        toast.success(
          `${student.name} ${
            action === "check-in" ? "checked in" : "checked out"
          } (LIVE)`
        );
      } catch {}
    };
    return () => evtSource.close();
  }, []);

  // Simulated detector status update
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastActivityTime) {
        const timeDiff = Date.now() - lastActivityTime.getTime();
        setDetectorStatus(timeDiff < 10000 ? "active" : "idle");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastActivityTime]);

  const generateRandomStudent = useCallback(() => {
    const randomStudent =
      mockStudents[Math.floor(Math.random() * mockStudents.length)];
    setRfidInput(randomStudent.id);
    setLastScannedId(randomStudent.id);
    toast.success("Random student ID generated");
  }, []);

  // Old logAttendance for manual/button use
  const logAttendance = useCallback(
    async (action: "check-in" | "check-out") => {
      if (!rfidInput.trim()) {
        toast.error("Please enter an RFID");
        return;
      }
      const isCheckIn = action === "check-in";
      const setLoading = isCheckIn ? setIsCheckingIn : setIsCheckingOut;
      setLoading(true);

      try {
        // Post to /api/scan for live logging (sends to all connected)
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: rfidInput, action }),
        });
        if (!res.ok) throw new Error("Failed to send scan");
        // For immediate feedback, also add locally:
        const student = mockStudents.find((s) => s.id === rfidInput) || {
          name: "Unknown Student",
        };
        const now = new Date();
        const logEntry: LogEntry = {
          id: Date.now().toString(),
          timestamp: now,
          studentId: rfidInput,
          studentName: student.name,
          action,
          late: isLate(now, action), // local check
        };
        setLogs((prev) => [logEntry, ...prev.slice(0, 19)]);
        setLastActivityTime(now);
        setLastScannedId(rfidInput);

        toast.success(
          `${student.name} ${
            action === "check-in" ? "checked in" : "checked out"
          }`
        );
        setRfidInput("");
      } catch (error) {
        toast.error(`Failed to ${action}`);
      } finally {
        setLoading(false);
      }
    },
    [rfidInput]
  );

  const handleCheckIn = () => logAttendance("check-in");
  const handleCheckOut = () => logAttendance("check-out");

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <MonitorDot
                  className={`h-8 w-8 transition-colors duration-300 ${
                    detectorStatus === "active"
                      ? "text-green-600 animate-pulse"
                      : "text-muted-foreground"
                  }`}
                />
                {detectorStatus === "active" && (
                  <div className="absolute -inset-1 rounded-full bg-green-100 animate-ping opacity-75 motion-reduce:animate-none" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">
                  Live RFID Detector
                </CardTitle>
                <CardDescription className="text-sm">
                  Scan student cards for instant attendance logging
                </CardDescription>
              </div>
            </div>
            <Badge
              variant={detectorStatus === "active" ? "default" : "secondary"}
              className={`transition-colors duration-300 ${
                detectorStatus === "active"
                  ? "bg-green-100 text-green-800 border-green-200"
                  : ""
              }`}
            >
              {detectorStatus === "active" ? "Active" : "Idle"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <IdCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Enter RFID or scan card..."
                  value={rfidInput}
                  onChange={(e) => setRfidInput(e.target.value)}
                  className="pl-10"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && rfidInput.trim()) {
                      handleCheckIn();
                    }
                  }}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={generateRandomStudent}
                className="whitespace-nowrap"
              >
                Random Student
              </Button>
            </div>
            {lastScannedId && (
              <p className="text-xs text-muted-foreground">
                Last scanned: {lastScannedId}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleCheckIn}
              disabled={!rfidInput.trim() || isCheckingIn}
              className="bg-green-600 hover:bg-green-700 text-white font-medium transition-all duration-200 transform active:scale-95"
            >
              {isCheckingIn ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Checking In...
                </>
              ) : (
                "Check In"
              )}
            </Button>
            <Button
              onClick={handleCheckOut}
              disabled={!rfidInput.trim() || isCheckingOut}
              variant="destructive"
              className="font-medium transition-all duration-200 transform active:scale-95"
            >
              {isCheckingOut ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Checking Out...
                </>
              ) : (
                "Check Out"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg font-semibold">
              Real-time Logs
            </CardTitle>
          </div>
          <CardDescription>Live attendance activity feed</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground font-medium">No logs yet</p>
                <p className="text-sm text-muted-foreground">
                  Attendance logs will appear here in real-time
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log, index) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card transition-all duration-300 animate-in slide-in-from-top-2 fade-in-0"
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animationFillMode: "backwards",
                      backgroundColor: log.suspicious ? "#ffe5e5" : undefined,
                    }}
                  >
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-foreground">
                        {getInitials(log.studentName)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {log.studentName}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            log.action === "check-in"
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-red-200 bg-red-50 text-red-700"
                          }`}
                        >
                          {log.action === "check-in" ? "Check In" : "Check Out"}
                        </Badge>
                        {log.suspicious && (
                          <Badge
                            variant="destructive"
                            className="text-xs ml-2"
                            style={{ backgroundColor: "#ff4d4d" }}
                          >
                            Proxy Attempt
                          </Badge>
                        )}
                        {/* Highlight late arrivals */}
                        {log.late && (
                          <Badge
                            variant="destructive"
                            className="text-xs ml-2"
                            style={{
                              backgroundColor: "#faad14",
                              color: "black",
                            }}
                          >
                            Late
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          ID: {log.studentId}
                        </p>
                        <span className="text-xs text-muted-foreground">•</span>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(log.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoggerSection;
