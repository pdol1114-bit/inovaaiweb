import { FirestoreAdapter } from "@auth/firebase-adapter";
import { firestore } from "./firebase-admin";

export const adapter = FirestoreAdapter(firestore);
