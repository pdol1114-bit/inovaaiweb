import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin for server-side.
// On Firebase App Hosting / Cloud Run, Application Default Credentials are used automatically.
// For local development, set FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, FIREBASE_PROJECT_ID.

try {
    if (!getApps().length) {
        const projectId = process.env.FBASE_PROJECT_ID || "sniff-by-hatch-app";
        const clientEmail = process.env.FBASE_CLIENT_EMAIL;
        const privateKey = process.env.FBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (privateKey && clientEmail) {
            // Explicit service account credentials (local dev or specific environment)
            initializeApp({
                credential: cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
            });
        } else {
            // Application Default Credentials (works automatically on Firebase App Hosting / GCP)
            initializeApp({ projectId });
        }
    }
} catch (e) {
    console.error("[firebase-admin] Initialization failed:", e);
}

export const firestore = getFirestore();
