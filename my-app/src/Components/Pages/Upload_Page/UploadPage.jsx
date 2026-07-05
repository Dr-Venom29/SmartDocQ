import React, { useState } from "react";
import "./UploadPage.css";
import { useToast } from "../../ToastContext";
import { MAX_UPLOAD_SIZE_MB } from "../../../config";

import History from "../../History";
import Preview from "../../Preview";
import Chat from "../../Chat";

import useUploadUIState from "./useUploadUIState";
import useUploadSelection from "./useUploadSelection";
import useUploadHistory from "./useUploadHistory";
import useUploadChat from "./useUploadChat";

import {
  uploadBatchDocuments,
  uploadSingleDocument,
  downloadDocument,
} from "../../../Services/DocumentService";

import { buildCurrentDocFromUpload } from "./documentMappers";
import { formatBytes } from "./fileHelpers";

function resolveDocId(doc) {
  return doc?.documentId || doc?._id || doc?.id || null;
}

const UploadPage = () => {
  const { showToast } = useToast();
  const [currentDoc, setCurrentDoc] = useState(null);
  const [, setUploaded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const {
    isHistoryOpen,
    setIsHistoryOpen,
    isPreviewOpen,
    setIsPreviewOpen,
    previewWidth,
    setPreviewWidth,
    lastPreviewWidth,
    setLastPreviewWidth,
  } = useUploadUIState();

  const {
    file,
    files,
    fileUrl,
    isOverDrop,
    fileInputRef,
    handleFileChange,
    clearSelectedFiles,
    removeSelectedFile,
    onDragOver,
    onDragLeave,
    onDrop,
    selectFile,
  } = useUploadSelection(showToast);

  const {
    chat,
    setChat,
    chatInput,
    setChatInput,
    isTyping,
    sendMessageHandler,
    clearChat,
    summarizeSelectionHandler,
  } = useUploadChat(showToast, currentDoc);

  const {
    history,
    fetchHistory,
    removeHistoryItem,
    renameHistoryItem,
    handlePinToggle,
    selectHistoryItem,
  } = useUploadHistory(showToast, {
    setCurrentDoc,
    setUploaded,
    selectFile,
    setChat,
    setIsPreviewOpen,
  });

  const hasActiveDocument = !!currentDoc;

  const handleUpload = async () => {
    const selected = files.length ? files : file ? [file] : [];

    if (!selected.length) {
      showToast?.("Please select file(s) first", { type: "warning" });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const useBatch = selected.length > 1;
    const start = Date.now();

    const interval = setInterval(() => {
      setUploadProgress((p) => {
        const elapsed = Date.now() - start;
        return Math.min(95, p + Math.max(1, Math.floor(elapsed / 500)));
      });
    }, 200);

    try {
      const res = useBatch
        ? await uploadBatchDocuments(selected)
        : await uploadSingleDocument(selected[0]);

      const data = await res.json();

      if (res.status === 409 && data.duplicate) {
        let message = data.message || "This file is already being processed.";
        if (data.existingName && data.processingTimeMinutes !== undefined) {
          message = `"${data.existingName}" is ${data.status} (${data.processingTimeMinutes} min). Please wait.`;
        }

        showToast?.(message, { type: "warning" });

        if (data.existingDocumentId && data.existingDocId) {
          setCurrentDoc({
            id: data.existingDocId,
            name: data.existingName,
            documentId: data.existingDocumentId,
            processingStatus: data.status,
          });
          await fetchHistory();
        }

        return;
      }

      if (!res.ok) throw new Error(data.message || "Upload failed");

      setUploadProgress(100);

      if (useBatch) {
        const count = Array.isArray(data.items) ? data.items.length : selected.length;
        const convertedCount = Array.isArray(data.items)
          ? data.items.filter((item) => item.converted).length
          : 0;

        let message = `Uploaded ${count} file(s)`;
        if (convertedCount > 0) {
          message += ` (${convertedCount} Word document${convertedCount > 1 ? "s" : ""} converted to PDF)`;
        }

        showToast?.(message, { type: "success" });
      } else {
        const f0 = selected[0];
        let message = `Uploaded ${f0.name}`;
        if (data.converted) message += " (converted to PDF)";

        showToast?.(message, { type: "success" });

        const currentDocData = buildCurrentDocFromUpload(f0, data);
        setCurrentDoc(currentDocData);
        setUploaded(true);

        if (data.converted) {
          try {
            const uploadedDocId = resolveDocId(data) || resolveDocId(currentDocData);
            if (!uploadedDocId) {
              throw new Error("Missing document ID for converted PDF");
            }

            const downloadRes = await downloadDocument(uploadedDocId);
            const blob = await downloadRes.blob();
            const previewFile = new File([blob], currentDocData.name || "document.pdf", {
              type: "application/pdf",
            });
            selectFile(previewFile);
            setIsPreviewOpen(true);
            showToast?.(`Displaying converted PDF: ${currentDocData.name}`, { type: "info" });
          } catch (err) {
            if (process.env.NODE_ENV !== "production") {
              console.error("Error loading converted PDF:", err);
            }
          }
        }
      }

      clearSelectedFiles();
      await fetchHistory();
    } catch (err) {
      showToast?.(err.message, { type: "error" });
    } finally {
      clearInterval(interval);
      setIsUploading(false);
    }
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (ext === 'pdf') {
      return (
        <div className="file-icon-wrapper-type pdf-type">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z" />
            <path d="M14 2v6h6" />
            <line x1="8" y1="10" x2="14" y2="10" strokeWidth="1.5" />
            <line x1="8" y1="13" x2="16" y2="13" strokeWidth="1.5" />
            <line x1="8" y1="16" x2="12" y2="16" strokeWidth="1.5" />
          </svg>
        </div>
      );
    }
    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
      return (
        <div className="file-icon-wrapper-type excel-type">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z" />
            <path d="M14 2v6h6" />
            <rect x="7" y="11" width="10" height="7" rx="1" strokeWidth="1.5" />
            <line x1="12" y1="11" x2="12" y2="18" strokeWidth="1" />
            <line x1="7" y1="14" x2="17" y2="14" strokeWidth="1" />
          </svg>
        </div>
      );
    }
    if (ext === 'doc' || ext === 'docx') {
      return (
        <div className="file-icon-wrapper-type doc-type">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z" />
            <path d="M14 2v6h6" />
            <line x1="8" y1="12" x2="16" y2="12" strokeWidth="1.5" />
            <line x1="8" y1="15" x2="14" y2="15" strokeWidth="1.5" />
          </svg>
        </div>
      );
    }
    if (ext === 'txt') {
      return (
        <div className="file-icon-wrapper-type generic-type">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z" />
            <path d="M14 2v6h6" />
            <line x1="8" y1="10" x2="14" y2="10" strokeWidth="1.5" />
            <line x1="8" y1="13" x2="16" y2="13" strokeWidth="1.5" />
            <line x1="8" y1="16" x2="12" y2="16" strokeWidth="1.5" />
          </svg>
        </div>
      );
    }
    // Default text/generic type
    return (
      <div className="file-icon-wrapper-type generic-type">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z" />
          <path d="M14 2v6h6" />
        </svg>
      </div>
    );
  };

  return (
    <div className={`upload-container-dark ${hasActiveDocument ? "three-cols" : "two-cols"}`}>
      <History
        history={history}
        isOpen={isHistoryOpen}
        onToggle={() => setIsHistoryOpen(!isHistoryOpen)}
        onSelect={selectHistoryItem}
        onRemove={(id) => removeHistoryItem(id, currentDoc)}
        onRename={renameHistoryItem}
        onPinToggle={handlePinToggle}
        formatBytes={formatBytes}
      />

      <div className={`right-section ${isHistoryOpen ? "" : "full-width"}`}>
        {!hasActiveDocument ? (
          <div className="upload-section">
            <h1 className="upload-title">UPLOAD YOUR <span className="title-accent">DOCUMENT</span></h1>

            <div
              className={`upload-box ${isOverDrop ? "drag-over" : ""}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              {files.length === 0 ? (
                <>
                  <div className="upload-icon-container">
                    <div className="upload-icon-circle">
                      <svg className="upload-doc-svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <polyline points="9 15 12 12 15 15" />
                      </svg>
                    </div>
                  </div>
                  
                  <h3 className="upload-prompt">Click or drag files to this area to upload</h3>
                  <p className="upload-warning">
                    Support for single or bulk upload of document files. Sensitive data is scanned and flagged automatically.
                  </p>
                  
                  <div className="upload-badges-row">
                    <span className="file-badge">PDF</span>
                    <span className="file-badge">DOCX</span>
                    <span className="file-badge">TXT</span>
                    <span className="file-badge">CSV</span>
                    <span className="file-badge">XLSX</span>
                  </div>
                  
                  <div className="file-input-wrapper-premium">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,.csv,.xlsx"
                      onChange={handleFileChange}
                      className="file-input-premium"
                      id="file-upload"
                      ref={fileInputRef}
                    />
                    <label htmlFor="file-upload" className="choose-files-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      CHOOSE FILES
                    </label>
                  </div>
                  
                  <p className="max-size-hint">MAXIMUM FILE SIZE: {MAX_UPLOAD_SIZE_MB}MB</p>
                </>
              ) : (
                <>
                  <div className="upload-selected-container">
                    <h3 className="selected-title">Selected Document{files.length > 1 ? "s" : ""}</h3>
                    
                    {files.length === 1 ? (
                      <div className="file-info-simple-premium">
                        {getFileIcon(files[0].name)}
                        <span className="file-name-premium">{files[0].name}</span>
                        <span className="file-size-premium">{formatBytes(files[0].size)}</span>
                        <button
                          type="button"
                          className="remove-file-premium"
                          aria-label="Remove selected file"
                          onClick={clearSelectedFiles}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="file-list-wrapper-premium">
                        <div className="file-list-premium">
                          {files.map((f) => {
                            const key = `${f.name}|${f.size}|${f.lastModified}`;
                            return (
                              <div className="file-chip-premium" key={key} title={f.name}>
                                {getFileIcon(f.name)}
                                <span className="chip-name-premium">{f.name}</span>
                                <span className="chip-size-premium">{formatBytes(f.size)}</span>
                                <button
                                  type="button"
                                  className="chip-remove-premium"
                                  aria-label={`Remove ${f.name}`}
                                  onClick={() => removeSelectedFile(key)}
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        <div className="file-summary-premium">
                          <span>{files.length} files selected • {formatBytes(files.reduce((s, f) => s + f.size, 0))}</span>
                          <button
                            type="button"
                            className="file-summary-clear-premium"
                            onClick={clearSelectedFiles}
                            aria-label="Clear all files"
                          >
                            Clear all
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className="upload-actions-premium">
                      <button
                        className="upload-button-premium"
                        onClick={handleUpload}
                        disabled={isUploading}
                      >
                        {isUploading ? "UPLOADING..." : files.length > 1 ? "UPLOAD ALL" : "UPLOAD"}
                      </button>
                      
                      {!isUploading && (
                        <div className="add-more-wrapper">
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.txt,.csv,.xlsx"
                            onChange={handleFileChange}
                            className="file-input-premium"
                            id="file-upload-more"
                            ref={fileInputRef}
                          />
                          <label htmlFor="file-upload-more" className="add-more-label">
                            + Add More Files
                          </label>
                        </div>
                      )}
                    </div>
                    
                    {isUploading && (
                      <div className="progress-container-premium">
                        <progress
                          className="progress-native-premium"
                          max={100}
                          value={Math.max(0, Math.min(100, uploadProgress))}
                        />
                        <div className="progress-label-premium">{uploadProgress}%</div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="upload-features-grid">
              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </div>
                <div className="feature-info">
                  <h3>AI STUDY ASSISTANT</h3>
                  <p>Ask questions, generate quizzes, create flashcards, and summarize any document instantly.</p>
                </div>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div className="feature-info">
                  <h3>SECURE PROCESSING</h3>
                  <p>Your documents are processed securely and handled with privacy in mind.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="three-cols-container">
            <Preview
              file={file}
              fileUrl={fileUrl}
              isOpen={isPreviewOpen}
              previewWidth={previewWidth}
              lastPreviewWidth={lastPreviewWidth}
              setPreviewWidth={setPreviewWidth}
              setLastPreviewWidth={setLastPreviewWidth}
              setIsPreviewOpen={setIsPreviewOpen}
              documentId={resolveDocId(currentDoc)}
              filename={currentDoc?.name}
              onTextSaved={fetchHistory}
              onSummarizeSelection={summarizeSelectionHandler}
            />

            <Chat
              chat={chat}
              setChat={setChat}
              chatInput={chatInput}
              setChatInput={setChatInput}
              sendMessage={sendMessageHandler}
              clearChat={clearChat}
              isTyping={isTyping}
              documentId={resolveDocId(currentDoc)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadPage;