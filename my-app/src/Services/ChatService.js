import { apiFetch } from "../config";

function requireId(docId, action = "chat action") {
  if (!docId) {
    throw new Error(`Missing document ID for ${action}`);
  }
}

async function authFetch(url, options = {}) {
  return apiFetch(url, options);
}

async function handleJsonResponse(res, fallbackMessage = "Chat request failed") {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || data.error || fallbackMessage);
  }

  return data;
}

export async function fetchChatHistory(docId) {
  requireId(docId, "fetch chat history");

  const res = await authFetch(`/api/chat/${docId}`);
  return handleJsonResponse(res, "Failed to fetch chat history");
}

export async function sendChatMessage(docId, text) {
  requireId(docId, "send chat message");

  if (!text || !String(text).trim()) {
    throw new Error("Chat message cannot be empty");
  }

  const res = await authFetch(`/api/chat/${docId}/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: String(text).trim() }),
  });

  return handleJsonResponse(res, "Failed to send chat message");
}

export async function deleteChatHistory(docId) {
  requireId(docId, "delete chat history");

  const res = await authFetch(`/api/chat/${docId}`, {
    method: "DELETE",
  });

  return handleJsonResponse(res, "Failed to delete chat history");
}

export async function appendChatMessages(docId, messages) {
  requireId(docId, "append chat messages");

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("Messages array is required");
  }

  const res = await authFetch(`/api/chat/${docId}/append`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages }),
  });

  return handleJsonResponse(res, "Failed to append chat messages");
}