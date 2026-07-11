import React, { useState, useEffect } from "react";
import { apiFetch } from "../config";
import "./SpreadsheetPreview.css";

const formatCellValue = (val) => {
  if (val === null || val === undefined) return "";
  const strVal = String(val).trim();
  // Check for YYYY-MM-DD HH:MM:SS or YYYY-MM-DDTHH:MM:SS or YYYY-MM-DD
  const dateTimeRegex = /^(\d{4})-(\d{2})-(\d{2})(?:\s|T)(\d{2}):(\d{2}):(\d{2})$/;
  const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;

  let match = strVal.match(dateTimeRegex) || strVal.match(dateRegex);
  if (match) {
    const year = match[1];
    const monthIndex = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${day} ${months[monthIndex]} ${year}`;
    }
  }
  return strVal;
};

const SpreadsheetPreview = ({ documentId, fileType }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [workbook, setWorkbook] = useState(null);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);

  useEffect(() => {
    if (!documentId) {
      setWorkbook(null);
      setError("");
      return;
    }

    const controller = new AbortController();
    const fetchSpreadsheetPreview = async () => {
      setLoading(true);
      setError("");
      setWorkbook(null);
      try {
        const res = await apiFetch(`/api/document/${documentId}/preview/spreadsheet`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Failed to load spreadsheet preview");
        }

        const data = await res.json();
        setWorkbook(data);
        setSelectedSheetIndex(0);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Error fetching spreadsheet preview:", err);
        setError(err.message || "Unable to preview spreadsheet");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchSpreadsheetPreview();

    return () => {
      controller.abort();
    };
  }, [documentId]);

  if (loading) {
    return (
      <div className="spreadsheet-loading" aria-live="polite">
        <div className="spinner"></div>
        <p>Loading spreadsheet preview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="spreadsheet-error" role="alert">
        <p className="spreadsheet-error-title">Unable to preview spreadsheet</p>
        <p className="spreadsheet-error-subtitle">{error}</p>
        <p className="spreadsheet-error-subtitle" style={{ marginTop: 8 }}>
          Download the file to view the full document.
        </p>
      </div>
    );
  }

  if (!workbook || !workbook.sheets || workbook.sheets.length === 0) {
    return (
      <div className="spreadsheet-empty">
        <p className="spreadsheet-empty-title">No spreadsheet data available</p>
      </div>
    );
  }

  const activeSheet = workbook.sheets[selectedSheetIndex];

  return (
    <div className="spreadsheet-preview">
      {workbook.sheets.length > 1 && (
        <div className="sheet-tabs" role="tablist" aria-label="Spreadsheet sheets">
          {workbook.sheets.map((sheet, index) => (
            <button
              key={index}
              role="tab"
              aria-selected={selectedSheetIndex === index}
              className={`sheet-tab-button ${selectedSheetIndex === index ? "active" : ""}`}
              onClick={() => setSelectedSheetIndex(index)}
              title={sheet.name}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}

      {(!activeSheet || (activeSheet.rows.length === 0 && activeSheet.headers.length === 0)) ? (
        <div className="spreadsheet-empty">
          <p className="spreadsheet-empty-title">No spreadsheet data available</p>
        </div>
      ) : (
        <>
          <div className="grid-container">
            <table className="spreadsheet-table">
              <thead>
                <tr>
                  <th className="row-index-header" aria-label="Row number"></th>
                  {activeSheet.headers.map((header, idx) => (
                    <th key={idx} title={header}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeSheet.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <td className="row-index-cell">{rowIndex + 1}</td>
                    {row.map((cell, colIndex) => {
                      const formatted = formatCellValue(cell);
                      return (
                        <td key={colIndex} title={formatted}>
                          {formatted}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="spreadsheet-footer">
            <span>
              {workbook.type === "xlsx" ? `${activeSheet.name} · ` : ""}
              {activeSheet.truncated
                ? `Showing ${activeSheet.rows.length} of ${activeSheet.rowCount} rows`
                : `${activeSheet.rowCount} rows`}{" "}
              · {activeSheet.columnCount} columns
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default SpreadsheetPreview;
