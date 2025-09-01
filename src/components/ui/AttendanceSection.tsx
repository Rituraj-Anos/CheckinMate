"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Edit2,
  Trash2,
  UserPlus,
  Users,
  LoaderCircle,
} from "lucide-react";
import { toast } from "sonner";

interface Student {
  id: string;
  rfid: string;
  name: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: "present" | "absent" | "late";
}

interface ScanLog {
  uid: string;
  action: "check-in" | "check-out";
  timestamp: number;
  late?: boolean;
}

interface AttendanceSectionProps {
  className?: string;
}

const AttendanceSection = ({ className }: AttendanceSectionProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState({ name: "", rfid: "" });
  const [exporting, setExporting] = useState(false);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);

  const todayDate = useMemo(() => {
    const now = new Date();
    return [
      now.getFullYear().toString().padStart(4, "0"),
      (now.getMonth() + 1).toString().padStart(2, "0"),
      now.getDate().toString().padStart(2, "0"),
    ].join("-");
  }, []);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const { collection, getDocs } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");

      if (!db) {
        throw new Error("Firebase not initialized");
      }

      const studentSnapshot = await getDocs(collection(db, "students"));
      const studentList = studentSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          rfid: data.rfid || "",
          name: data.name || "Unknown",
        };
      });

      const scansSnapshot = await getDocs(collection(db, "scans"));
      const scanLogs: ScanLog[] = scansSnapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            uid: data.uid || "",
            action: data.action || "check-in",
            timestamp: data.timestamp || Date.now(),
            late: data.late || false,
          };
        })
        .filter((log) => {
          const logDate = new Date(log.timestamp);
          const y = logDate.getFullYear();
          const m = (logDate.getMonth() + 1).toString().padStart(2, "0");
          const d = logDate.getDate().toString().padStart(2, "0");
          const logDay = `${y}-${m}-${d}`;
          return logDay === todayDate;
        });

      const studentsWithAttendance: Student[] = studentList.map((student) => {
        const studentLogs = scanLogs.filter(
          (scan) => scan.uid === student.rfid
        );
        const checkIn = studentLogs.find((s) => s.action === "check-in");
        const checkOut = studentLogs.find((s) => s.action === "check-out");

        let status: Student["status"] = "absent";
        if (checkIn && checkIn.late) status = "late";
        else if (checkIn) status = "present";

        return {
          ...student,
          checkInTime: checkIn
            ? new Date(checkIn.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : undefined,
          checkOutTime: checkOut
            ? new Date(checkOut.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : undefined,
          status,
        };
      });

      setStudents(studentsWithAttendance);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error("Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [todayDate]);

  const filteredStudents = useMemo(() => {
    if (statusFilter === "all") return students;
    return students.filter((s) => s.status === statusFilter);
  }, [students, statusFilter]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const csvData = [
        ["RFID", "Name", "Check-in", "Check-out", "Status"],
        ...filteredStudents.map((student) => [
          student.rfid,
          student.name,
          student.checkInTime || "-",
          student.checkOutTime || "-",
          student.status,
        ]),
      ];
      const csvContent = csvData.map((row) => row.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `attendance-${todayDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Attendance data exported successfully!");
    } catch {
      toast.error("Failed to export attendance data");
    } finally {
      setExporting(false);
    }
  };

  const handleCheckIn = async (student: Student) => {
    setCheckingIn(student.id);
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: student.rfid, action: "check-in" }),
      });

      const result = await response.json();

      if (result.ok) {
        toast.success(
          `${student.name} checked in successfully!${
            result.suspicious ? " (Flagged as suspicious!)" : ""
          }${result.late ? " (Marked as late!)" : ""}`
        );
        await fetchAttendance();
      } else {
        toast.error(`Failed to check in: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      toast.error("Network error during check-in");
    } finally {
      setCheckingIn(null);
    }
  };

  const handleEdit = (student: Student) => {
    setStudentToEdit(student);
    setEditForm({ name: student.name, rfid: student.rfid });
    setEditModalOpen(true);
  };

  const handleEditSave = async () => {
    if (!studentToEdit || !editForm.name.trim() || !editForm.rfid.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setEditing(true);
    try {
      const { doc, updateDoc, collection, getDocs, query, where } =
        await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");

      if (!db) {
        throw new Error("Firebase not initialized");
      }

      // Update student record
      await updateDoc(doc(db, "students", studentToEdit.id), {
        name: editForm.name.trim(),
        rfid: editForm.rfid.trim(),
      });

      // If RFID changed, update all scan records
      if (editForm.rfid !== studentToEdit.rfid) {
        const scansQuery = query(
          collection(db, "scans"),
          where("uid", "==", studentToEdit.rfid)
        );
        const scansSnapshot = await getDocs(scansQuery);

        const updatePromises = scansSnapshot.docs.map((scanDoc) =>
          updateDoc(scanDoc.ref, { uid: editForm.rfid.trim() })
        );
        await Promise.all(updatePromises);
      }

      toast.success(`${editForm.name} updated successfully!`);
      await fetchAttendance();
    } catch (error) {
      console.error("Error updating student:", error);
      toast.error("Failed to update student");
    } finally {
      setEditing(false);
      setEditModalOpen(false);
      setStudentToEdit(null);
    }
  };

  const handleDeleteClick = (student: Student) => {
    setStudentToDelete(student);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;

    setDeleting(true);
    try {
      const { collection, getDocs, deleteDoc, doc, query, where } =
        await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");

      if (!db) {
        throw new Error("Firebase not initialized");
      }

      await deleteDoc(doc(db, "students", studentToDelete.id));

      const scansQuery = query(
        collection(db, "scans"),
        where("uid", "==", studentToDelete.rfid)
      );
      const scansSnapshot = await getDocs(scansQuery);

      const deletePromises = scansSnapshot.docs.map((scanDoc) =>
        deleteDoc(scanDoc.ref)
      );
      await Promise.all(deletePromises);

      toast.success(`${studentToDelete.name} has been removed from the system`);
      await fetchAttendance();
    } catch (error) {
      console.error("Error deleting student:", error);
      toast.error("Failed to delete student");
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setStudentToDelete(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "border-l-success bg-success/5 text-success";
      case "absent":
        return "border-l-destructive bg-destructive/5 text-destructive";
      case "late":
        return "border-l-yellow-500 bg-yellow-50 text-yellow-700";
      default:
        return "border-l-muted bg-muted/5";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "present":
        return "default";
      case "absent":
        return "destructive";
      case "late":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className={`${className} w-full max-w-5xl mx-auto p-2 md:p-0`}>
      <Card className="w-full md:rounded-lg overflow-hidden shadow">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold">
                Daily Attendance Details
              </h2>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                Monitor and manage today's attendance records
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleExportCSV}
                disabled={exporting || filteredStudents.length === 0}
                className="rounded-full px-6 whitespace-nowrap"
              >
                <Download className="w-4 h-4 mr-2" />
                {exporting ? "Exporting..." : "Export Today"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-4 p-4 border rounded-lg"
                >
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-16 px-6">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {statusFilter === "all"
                  ? "No students found"
                  : `No ${statusFilter} students`}
              </h3>
              <p className="text-muted-foreground mb-6">
                {statusFilter === "all"
                  ? "Get started by adding your first student to the system."
                  : `There are no students with ${statusFilter} status today.`}
              </p>
              {statusFilter === "all" && (
                <Button variant="outline">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add First Student
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <Table className="min-w-[640px]">
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>RFID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow
                      key={student.id}
                      className={`
                        border-l-4 transition-all duration-200 hover:bg-muted/50 hover:shadow-sm
                        ${getStatusColor(student.status)}
                      `}
                    >
                      <TableCell className="font-mono text-sm">
                        {student.rfid}
                      </TableCell>
                      <TableCell className="font-medium">
                        {student.name}
                      </TableCell>
                      <TableCell>{student.checkInTime || "-"}</TableCell>
                      <TableCell>{student.checkOutTime || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusBadgeVariant(student.status)}
                          className="capitalize"
                        >
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {student.status === "absent" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCheckIn(student)}
                              disabled={checkingIn === student.id}
                              className="h-8 px-3"
                            >
                              {checkingIn === student.id ? (
                                <>
                                  <LoaderCircle className="mr-2 h-3 w-3 animate-spin" />
                                  Checking In...
                                </>
                              ) : (
                                "Check In"
                              )}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(student)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="w-4 h-4" />
                            <span className="sr-only">Edit {student.name}</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteClick(student)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive-foreground hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="sr-only">
                              Delete {student.name}
                            </span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update the student information below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                placeholder="Enter student name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-rfid">RFID</Label>
              <Input
                id="edit-rfid"
                value={editForm.rfid}
                onChange={(e) =>
                  setEditForm({ ...editForm, rfid: e.target.value })
                }
                placeholder="Enter RFID"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              disabled={editing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={
                editing || !editForm.name.trim() || !editForm.rfid.trim()
              }
            >
              {editing ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{studentToDelete?.name}</strong>? This action cannot be
              undone and will remove all associated attendance records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Student"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendanceSection;
