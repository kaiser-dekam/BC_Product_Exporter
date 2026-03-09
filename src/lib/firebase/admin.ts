import {
  initializeApp,
  getApps,
  cert,
  type ServiceAccount,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import fs from "fs";

function getAdminApp(): App | null {
  if (getApps().length) return getApps()[0];

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  // Option 1: Inline JSON string of the full service account
  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey) as ServiceAccount;
      return initializeApp({ credential: cert(serviceAccount) });
    } catch {
      console.warn(
        "Firebase Admin: FIREBASE_SERVICE_ACCOUNT_KEY is set but is not valid JSON. " +
        "It must be the full service account JSON (not just the private key). Falling through to file-based credentials."
      );
    }
  }

  // Option 2: Path to service account JSON file
  if (credPath) {
    if (!fs.existsSync(credPath)) {
      console.error(
        `Firebase Admin: GOOGLE_APPLICATION_CREDENTIALS points to "${credPath}" but the file does not exist.\n` +
        `Download your service account key from Firebase Console → Project Settings → Service accounts → Generate new private key.\n` +
        `Save the JSON file to that path.`
      );
      return null;
    }
    try {
      const raw = fs.readFileSync(credPath, "utf-8");
      const serviceAccount = JSON.parse(raw) as ServiceAccount;
      return initializeApp({ credential: cert(serviceAccount) });
    } catch (err) {
      console.error("Firebase Admin: Failed to parse service account JSON file:", err);
      return null;
    }
  }

  // Fallback: Application Default Credentials
  try {
    return initializeApp();
  } catch (err) {
    console.error("Firebase Admin SDK initialization failed:", err);
    return null;
  }
}

const adminApp = getAdminApp();

// Lazy getters that throw if Firebase Admin is not initialized
function getAdminAuth(): Auth {
  if (!adminApp) throw new Error("Firebase Admin not initialized");
  return getAuth(adminApp);
}

function getAdminDb(): Firestore {
  if (!adminApp) throw new Error("Firebase Admin not initialized");
  return getFirestore(adminApp);
}

// Export as getters so they fail at call time, not import time
const adminAuth = new Proxy({} as Auth, {
  get(_, prop) {
    return Reflect.get(getAdminAuth(), prop);
  },
});

const adminDb = new Proxy({} as Firestore, {
  get(_, prop) {
    return Reflect.get(getAdminDb(), prop);
  },
});

export { adminApp, adminAuth, adminDb };
