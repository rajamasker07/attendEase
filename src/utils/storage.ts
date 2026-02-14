"use client";

/**
 * Mengambil data dari localStorage.
 * @param key Kunci untuk mengambil data.
 * @param initialValue Nilai awal yang akan digunakan jika kunci tidak ditemukan.
 * @returns Data yang tersimpan atau nilai awal.
 */
export function getData<T>(key: string, initialValue: T): T {
  if (typeof window === "undefined") {
    return initialValue;
  }
  try {
    const item = window.localStorage.getItem(key);
    if (item) {
      return JSON.parse(item);
    } else {
      window.localStorage.setItem(key, JSON.stringify(initialValue));
      return initialValue;
    }
  } catch (error) {
    console.warn(`Error saat membaca localStorage kunci “${key}”:`, error);
    return initialValue;
  }
}

/**
 * Menyimpan data ke localStorage.
 * @param key Kunci untuk menyimpan data.
 * @param value Nilai yang akan disimpan.
 */
export function saveData<T>(key: string, value: T): void {
  if (typeof window === "undefined") {
    console.warn(`Mencoba menyimpan ke localStorage di server untuk kunci “${key}”`);
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Error saat menyimpan ke localStorage untuk kunci “${key}”:`, error);
  }
}
