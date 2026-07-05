import { apiUrl } from "../config";

async function handleJsonResponse(res, fallbackMessage = "Request failed") {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || data.error || fallbackMessage);
  }

  return data;
}

function requireId(documentId, action = "document action") {
  if (!documentId) {
    throw new Error(`Missing document ID for ${action}`);
  }
}

async function authFetch(url, options = {}) {
  try {
    return await fetch(url, {
      credentials: "include",
      ...options,
    });
  } catch (err) {
    throw new Error("Network error. Please try again.");
  }
}

export async function fetchDocuments() {
  const res = await authFetch(apiUrl("/api/document/my"));

  return handleJsonResponse(res, "Failed to fetch upload history");
}

export async function uploadSingleDocument(file) {
  if (!file) throw new Error("No file provided for upload");

  const formData = new FormData();
  formData.append("file", file);

  const res = await authFetch(apiUrl("/api/document/upload"), {
    method: "POST",
    body: formData,
  });

  // Keep raw Response so callers can inspect status (e.g. 409 duplicates)
  return res;
}

export async function uploadBatchDocuments(files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("No files provided for batch upload");
  }

  if (files.length > 10) {
    throw new Error("Maximum 10 files allowed per batch upload");
  }

  const formData = new FormData();
  files.slice(0, 10).forEach((file) => formData.append("files", file));

  const res = await authFetch(apiUrl("/api/document/upload/batch"), {
    method: "POST",
    body: formData,
  });

  // Keep raw Response so callers can inspect status (e.g. 409 duplicates)
  return res;
}

export async function deleteDocument(documentId) {
  requireId(documentId, "delete");

  const res = await authFetch(apiUrl(`/api/document/${documentId}`), {
    method: "DELETE",
  });

  return handleJsonResponse(res, "Delete failed");
}

export async function renameDocument(documentId, newName) {
  requireId(documentId, "rename");

  if (!newName || !String(newName).trim()) {
    throw new Error("New document name is required");
  }

  const trimmedName = String(newName).trim();

  const res = await authFetch(apiUrl(`/api/document/${documentId}`), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: trimmedName }),
  });

  return handleJsonResponse(res, "Rename failed");
}

export async function pinDocument(documentId) {
  requireId(documentId, "pin");

  const res = await authFetch(apiUrl(`/api/document/${documentId}/pin`), {
    method: "POST",
  });

  return handleJsonResponse(res, "Pin failed");
}

export async function unpinDocument(documentId) {
  requireId(documentId, "unpin");

  const res = await authFetch(apiUrl(`/api/document/${documentId}/unpin`), {
    method: "POST",
  });

  return handleJsonResponse(res, "Unpin failed");
}

export async function downloadDocument(documentId) {
  requireId(documentId, "download");

  const res = await authFetch(apiUrl(`/api/document/${documentId}/download`));

  if (!res.ok) {
    let errorMessage = "Failed to download document";
    try {
      const data = await res.json();
      errorMessage = data.message || data.error || errorMessage;
    } catch {
      // ignore JSON parse failure and keep fallback message
    }
    throw new Error(errorMessage);
  }

  return res;
}

export function getPythonPreviewUrl(id) {
  if (!id) throw new Error("Missing document preview ID");
  return `/api/document/preview/${id}.pdf`;
}