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

  try {
    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey) as ServiceAccount;
      return initializeApp({ credential: cert(serviceAccount) });
    }

    if (credPath && fs.existsSync(credPath)) {
      const raw = fs.readFileSync(credPath, "utf-8");
      const serviceAccount = JSON.parse(raw) as ServiceAccount;
      return initializeApp({ credential: cert(serviceAccount) });
    }

    // Fallback: try Application Default Credentials
    return initializeApp();
  } catch {
    console.warn("Firebase Admin SDK initialization failed. Server-side Firebase features will be unavailable.");
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
