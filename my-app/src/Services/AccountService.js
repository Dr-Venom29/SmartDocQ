import { apiFetch } from "../config";

async function parseResponse(res, fallbackMessage) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || fallbackMessage);
  }
  return data;
}

export async function updateProfile(payload) {
  const res = await apiFetch("/api/auth/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await parseResponse(res, "Failed to update profile");
  return data.user;
}

export async function uploadAvatar(file) {
  if (!file) throw new Error("No avatar file provided");

  const form = new FormData();
  form.append("avatar", file, file.name || "avatar.jpg");

  const res = await apiFetch("/api/auth/me/avatar", {
    method: "POST",
    body: form,
  });

  const data = await parseResponse(res, "Failed to upload avatar");
  return { avatar: data.avatar };
}

export async function clearChatHistory() {
  const res = await apiFetch("/api/chat", {
    method: "DELETE",
  });

  return parseResponse(res, "Failed to clear chat history");
}

export async function deleteAccount() {
  const res = await apiFetch("/api/auth/me", {
    method: "DELETE",
  });

  return parseResponse(res, "Failed to delete account");
}

export async function logoutAllDevices() {
  const res = await apiFetch("/api/auth/logout-all", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  return parseResponse(res, "Failed to log out from all devices");
}