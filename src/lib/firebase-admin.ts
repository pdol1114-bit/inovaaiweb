import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin for server-side.
// On Firebase App Hosting / Cloud Run, Application Default Credentials are used automatically.
// For local development, set FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, FIREBASE_PROJECT_ID.

try {
    if (!getApps().length) {
        if (process.env.FBASE_PRIVATE_KEY &&
            !process.env.FBASE_PRIVATE_KEY.includes("중략") &&
            !process.env.FBASE_PRIVATE_KEY.includes("...")) {
            // Explicit service account credentials (for local dev)
            initializeApp({
                credential: cert({
                    projectId: process.env.FBASE_PROJECT_ID || "sniff-by-hatch-app",
                    clientEmail: process.env.FBASE_CLIENT_EMAIL,
                    privateKey: process.env.FBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                }),
            });
        } else {
            // Application Default Credentials (works automatically on Firebase App Hosting / GCP)
            initializeApp({ projectId: process.env.FBASE_PROJECT_ID || "sniff-by-hatch-app" });
        }
    }
} catch (e) {
    console.error("[firebase-admin] Initialization failed:", e);
}

export const firestore = getFirestore();
