import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import config from '../../firebase-applet-config.json' with { type: 'json' };
let adminApp: App | null = null;
let db: Firestore | null = null;

try {
  const apps = getApps();
  if (apps.length === 0) {
    adminApp = initializeApp({
      projectId: config.projectId,
    });
  } else {
    adminApp = apps[0] || null;
  }
  
  // Use custom database ID from config if present
  const dbId = config.firestoreDatabaseId || '(default)';
  try {
    if (adminApp) {
      db = getFirestore(adminApp, dbId);
    }
  } catch (dbErr) {
    console.warn("Could not initialize custom firestore dbId via admin, falling back to default:", dbErr);
    if (adminApp) {
      db = getFirestore(adminApp);
    }
  }
} catch (error) {
  console.error("Firebase Admin initialization failed. Server will run without cloud persistence.", error);
}

export { adminApp, db };

export interface VerifiedUser {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}

/**
 * Verify Firebase ID Token server-side.
 * Never trust browser-supplied user IDs.
 */
export async function verifyFirebaseToken(token: string): Promise<VerifiedUser> {
  if (!adminApp) {
    throw new Error("Firebase Admin is not initialized.");
  }
  
  if (!token) {
    throw new Error("No authentication token provided.");
  }
  
  try {
    const authInstance = getAuth(adminApp);
    const decodedToken = await authInstance.verifyIdToken(token);
    if (!decodedToken || !decodedToken.uid) {
      throw new Error("Invalid token payload.");
    }
    
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
    };
  } catch (error: any) {
    console.error("Token verification error:", error.message || error);
    throw new Error("Authentication failed: Invalid or expired token.");
  }
}
