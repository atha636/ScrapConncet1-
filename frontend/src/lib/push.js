import { getVapidPublicKey, subscribeToPush, unsubscribeFromPush } from "../services/pushService";

export function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}


export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function registerServiceWorker() {
  return navigator.serviceWorker.register("/sw.js");
}

/** Current subscription status, without prompting for permission. */
export async function getPushStatus() {
  if (!isPushSupported()) return { supported: false, subscribed: false };

  if (Notification.permission === "denied") {
    return { supported: true, subscribed: false, denied: true };
  }

  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const existing = await registration?.pushManager.getSubscription();
  return { supported: true, subscribed: !!existing, denied: false };
}

/** Prompts for permission (if needed) and subscribes this browser to push. */
export async function enablePush() {
  if (!isPushSupported()) throw new Error("Push notifications aren't supported in this browser.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was denied.");
  }

  const { data: vapid } = await getVapidPublicKey();
  if (!vapid.enabled) {
    throw new Error("Push notifications aren't configured on the server yet.");
  }

  const registration = await registerServiceWorker();
  await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapid.publicKey),
  });

  await subscribeToPush(subscription.toJSON());
  return subscription;
}

/** Unsubscribes this browser and tells the server to forget it. */
export async function disablePush() {
  if (!isPushSupported()) return;

  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  await subscription.unsubscribe();
  await unsubscribeFromPush(subscription.endpoint);
}