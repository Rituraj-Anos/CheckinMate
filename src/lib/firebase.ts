import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  Firestore,
  connectFirestoreEmulator,
} from "firebase/firestore";
// Firebase configuration interface for type safety
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}
// Environment variables configuration
// Add these to your .env.local file:
// NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
// NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
// NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
// NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
// NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
// NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
// NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX (optional, for Analytics)
const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
};
// Validate required environment variables
const validateConfig = (config: FirebaseConfig): boolean => {
  const requiredFields: (keyof Omit<FirebaseConfig, "measurementId">)[] = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId",
  ];
  const missingFields = requiredFields.filter((field) => !config[field]);
  if (missingFields.length > 0) {
    console.warn("Missing Firebase environment variables:", missingFields);
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "Firebase not properly configured. Please add the following environment variables to your .env.local file:",
        missingFields
          .map((field) => `NEXT_PUBLIC_FIREBASE_${field.toUpperCase()}`)
          .join("\n")
      );
    }
    return false;
  }
  return true;
};
// Initialize Firebase app
let app: FirebaseApp | null = null;
let db: Firestore | null = null;
try {
  // Validate configuration before initializing
  if (validateConfig(firebaseConfig)) {
    // Check if Firebase app is already initialized (prevents multiple initialization in development)
    if (getApps().length === 0) {
      // Initialize Firebase app
      app = initializeApp(firebaseConfig);
      console.log("Firebase app initialized successfully");
    } else {
      // Use existing Firebase app instance
      app = getApps()[0];
      console.log("Using existing Firebase app instance");
    } // Initialize Firestore database
    db = getFirestore(app); // Connect to Firestore emulator in development if specified
    if (
      process.env.NODE_ENV === "development" &&
      process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true"
    ) {
      try {
        // Only connect to emulator if not already connected
        connectFirestoreEmulator(db, "localhost", 8080);
        console.log("Connected to Firestore emulator");
      } catch (error) {
        console.warn(
          "Firestore emulator connection failed or already connected:",
          error
        );
      }
    }
  } else {
    console.warn(
      "Firebase configuration incomplete. Firebase features will be disabled."
    );
    if (process.env.NODE_ENV === "development") {
      console.log(`
        Firebase Setup Instructions:
        1. Create a Firebase project at https://console.firebase.google.com
        2. Go to Project Settings > General > Your apps
        3. Add a web app and copy the configuration
        4. Create a .env.local file in your project root with:
           NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
           NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
           NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
           NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
           NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
           NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
           NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX (optional)
        5. Restart your development server
      `);
    }
  }
} catch (error) {
  console.error("Firebase initialization error:", error); // Set to null instead of throwing to allow app to continue running
  app = null;
  db = null;
}
// Helper function to check if Firebase is available
export const isFirebaseAvailable = (): boolean => {
  return app !== null && db !== null;
};
// Export Firebase app and Firestore database instances
export { app, db };
// Export Firebase configuration for reference
export { firebaseConfig };
// Type exports for use in other parts of the application
export type { FirebaseConfig };
