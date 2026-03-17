import { handlers } from "../../../../../auth";

// Force this route to be server-rendered at request time, never at build time.
// This prevents Firebase Admin from being initialized without credentials during the GCP build.
export const dynamic = "force-dynamic";

export const { GET, POST } = handlers;
