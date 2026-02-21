'use client';

import React, { useMemo, useEffect, type ReactNode } from 'react';
import { FirebaseProvider, useUser } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';

function AuthGate({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isUserLoading) {
      return; // Tunggu hingga status autentikasi selesai dimuat
    }

    const isAuthPage = pathname === '/login';

    if (!user && !isAuthPage) {
      // Jika tidak ada user dan bukan di halaman login, arahkan ke login
      router.push('/login');
    } else if (user && isAuthPage) {
      // Jika ada user dan berada di halaman login, arahkan ke dasbor
      router.push('/');
    }
  }, [user, isUserLoading, pathname, router]);


  // Tampilkan layar memuat saat status auth sedang diperiksa, atau saat akan mengarahkan
  if (isUserLoading || (!user && pathname !== '/login')) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <p>Memuat aplikasi...</p>
      </div>
    );
  }

  // Jika user sudah login atau berada di halaman login, tampilkan konten
  return <>{children}</>;
}


interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    return initializeFirebase();
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      <AuthGate>{children}</AuthGate>
    </FirebaseProvider>
  );
}
