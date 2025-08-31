"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Download, Edit2, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

interface Student {
  id: string;
  rfid: string;
  name: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: "present" | "absent" | "late";
}

interface AttendanceSectionProps {
  className?: string;
}

const AttendanceSection = ({ className }: AttendanceSectionProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const mockStudents: Student[] = [
          {
            id: "1",
            rfid: "RFID001",
            name: "Alice Johnson",
            checkInTime: "08:30 AM",
            checkOutTime: "04:15 PM",
            status: "present",
          },
          {
            id: "2",
            rfid: "RFID002",
            name: "Bob Smith",
            checkInTime: "09:15 AM",
            status: "late",
          },
          {
            id: "3",
            rfid: "RFID003",
            name: "Charlie Brown",
            status: "absent",
          },
          {
            id: "4",
            rfid: "RFID004",
            name: "Diana Prince",
            checkInTime: "08:25 AM",
            checkOutTime: "04:30 PM",
            status: "present",
          },
        ];
        setStudents(mockStudents);
      } catch (error) {
        toast.error("Failed to load attendance data");
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    if (statusFilter === "all") return students;
    return students.filter((student) => student.status === statusFilter);
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
      link.download = `attendance-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Attendance data exported successfully!");
    } catch (error) {
      toast.error("Failed to export attendance data");
    } finally {
      setExporting(false);
    }
  };

  const handleCheckIn = async (student: Student) => {
    try {
      const updatedStudents = students.map((s) =>
        s.id === student.id
          ? {
              ...s,
              status: "present" as const,
              checkInTime: new Date().toLocaleTimeString(),
            }
          : s
      );
      setStudents(updatedStudents);
      toast.success(`${student.name} checked in successfully!`);
    } catch (error) {
      toast.error("Failed to check in student");
    }
  };

  const handleEdit = (student: Student) => {
    if (typeof window !== "undefined" && (window as any).editStudent) {
      (window as any).editStudent(student.id);
    } else {
      window.dispatchEvent(
        new CustomEvent("editStudent", { detail: { studentId: student.id } })
      );
    }
    toast.info(`Opening edit form for ${student.name}`);
  };

  const handleDeleteClick = (student: Student) => {
    setStudentToDelete(student);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;
    try {
      if (typeof window !== "undefined" && (window as any).deleteStudent) {
        await (window as any).deleteStudent(studentToDelete.id);
      }
      setStudents((prev) => prev.filter((s) => s.id !== studentToDelete.id));
      toast.success(`${studentToDelete.name} has been removed from the system`);
    } catch (error) {
      toast.error("Failed to delete student");
    } finally {
      setDeleteModalOpen(false);
      setStudentToDelete(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present": return "border-l-success bg-success/5 text-success";
      case "absent": return "border-l-destructive bg-destructive/5 text-destructive";
      case "late": return "border-l-yellow-500 bg-yellow-50 text-yellow-700";
      default: return "border-l-muted bg-muted/5";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "present": return "default";
      case "absent": return "destructive";
      case "late": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className={className}>
      <Card className="w-full">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Daily Attendance Details</h2>
              <p className="text-muted-foreground mt-1">
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
                className="rounded-full px-6"
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
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
                      <TableCell className="font-mono text-sm">{student.rfid}</TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
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
                              className="h-8 px-3"
                            >
                              Check In
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
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendanceSection;
