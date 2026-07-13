"use client";

import { useEffect, useState } from "react";

type Status = "loading" | "unsupported" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushToggle() {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      setStatus(sub ? "on" : "off");
    });
  }, []);

  async function enable() {
    if (!vapidKey) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "off");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub }),
      });
      setStatus(res.ok ? "on" : "off");
    } catch (e) {
      console.error("Enable push failed:", e);
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("off");
    } catch (e) {
      console.error("Disable push failed:", e);
    } finally {
      setBusy(false);
    }
  }

  if (!vapidKey) {
    return (
      <p className="text-sm text-black/60 dark:text-white/60">
        Push isn’t configured. Add <code>VAPID_PUBLIC_KEY</code>,{" "}
        <code>VAPID_PRIVATE_KEY</code>, <code>VAPID_SUBJECT</code>, and{" "}
        <code>NEXT_PUBLIC_VAPID_PUBLIC_KEY</code>.
      </p>
    );
  }

  const dot =
    status === "on" ? "bg-green-500" : status === "denied" ? "bg-red-500" : "bg-yellow-500";
  const labels: Record<Status, string> = {
    loading: "Checking…",
    unsupported: "This browser doesn’t support notifications.",
    denied: "Notifications are blocked in your browser settings.",
    off: "Not enabled on this device.",
    on: "Enabled on this device.",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <span className={`inline-block h-2 w-2 rounded-full ${dot}`} aria-hidden />
        <span>{labels[status]}</span>
      </div>
      {status === "off" && (
        <button
          type="button"
          onClick={enable}
          disabled={busy}
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Enabling…" : "Enable phone notifications"}
        </button>
      )}
      {status === "on" && (
        <button
          type="button"
          onClick={disable}
          disabled={busy}
          className="rounded-lg border border-black/15 px-4 py-2 text-sm transition hover:bg-black/5 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/5"
        >
          {busy ? "…" : "Turn off on this device"}
        </button>
      )}
      <p className="text-xs text-black/40 dark:text-white/40">
        On iPhone, first add MyScheduler to your Home Screen (Share → Add to Home
        Screen), then enable here.
      </p>
    </div>
  );
}
