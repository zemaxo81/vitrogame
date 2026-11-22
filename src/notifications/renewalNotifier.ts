import { RenewedGameInfo } from '../engine/quotas';

export type NotificationPermState = NotificationPermission | 'unsupported';

export function getNotificationPermissionState(): NotificationPermState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestRenewalNotificationPermission(): Promise<NotificationPermState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function buildRenewalNotificationCopy(renewals: RenewedGameInfo[]): {
  title: string;
  body: string;
} {
  const title = 'VITROCASH : Un jeu est de nouveau accessible !!!';
  if (renewals.length === 1) {
    const r = renewals[0];
    return {
      title,
      body: `${r.label} : vos ${r.attemptsRestored} essai${r.attemptsRestored > 1 ? 's sont' : ' est'} de nouveau disponible${r.attemptsRestored > 1 ? 's' : ''} !`,
    };
  }
  const names = renewals.map((r) => r.label).join(', ');
  return {
    title,
    body: `${names} : vos compteurs ont été renouvelés et sont prêts !`,
  };
}

export async function sendSystemRenewalNotification(
  renewals: RenewedGameInfo[],
): Promise<boolean> {
  if (renewals.length === 0) return false;
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  const { title, body } = buildRenewalNotificationCopy(renewals);
  const options: NotificationOptions = {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: `vitrocash-renewal-${renewals.map((r) => r.key).sort().join('-')}`,
  };

  // Prefer ServiceWorkerRegistration.showNotification for Android Chrome PWA compatibility
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, options);
        return true;
      }
    }
  } catch {
    // Fallback to window Notification below
  }

  try {
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}
