import { apiFetch } from "../config";

async function handleJsonResponse(res, fallbackMessage = "Summarization failed") {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || data.error || fallbackMessage);
  }

  return data;
}

export async function summarizeSelection(selectionText, docId = null) {
  if (!selectionText || !String(selectionText).trim()) {
    throw new Error("Selection text is required for summarization");
  }

  const res = await apiFetch("/api/document/summarize", {
    method: "POST",
    body: JSON.stringify({
      selectionText: String(selectionText).trim(),
      docId: docId || null,
    }),
  });

  return handleJsonResponse(res, "Failed to summarize selection");
}