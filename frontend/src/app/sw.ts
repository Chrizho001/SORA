/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) => /\/api\/v1\//.test(url.pathname),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();

// Push notification listener (FE-01, FE-14)
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    const title = payload.title || "SORA Study Assistant";
    const options: NotificationOptions = {
      body: payload.body || "",
      data: payload.data || {},
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("Error displaying push notification:", err);
  }
});

// Notification click listener (FE-01, FE-14)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = (event.notification.data || {}) as {
    document_id?: string;
    quiz_session_id?: string;
    task_id?: string;
  };

  let targetUrl = "/dashboard/notifications";
  if (data.document_id) {
    targetUrl = "/dashboard/documents";
  } else if (data.quiz_session_id) {
    targetUrl = `/dashboard/quizzes/${data.quiz_session_id}`;
  } else if (data.task_id) {
    targetUrl = "/dashboard/tasks";
  }

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            await client.navigate(targetUrl);
          }
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
