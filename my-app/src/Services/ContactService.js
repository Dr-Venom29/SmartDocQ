import { apiFetch } from "../config";

export async function submitContactForm(payload, signal) {
  // Basic payload validation to guard against accidental bad calls
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid contact form payload");
  }

  const subject =
    typeof payload.subject === "string" ? payload.subject.trim() : "";

  const message =
    typeof payload.message === "string" ? payload.message.trim() : "";

  if (!subject || !message) {
    throw new Error("Subject and message are required");
  }

  let res;
  try {
    res = await apiFetch("/api/contact/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ subject, message }),
      signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new Error("Network error. Please try again.");
  }

  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {}

  if (!res.ok) {
    let msg = data?.message;

    if (!msg) {
      if (res.status === 401) {
        msg = "Session expired. Please log in again.";
      } else if (res.status === 429) {
        msg = "Too many requests. Please try again later.";
      } else if (res.status >= 500) {
        msg = "Server error. Please try again later.";
      } else {
        msg = "Failed to send message";
      }
    }

    throw new Error(msg);
  }

  return data;
}