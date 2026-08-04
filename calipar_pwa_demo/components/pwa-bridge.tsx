"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icon";

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }

  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  }
}

export function PwaBridge() {
  const [offline, setOffline] = useState(
    () => typeof navigator !== "undefined" && !navigator.onLine,
  );
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const online = () => setOffline(false);
    const offlineEvent = () => setOffline(true);
    const beforeInstall = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener("online", online);
    window.addEventListener("offline", offlineEvent);
    window.addEventListener("beforeinstallprompt", beforeInstall);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((registration) => {
        if (registration.waiting) setWaitingWorker(registration.waiting);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              setWaitingWorker(worker);
            }
          });
        });
      });
    }

    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offlineEvent);
      window.removeEventListener("beforeinstallprompt", beforeInstall);
    };
  }, []);

  const activateUpdate = useCallback(() => {
    if (!waitingWorker) return;
    navigator.serviceWorker.addEventListener("controllerchange", () => location.reload(), {
      once: true,
    });
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }, [waitingWorker]);

  const install = useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }, [installPrompt]);

  return (
    <>
      {offline ? (
        <div className="connection-banner" data-testid="offline-banner" role="status">
          <Icon name="warning" />
          <span>
            <strong>Working offline.</strong> Local edits are available; Mission-Bot will
            reconnect later.
          </span>
        </div>
      ) : null}
      {waitingWorker ? (
        <div className="update-banner" role="status">
          <span>A polished CALIPAR update is ready.</span>
          <button type="button" onClick={activateUpdate}>
            Update now
          </button>
          <button
            aria-label="Dismiss update notice"
            className="icon-button"
            type="button"
            onClick={() => setWaitingWorker(null)}
          >
            <Icon name="close" />
          </button>
        </div>
      ) : null}
      {installPrompt ? (
        <button className="install-pill" type="button" onClick={install}>
          <Icon name="download" />
          Install CALIPAR
        </button>
      ) : null}
    </>
  );
}
