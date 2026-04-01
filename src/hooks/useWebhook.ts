import { useState } from "react";
import { toast } from "sonner";

const WEBHOOK_STORAGE_KEY = "cs-dash-webhook-url";

export function useWebhookUrl() {
  const [url, setUrl] = useState(() => localStorage.getItem(WEBHOOK_STORAGE_KEY) || "");

  const save = (newUrl: string) => {
    localStorage.setItem(WEBHOOK_STORAGE_KEY, newUrl);
    setUrl(newUrl);
  };

  return { url, save };
}

export async function sendToWebhook(type: string, payload: Record<string, unknown>) {
  const url = localStorage.getItem(WEBHOOK_STORAGE_KEY);
  if (!url) return; // silently skip if no webhook configured

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, timestamp: new Date().toISOString(), data: payload }),
    });
  } catch (err) {
    console.warn("Webhook send failed:", err);
    toast.error("Falha ao enviar para webhook");
  }
}
