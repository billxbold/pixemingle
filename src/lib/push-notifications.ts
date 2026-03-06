/**
 * Browser Push Notifications utility for Pixemingle.
 * Wraps the Notification API and Service Worker registration.
 */

/**
 * Requests browser notification permission.
 * Returns true if permission is granted, false otherwise.
 */
export async function requestPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const result = await Notification.requestPermission();
  return result === 'granted';
}

/**
 * Registers the service worker at /sw.js.
 * Returns the ServiceWorkerRegistration or null if unsupported.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    return registration;
  } catch (err) {
    console.error('[push-notifications] Service worker registration failed:', err);
    return null;
  }
}

/**
 * Shows a browser notification via the active service worker registration.
 * Falls back to the basic Notification API if no service worker is available.
 */
export async function showNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  // Merge sensible defaults for pixel-art theme
  const mergedOptions: NotificationOptions = {
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    ...options,
  };

  // Try to use the service worker registration for richer notifications
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, mergedOptions);
      return;
    } catch {
      // Fall through to basic Notification
    }
  }

  // Fallback: basic Notification constructor
  new Notification(title, mergedOptions);
}
