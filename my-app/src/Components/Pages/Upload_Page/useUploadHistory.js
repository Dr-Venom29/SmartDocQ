import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteDocument,
  downloadDocument,
  fetchDocuments,
  getPythonPreviewUrl,
  pinDocument,
  renameDocument,
  unpinDocument,
} from "../../../Services/DocumentService";
import { apiFetch } from "../../../config";
import { fetchChatHistory } from "../../../Services/ChatService";
import { validateFilename } from "./fileHelpers";
import { mapDocumentFromApi } from "./documentMappers";

function resolveDocId(doc) {
  return doc?.documentId || doc?._id || doc?.id || null;
}

export default function useUploadHistory(showToast, setters) {
  const {
    setCurrentDoc,
    setUploaded,
    selectFile,
    setChat,
    setIsPreviewOpen,
  } = setters;

  const [history, setHistory] = useState([]);
  const latestSelectionRef = useRef(0);

  const fetchHistory = useCallback(async () => {
    try {
      const docs = await fetchDocuments();
      setHistory(docs.map(mapDocumentFromApi));
    } catch (err) {
      showToast?.(err.message, { type: "error" });
    }
  }, [showToast]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const removeHistoryItem = async (id, currentDoc) => {
    try {
      await deleteDocument(id);

      const currentDocId = resolveDocId(currentDoc);
      if (currentDocId && currentDocId === id) {
        setChat([]);
        setCurrentDoc(null);
        setUploaded(false);
        setIsPreviewOpen(false);
      }

      showToast?.("Document deleted successfully", { type: "success" });
      fetchHistory();
    } catch (err) {
      showToast?.(err.message, { type: "error" });
    }
  };

  const renameHistoryItem = async (id, newName) => {
    try {
      if (!validateFilename(newName)) {
        showToast?.("Invalid filename.", { type: "error" });
        return;
      }

      await renameDocument(id, newName);

      showToast?.(`Renamed to "${newName}"`, { type: "success" });
      fetchHistory();
    } catch (err) {
      showToast?.(err.message, { type: "error" });
    }
  };

  const handlePinToggle = async (id) => {
    try {
      const item = history.find((h) => h.id === id);
      if (!item) return;
      const docId = resolveDocId(item);
      if (!docId) {
        showToast?.("Invalid document ID for pin", { type: "error" });
        return;
      }

      if (item.pinned) {
        await unpinDocument(docId);
      } else {
        await pinDocument(docId);
      }

      setHistory((prev) =>
        prev.map((x) =>
          x.id === id
            ? { ...x, pinned: !x.pinned, pinnedAt: !x.pinned ? new Date().toISOString() : null }
            : x
        )
      );

      fetchHistory();
    } catch (e) {
      showToast?.(e.message || "Failed to toggle pin", { type: "error" });
    }
  };

  const selectHistoryItem = async (item) => {
    try {
      const selectionId = ++latestSelectionRef.current;
      const resolvedId = resolveDocId(item);
      if (!resolvedId) {
        showToast?.("Missing document ID for selection", { type: "error" });
        return;
      }

      setCurrentDoc(item);
      setUploaded(true);
      setIsPreviewOpen(true);
      selectFile({ name: item.name, type: "loading" });

      const isOriginallyWord =
        item.originalType === "application/msword" ||
        item.originalType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      const isConvertedToPdf = isOriginallyWord && item.type === "application/pdf";

      if (isConvertedToPdf || item.type === "application/pdf") {
        const downloadRes = await downloadDocument(resolvedId);
        if (!downloadRes.ok) throw new Error("Failed to load PDF");

        const blob = await downloadRes.blob();
        if (latestSelectionRef.current !== selectionId) return;
        const f = new File([blob], item.name || "document.pdf", {
          type: "application/pdf",
        });
        selectFile(f);

        if (isConvertedToPdf) {
          showToast?.(`Showing converted PDF: ${item.name}`, { type: "info" });
        }
      } else {
        const isWord =
          item.type === "application/msword" ||
          item.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          /\.(docx?|DOCX?)$/.test(item.name || "");

        if (isWord) {
          try {
            const previewUrl = getPythonPreviewUrl(resolvedId);
            const previewRes = await apiFetch(previewUrl);

            if (previewRes.ok) {
              const blob = await previewRes.blob();
              if (latestSelectionRef.current !== selectionId) return;
              const f = new File([blob], item.name || "document.pdf", {
                type: "application/pdf",
              });
              selectFile(f);
            } else {
              throw new Error("Preview not available");
            }
          } catch {
            const res = await downloadDocument(resolvedId);
            if (!res.ok) throw new Error("Failed to download document");

            const blob = await res.blob();
            if (latestSelectionRef.current !== selectionId) return;
            const f = new File([blob], item.name || "document", {
              type: item.type || blob.type || "application/octet-stream",
            });

            selectFile(f);
          }
        } else {
          const res = await downloadDocument(resolvedId);
          if (!res.ok) throw new Error("Failed to download document");

          const blob = await res.blob();
          if (latestSelectionRef.current !== selectionId) return;
          const f = new File([blob], item.name || "document", {
            type: item.type || blob.type || "application/octet-stream",
          });

          selectFile(f);
        }
      }

      showToast?.(`Opened ${item.name || "document"}`, { type: "info" });

      try {
        const data = await fetchChatHistory(resolvedId);
        if (latestSelectionRef.current !== selectionId) return;
        setChat(Array.isArray(data.messages) ? data.messages : []);
      } catch {
        setChat([]);
      }
    } catch (err) {
      showToast?.(err.message, { type: "error" });
    }
  };

  return {
    history,
    setHistory,
    fetchHistory,
    removeHistoryItem,
    renameHistoryItem,
    handlePinToggle,
    selectHistoryItem,
  };
}