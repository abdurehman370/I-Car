'use client';

import { useCallback, useEffect, useState } from 'react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkSubscription = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!registration) {
      setIsSubscribed(false);
      return;
    }

    const subscription = await registration.pushManager.getSubscription();
    setIsSubscribed(Boolean(subscription));
  }, []);

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, [checkSubscription]);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser.');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const keyRes = await fetch('/api/push/vapid-public-key');
      if (!keyRes.ok) {
        throw new Error('Push notifications are not configured on the server.');
      }
      const { publicKey } = await keyRes.json();

      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== 'granted') {
        throw new Error('Notification permission was denied.');
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
      }

      const json = subscription.toJSON();
      const res = await fetch('/api/dealer/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save push subscription.');
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to enable push notifications.';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return false;

    setLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        await fetch('/api/dealer/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disable push notifications.';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    error,
    subscribe,
    unsubscribe,
    checkSubscription,
  };
}
