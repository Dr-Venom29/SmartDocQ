import { useEffect, useRef, useState } from "react";
import { MAX_UPLOAD_SIZE_MB } from "../../../config";
import {
  buildFileKey,
  SUPPORTED_FILE_TYPES,
  validateFiles,
} from "./fileHelpers";

export default function useUploadSelection(showToast) {
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [fileUrl, setFileUrl] = useState("");

  const [isOverDrop, setIsOverDrop] = useState(false);
  const fileInputRef = useRef(null);
  const managedObjectUrlRef = useRef("");

  const selectFile = (nextFile) => {
    if (managedObjectUrlRef.current) {
      try {
        if (managedObjectUrlRef.current.startsWith("blob:")) {
          URL.revokeObjectURL(managedObjectUrlRef.current);
        }
      } catch {
        // ignore revoke errors
      }
      managedObjectUrlRef.current = "";
    }

    let nextUrl = "";
    if (
      nextFile &&
      typeof File !== "undefined" &&
      nextFile instanceof File
    ) {
      try {
        nextUrl = URL.createObjectURL(nextFile);
        managedObjectUrlRef.current = nextUrl;
      } catch {
        // ignore createObjectURL errors
      }
    }

    setFile(nextFile || null);
    setFileUrl(nextUrl);
  };

  const validateAndSetFiles = (incoming) => {
    const { accepted, rejected } = validateFiles(incoming, SUPPORTED_FILE_TYPES, MAX_UPLOAD_SIZE_MB);

    if (rejected.length) {
      showToast?.(
        `Some files were skipped: ${rejected.slice(0, 3).join("; ")}${rejected.length > 3 ? "…" : ""}`,
        { type: "warning" }
      );
    }

    if (!accepted.length) return;

    setFiles((prev) => {
      const combo = [...prev, ...accepted];
      const seen = new Set();
      const uniq = [];

      for (const f of combo) {
        const key = buildFileKey(f);
        if (!seen.has(key)) {
          seen.add(key);
          uniq.push(f);
        }
      }

      return uniq;
    });
  };

  const handleFileChange = (e) => {
    const list = Array.from(e.target.files || []);
    if (!list.length) return;
    validateAndSetFiles(list);
  };

  const clearSelectedFiles = () => {
    setFiles([]);
    selectFile(null);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearFileSelection = () => {
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeSelectedFile = (targetKey) => {
    setFiles((prev) => {
      const next = prev.filter((f) => buildFileKey(f) !== targetKey);

      if (file && buildFileKey(file) === targetKey) {
        selectFile(next[0] || null);
      }

      return next;
    });
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsOverDrop(true);
  };

  const onDragLeave = () => {
    setIsOverDrop(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsOverDrop(false);
    const list = Array.from(e.dataTransfer.files || []);
    if (list.length) validateAndSetFiles(list);
  };

  useEffect(() => {
    if (!file && files.length > 0) {
      const first = files[0];
      if (
        first &&
        typeof File !== "undefined" &&
        first instanceof File
      ) {
        selectFile(first);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, files]);

  useEffect(() => {
    return () => {
      if (managedObjectUrlRef.current) {
        try {
          if (managedObjectUrlRef.current.startsWith("blob:")) {
            URL.revokeObjectURL(managedObjectUrlRef.current);
          }
        } catch {
          // ignore revoke errors
        }
        managedObjectUrlRef.current = "";
      }
    };
  }, []);

  return {
    file,
    files,
    fileUrl,
    isOverDrop,
    fileInputRef,
    handleFileChange,
    validateAndSetFiles,
    clearSelectedFiles,
    clearFileSelection,
    removeSelectedFile,
    onDragOver,
    onDragLeave,
    onDrop,
    selectFile,
  };
}