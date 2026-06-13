import { apiUrl } from "../config";

async function parseResponse(res, fallbackMessage) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || fallbackMessage);
  }
  return data;
}

export async function updateProfile(payload) {
  const res = await fetch(apiUrl("/api/auth/me"), {
    method: "PUT",
    credentials: "include",
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

  const res = await fetch(apiUrl("/api/auth/me/avatar"), {
    method: "POST",
    credentials: "include",
    body: form,
  });

  const data = await parseResponse(res, "Failed to upload avatar");
  return { avatar: data.avatar };
}

export async function clearChatHistory() {
  const res = await fetch(apiUrl("/api/chat"), {
    method: "DELETE",
    credentials: "include",
  });

  return parseResponse(res, "Failed to clear chat history");
}

export async function deleteAccount() {
  const res = await fetch(apiUrl("/api/auth/me"), {
    method: "DELETE",
    credentials: "include",
  });

  return parseResponse(res, "Failed to delete account");
}

export async function logoutAllDevices() {
  const res = await fetch(apiUrl("/api/auth/logout-all"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  return parseResponse(res, "Failed to log out from all devices");
}