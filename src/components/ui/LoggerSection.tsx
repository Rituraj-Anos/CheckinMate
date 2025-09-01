"use client";

import { useState, useCallback, useEffect } from "react";
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
import { collection, getDocs, addDoc } from "firebase/firestore";

interface Student {
  rfid: string;
  name: string;
}
interface LogEntry {
  id: string;
  timestamp: Date;
  studentRfid: string;
  studentName: string;
  action: "check-in" | "check-out";
  suspicious?: boolean;
  late?: boolean;
}

const CLASS_START_HOUR = 9;
const CLASS_START_MINUTE = 45;

const LoggerSection = () => {
  const [rfidInput, setRfidInput] = useState("");
  const [lastScannedRfid, setLastScannedRfid] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);

  // Fetch students from Firestore
  useEffect(() => {
    async function fetchStudents() {
      try {
        const { db } = await import("@/lib/firebase");
        if (!db) return;
        const studentSnapshot = await getDocs(collection(db, "students"));
        const studentList = studentSnapshot.docs.map((doc) => {
          const data = doc.data();
          return { rfid: data.rfid, name: data.name || "Unknown" };
        });
        setStudents(studentList);
      } catch (e) {
        toast.error("Failed to load students");
      }
    }
    fetchStudents();
  }, []);

  const isLate = (timestamp: Date, action: "check-in" | "check-out") => {
    if (action !== "check-in") return false;
    return (
      timestamp.getHours() > CLASS_START_HOUR ||
      (timestamp.getHours() === CLASS_START_HOUR &&
        timestamp.getMinutes() > CLASS_START_MINUTE)
    );
  };

  const generateRandomStudent = useCallback(() => {
    if (!students.length) {
      toast.error("No students loaded");
      return;
    }
    const randomStudent = students[Math.floor(Math.random() * students.length)];
    setRfidInput(randomStudent.rfid);
    setLastScannedRfid(randomStudent.rfid);
    toast.success(`Random student selected: ${randomStudent.name}`);
  }, [students]);

  const logAttendance = useCallback(
    async (action: "check-in" | "check-out") => {
      if (!rfidInput.trim()) {
        toast.error("Please enter or select a RFID");
        return;
      }
      // Check Firestore students for this RFID
      let student = students.find((s) => s.rfid === rfidInput);
      if (!student) {
        const { db } = await import("@/lib/firebase");
        if (!db) {
          toast.error("DB error");
          return;
        }
        await addDoc(collection(db, "students"), {
          name: "Unknown Student",
          rfid: rfidInput,
          createdAt: new Date().toISOString(),
        });
        // Update local state immediately to show new student in dropdowns/activity
        setStudents((prev) => [
          { rfid: rfidInput, name: "Unknown Student" },
          ...prev,
        ]);
        student = { rfid: rfidInput, name: "Unknown Student" };
        toast.success("New student added automatically!");
      }
      if (action === "check-in") setIsCheckingIn(true);
      else setIsCheckingOut(true);

      try {
        const response = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: rfidInput, action }),
        });

        const result = await response.json();

        if (result.ok) {
          const now = new Date();
          const newLog: LogEntry = {
            id: Date.now().toString(),
            timestamp: now,
            studentRfid: rfidInput,
            studentName: student.name,
            action,
            suspicious: result.suspicious,
            late: isLate(now, action),
          };

          setLogs((prev) => [newLog, ...prev.slice(0, 19)]);
          setLastScannedRfid(rfidInput);
          toast.success(
            `${student.name} ${
              action === "check-in" ? "checked in" : "checked out"
            }${result.suspicious ? " (Flagged as suspicious!)" : ""}`
          );
          setRfidInput("");
          window.dispatchEvent(new Event("attendance-update"));
        } else {
          toast.error(
            `Failed to ${action}: ${result.error || "Unknown error"}`
          );
        }
      } catch (error) {
        toast.error(`Network error during ${action}`);
      } finally {
        setIsCheckingIn(false);
        setIsCheckingOut(false);
      }
    },
    [rfidInput, students]
  );

  const handleCheckIn = () => logAttendance("check-in");
  const handleCheckOut = () => logAttendance("check-out");

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <MonitorDot className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">
                  RFID Scanner
                </CardTitle>
                <CardDescription className="text-sm">
                  Scan student cards for attendance logging
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary">Ready</Badge>
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
                  list="students-list"
                />
                <datalist id="students-list">
                  {students.map((student) => (
                    <option value={student.rfid} key={student.rfid}>
                      {student.name} ({student.rfid})
                    </option>
                  ))}
                </datalist>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={generateRandomStudent}
                className="whitespace-nowrap"
                disabled={!students.length}
              >
                Random Student
              </Button>
            </div>
            {lastScannedRfid && (
              <p className="text-xs text-muted-foreground">
                Last scanned RFID: {lastScannedRfid}
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
              Activity Logs
            </CardTitle>
          </div>
          <CardDescription>Recent attendance activity</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground font-medium">No logs yet</p>
                <p className="text-sm text-muted-foreground">
                  Attendance logs will appear here after scanning
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log, index) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card transition-all duration-300"
                    style={{
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
                          RFID: {log.studentRfid}
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
