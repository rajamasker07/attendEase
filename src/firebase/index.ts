'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    // We explicitly pass the config object to initializeApp to ensure
    // the correct Firebase project is used, especially in development environments.
    const firebaseApp = initializeApp(firebaseConfig);
    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);

  // Hubungkan ke Firebase Local Emulator hanya saat mode development.
  // Flag _firebaseEmulatorsConnected mencegah koneksi ganda akibat hot reload Next.js.
  if (
    process.env.NODE_ENV === 'development' &&
    !(globalThis as Record<string, unknown>)._firebaseEmulatorsConnected
  ) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
    (globalThis as Record<string, unknown>)._firebaseEmulatorsConnected = true;
    console.log('[DEV] Firebase terhubung ke emulator lokal (Auth: 9099, Firestore: 8080)');
  }

  return {
    firebaseApp,
    auth,
    firestore,
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
