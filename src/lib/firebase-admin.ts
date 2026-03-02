import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin for server-side
// Locally, you need either FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
// or GOOGLE_APPLICATION_CREDENTIALS set.
// On GCP/Firebase App Hosting, it will automatically use Application Default Credentials.

if (!getApps().length) {
    if (process.env.FIREBASE_PRIVATE_KEY) {
        initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID || "sniff-by-hatch-app",
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
        });
    } else {
        // Fallback for Application Default Credentials (e.g. deployed environments)
        initializeApp({ projectId: "sniff-by-hatch-app" });
    }
}

export const firestore = getFirestore();
