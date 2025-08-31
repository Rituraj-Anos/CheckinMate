"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { UserRoundPen, Component, Undo, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Firebase imports with error handling
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db, isFirebaseAvailable } from "@/lib/firebase";

const formSchema = z.object({
  name: z
    .string()
    .min(1, "Student name is required")
    .min(2, "Name must be at least 2 characters"),
  rfid: z
    .string()
    .min(1, "Student RFID is required")
    .min(3, "RFID must be at least 3 characters"),
});

type FormValues = z.infer<typeof formSchema>;

interface Student {
  id: string;
  name: string;
  rfid: string;
}

interface StudentsSeccionProps {
  editingStudent?: Student | null;
  onEditComplete?: () => void;
}

export default function StudentsSection({
  editingStudent,
  onEditComplete,
}: StudentsSeccionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      rfid: "",
    },
  });

  // Check Firebase availability on mount
  useEffect(() => {
    if (!isFirebaseAvailable()) {
      setFirebaseError(
        "Firebase is not configured. Please set up your Firebase environment variables."
      );
    }
  }, []);

  // Handle editing mode
  useEffect(() => {
    if (editingStudent) {
      setIsEditing(true);
      form.reset({
        name: editingStudent.name,
        rfid: editingStudent.rfid,
      });
    }
  }, [editingStudent, form]);

  // Generate avatar initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  // Check RFID uniqueness
  const checkRFIDUniqueness = async (
    rfid: string,
    excludeId?: string
  ): Promise<boolean> => {
    if (!isFirebaseAvailable() || !db) {
      console.warn("Firebase not available, skipping RFID uniqueness check");
      return true; // Allow operation to proceed if Firebase is not available
    }

    try {
      const q = query(collection(db, "students"), where("rfid", "==", rfid));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) return true;

      // If editing, allow the same RFID for the current student
      if (excludeId) {
        return querySnapshot.docs.every((doc) => doc.id === excludeId);
      }

      return false;
    } catch (error) {
      console.error("Error checking RFID uniqueness:", error);
      toast.error("Unable to verify RFID uniqueness. Please try again.");
      return false;
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (!isFirebaseAvailable() || !db) {
      toast.error("Firebase is not configured. Cannot save student data.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Check RFID uniqueness
      const isUnique = await checkRFIDUniqueness(data.rfid, editingStudent?.id);

      if (!isUnique) {
        form.setError("rfid", {
          type: "manual",
          message: "This RFID is already in use by another student",
        });
        setIsSubmitting(false);
        return;
      }

      if (isEditing && editingStudent) {
        // Update existing student
        await setDoc(
          doc(db, "students", editingStudent.id),
          {
            name: data.name,
            rfid: data.rfid,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        toast.success(`Student "${data.name}" updated successfully!`);
      } else {
        // Create new student
        const studentId = `student_${Date.now()}`;
        await setDoc(doc(db, "students", studentId), {
          name: data.name,
          rfid: data.rfid,
          createdAt: new Date().toISOString(),
        });

        toast.success(`Student "${data.name}" added successfully!`);
      }

      // Show success animation
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        handleReset();
      }, 2000);
    } catch (error) {
      console.error("Error saving student:", error);
      toast.error(
        "Failed to save student. Please check your Firebase configuration."
      );
    }

    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!editingStudent) return;

    if (!isFirebaseAvailable() || !db) {
      toast.error("Firebase is not configured. Cannot delete student data.");
      return;
    }

    setIsSubmitting(true);

    try {
      await deleteDoc(doc(db, "students", editingStudent.id));
      toast.success(`Student "${editingStudent.name}" deleted successfully!`);

      setShowDeleteDialog(false);
      handleReset();
    } catch (error) {
      console.error("Error deleting student:", error);
      toast.error(
        "Failed to delete student. Please check your Firebase configuration."
      );
    }

    setIsSubmitting(false);
  };

  const handleReset = () => {
    form.reset({
      name: "",
      rfid: "",
    });
    setIsEditing(false);
    if (onEditComplete) {
      onEditComplete();
    }
  };

  const handleDiscardChanges = () => {
    handleReset();
  };

  const currentName = form.watch("name");

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-card border-border shadow-lg">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl font-display flex items-center gap-3">
              <UserRoundPen className="w-6 h-6 text-primary" />
              {isEditing ? "Edit Student" : "Add Student"}
            </CardTitle>

            {/* Firebase Error Alert */}
            {firebaseError && (
              <Alert className="bg-destructive/10 border-destructive/20">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-destructive">
                  {firebaseError}
                </AlertDescription>
              </Alert>
            )}

            <AnimatePresence>
              {isEditing && editingStudent && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Alert className="bg-accent/50 border-accent">
                    <Component className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>
                        Editing: <strong>{editingStudent.name}</strong>
                      </span>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={handleDiscardChanges}
                        className="p-0 h-auto text-muted-foreground hover:text-foreground"
                      >
                        Discard changes
                      </Button>
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>
          </CardHeader>

          <CardContent className="space-y-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  <div className="flex-1 space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Student Name *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter student's full name"
                              className="bg-background border-input"
                              aria-required="true"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="rfid"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            Student ID (RFID Tag) *
                            <Component className="w-4 h-4 text-muted-foreground" />
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Scan or enter RFID tag"
                              className="bg-background border-input"
                              aria-required="true"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex flex-col items-center space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      Preview
                    </Label>
                    <Avatar className="w-16 h-16 border-2 border-border">
                      <AvatarFallback className="bg-accent text-accent-foreground font-semibold text-lg">
                        {currentName ? getInitials(currentName) : "??"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting || !isFirebaseAvailable()}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {isSubmitting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      <>{isEditing ? "Update Student" : "Save Student"}</>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    className="flex items-center gap-2"
                  >
                    <Undo className="w-4 h-4" />
                    {isEditing ? "Cancel" : "Reset"}
                  </Button>

                  {isEditing && editingStudent && (
                    <AlertDialog
                      open={showDeleteDialog}
                      onOpenChange={setShowDeleteDialog}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          disabled={!isFirebaseAvailable()}
                        >
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Student</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "
                            {editingStudent.name}"? This action cannot be
                            undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive hover:bg-destructive/90"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? "Deleting..." : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </form>
            </Form>

            <AnimatePresence>
              {showSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  className="flex justify-center"
                >
                  <div className="bg-success/10 border border-success/20 rounded-lg p-4 flex items-center gap-3">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: 0.1,
                        type: "spring",
                        stiffness: 200,
                      }}
                      className="w-8 h-8 bg-success rounded-full flex items-center justify-center"
                    >
                      <motion.svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                      >
                        <motion.path
                          d="M9 12l2 2 4-4"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </motion.svg>
                    </motion.div>
                    <span className="text-success font-medium">
                      {isEditing ? "Student updated!" : "Student saved!"}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
