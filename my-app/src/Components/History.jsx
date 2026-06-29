import './History.css';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Lottie from "lottie-react";
import hd from "../Animations/H-D.json";
import dl from "../Animations/Bin.json";

// Define prop types for validation
const HistoryPropTypes = {
  history: (props) => {
    if (!Array.isArray(props.history)) {
      return new Error('History prop must be an array');
    }
    return null;
  },
  onToggle: (props) => {
    if (typeof props.onToggle !== 'function') {
      return new Error('onToggle must be a function');
    }
    return null;
  },
  onSelect: (props) => {
    if (typeof props.onSelect !== 'function') {
      return new Error('onSelect must be a function');
    }
    return null;
  },
  onRemove: (props) => {
    if (typeof props.onRemove !== 'function') {
      return new Error('onRemove must be a function');
    }
    return null;
  },
  onRename: (props) => {
    if (typeof props.onRename !== 'function') {
      return new Error('onRename must be a function');
    }
    return null;
  },
  onPinToggle: (props) => {
    if (typeof props.onPinToggle !== 'function') {
      return new Error('onPinToggle must be a function');
    }
    return null;
  },
  formatBytes: (props) => {
    if (typeof props.formatBytes !== 'function') {
      return new Error('formatBytes must be a function');
    }
    return null;
  }
};

const History = ({
  history = [],
  isOpen,
  onToggle,
  onSelect,
  onRemove,
  onRename,
  onPinToggle,
  formatBytes
}) => {
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [actionLock, setActionLock] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getFileIcon = useCallback((fileName) => {
    if (!fileName) return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z" />
        <path d="M14 2v6h6" />
      </svg>
    );
    const ext = fileName.split('.').pop().toLowerCase();
    if (ext === 'pdf') {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#f87171' }}>
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z" />
          <path d="M14 2v6h6" />
          <line x1="8" y1="10" x2="14" y2="10" strokeWidth="1.5" />
          <line x1="8" y1="13" x2="16" y2="13" strokeWidth="1.5" />
          <line x1="8" y1="16" x2="12" y2="16" strokeWidth="1.5" />
        </svg>
      );
    }
    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#4ade80' }}>
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z" />
          <path d="M14 2v6h6" />
          <rect x="7" y="11" width="10" height="7" rx="1" strokeWidth="1.5" />
          <line x1="12" y1="11" x2="12" y2="18" strokeWidth="1" />
          <line x1="7" y1="14" x2="17" y2="14" strokeWidth="1" />
        </svg>
      );
    }
    if (ext === 'doc' || ext === 'docx') {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#60a5fa' }}>
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z" />
          <path d="M14 2v6h6" />
          <line x1="8" y1="12" x2="16" y2="12" strokeWidth="1.5" />
          <line x1="8" y1="15" x2="14" y2="15" strokeWidth="1.5" />
        </svg>
      );
    }
    if (ext === 'txt') {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#a1a1aa' }}>
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z" />
          <path d="M14 2v6h6" />
          <line x1="8" y1="10" x2="14" y2="10" strokeWidth="1.5" />
          <line x1="8" y1="13" x2="16" y2="13" strokeWidth="1.5" />
          <line x1="8" y1="16" x2="12" y2="16" strokeWidth="1.5" />
        </svg>
      );
    }
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#a1a1aa' }}>
        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z" />
        <path d="M14 2v6h6" />
      </svg>
    );
  }, []);

  const formatFileType = useCallback((fileType, fileName) => {
    const name = fileName || '';
    const ext = name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return 'PDF';
    if (ext === 'xlsx' || ext === 'xls') return 'XLSX';
    if (ext === 'csv') return 'CSV';
    if (ext === 'doc' || ext === 'docx') return 'DOCX';
    if (ext === 'txt') return 'TXT';

    if (!fileType) return 'FILE';
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('sheet') || type.includes('excel') || type.includes('spreadsheet')) return 'XLSX';
    if (type.includes('csv')) return 'CSV';
    if (type.includes('word') || type.includes('document') || type.includes('docx')) return 'DOCX';
    if (type.includes('text') || type.includes('txt')) return 'TXT';
    return 'FILE';
  }, []);

  const filteredAndSortedHistory = useMemo(() => {
    let result = [...history];

    // Search filter
    if (searchTerm) {
      result = result.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sorting with pinned items on top
    result.sort((a, b) => {
      // Pinned items first
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'date':
          comparison =
            new Date(a.uploadedAt || a.uploadDate || 0) -
            new Date(b.uploadedAt || b.uploadDate || 0);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [history, searchTerm, sortBy, sortOrder]);

  const handleEditClick = useCallback((item, e) => {
    if (actionLock) return;
    e.stopPropagation();
    setEditingId(item.id);
    setNewName(item.name);
  }, [actionLock]);

  const handleSaveRename = useCallback((e) => {
    e.stopPropagation();
    if (newName.trim() !== '' && !actionLock) {
      setActionLock(true);
      Promise.resolve(onRename(editingId, newName.trim()))
        .then(() => {
          setEditingId(null);
          setNewName('');
        })
        .finally(() => setActionLock(false));
    }
  }, [newName, editingId, onRename, actionLock]);

  const handleCancelEdit = useCallback((e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (actionLock) return;
    setEditingId(null);
    setNewName('');
  }, [actionLock]);

  const handleSaveMouseDown = useCallback((e) => {
    e.preventDefault();
    handleSaveRename(e);
  }, [handleSaveRename]);

  const handleCancelMouseDown = useCallback((e) => {
    e.preventDefault();
    handleCancelEdit(e);
  }, [handleCancelEdit]);

  const handleInputBlur = useCallback(() => {
    if (actionLock) return;
    setEditingId(null);
    setNewName('');
  }, [actionLock]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleSaveRename(e);
    else if (e.key === 'Escape') handleCancelEdit(e);
  }, [handleSaveRename, handleCancelEdit]);

  const handleDeleteClick = useCallback((item, e) => {
    if (actionLock) return;
    e.stopPropagation();
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  }, [actionLock]);

  const confirmDelete = useCallback(() => {
    if (itemToDelete && !actionLock) {
      setActionLock(true);
      Promise.resolve(onRemove(itemToDelete.id))
        .then(() => {
          setShowDeleteConfirm(false);
          setItemToDelete(null);
        })
        .finally(() => setActionLock(false));
    }
  }, [itemToDelete, onRemove, actionLock]);

  const cancelDelete = useCallback(() => {
    if (actionLock) return;
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  }, [actionLock]);

  const toggleSortOrder = useCallback(() => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  }, [sortOrder]);

  const handlePinClick = useCallback((item, e) => {
    e.stopPropagation();
    if (actionLock) return;
    onPinToggle(item.id);
  }, [actionLock, onPinToggle]);

  return (
    <>
      <div className={`history-section ${isOpen ? "open" : "closed"}`}>
        <div className="history-header">
          <h2>Documents</h2>
          <button
            className="history-toggle"
            title={isOpen ? "Close sidebar (Ctrl+B)" : "Open sidebar (Ctrl+B)"}
            aria-label="Toggle history sidebar"
            onClick={onToggle}
            disabled={actionLock}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>

        {isOpen && (
          <div className="history-list-wrapper">
            <div className="history-controls">
              <div className="search-container">
                <div className="search-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                  disabled={actionLock}
                />
                {searchTerm && (
                  <button
                    className="clear-search"
                    onClick={() => setSearchTerm('')}
                    aria-label="Clear search"
                    disabled={actionLock}
                  >✕</button>
                )}
              </div>

              <div className="sort-container">
                <div className="custom-dropdown-container" ref={dropdownRef}>
                  <button
                    className="custom-dropdown-trigger"
                    onClick={() => !actionLock && setIsDropdownOpen(!isDropdownOpen)}
                    disabled={actionLock}
                    aria-label="Sort documents options dropdown"
                  >
                    <span>
                      {sortBy === 'name' ? 'Sort by Name' : sortBy === 'date' ? 'Sort by Date' : 'Sort by Size'}
                    </span>
                    <svg className={`chevron-icon ${isDropdownOpen ? 'open' : ''}`} width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1 1 5 5 9 1" />
                    </svg>
                  </button>
                  {isDropdownOpen && (
                    <ul className="custom-dropdown-options">
                      <li
                        className={`custom-dropdown-option ${sortBy === 'name' ? 'active' : ''}`}
                        onClick={() => { setSortBy('name'); setIsDropdownOpen(false); }}
                      >
                        Sort by Name
                      </li>
                      <li
                        className={`custom-dropdown-option ${sortBy === 'date' ? 'active' : ''}`}
                        onClick={() => { setSortBy('date'); setIsDropdownOpen(false); }}
                      >
                        Sort by Date
                      </li>
                      <li
                        className={`custom-dropdown-option ${sortBy === 'size' ? 'active' : ''}`}
                        onClick={() => { setSortBy('size'); setIsDropdownOpen(false); }}
                      >
                        Sort by Size
                      </li>
                    </ul>
                  )}
                </div>
                <button
                  className="sort-order"
                  onClick={toggleSortOrder}
                  title={sortOrder === 'asc' ? "Ascending" : "Descending"}
                  aria-label={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
                  disabled={actionLock}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>

            {filteredAndSortedHistory.length === 0 ? (
              <div className="history-empty-state">
                <Lottie id="ei" animationData={hd} loop={true}/>
                <p className="history-empty">
                  {searchTerm ? "No matching files found" : "No files uploaded yet"}
                </p>
                <p className="empty-subtitle" id="es">
                  {searchTerm ? "Try a different search term" : "Your uploaded files will appear here"}
                </p>
              </div>
            ) : (
              <ul className="history-list">
                {filteredAndSortedHistory.map((item) => (
                  <li
                    key={item.id}
                    className={`history-item ${item.pinned ? 'pinned-item' : ''}`}
                    onClick={() => !actionLock && onSelect(item)}
                  >
                    <div className="file-info">
                      <div className="file-icon">{getFileIcon(item.name)}</div>
                      <div className="file-size">{formatBytes(item.size)}</div>
                    </div>

                    <div className="item-details">
                      {editingId === item.id ? (
                        <div className="edit-mode">
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={handleInputBlur}
                            className="rename-input"
                            autoFocus
                            disabled={actionLock}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="edit-actions">
                            <button
                              className="save-btn"
                              onMouseDown={handleSaveMouseDown}
                              title="Save"
                              disabled={actionLock}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </button>
                            <button
                              className="cancel-btn"
                              onMouseDown={handleCancelMouseDown}
                              title="Cancel"
                              disabled={actionLock}
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="history-name">{item.name}</div>
                          <div className="file-type">{formatFileType(item.type, item.name)}</div>
                        </>
                      )}
                    </div>

                    <div className="item-actions">
                      {/* Pin/Unpin Button - Enhanced Styling */}
                      <button
                        className={`pin-button ${item.pinned ? 'pinned' : ''}`}
                        title={item.pinned ? "Remove bookmark" : "Bookmark document"}
                        aria-label={item.pinned ? "Remove bookmark" : "Bookmark document"}
                        onClick={(e) => handlePinClick(item, e)}
                        disabled={actionLock || editingId !== null}
                      >
                        <span className="pin-icon">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill={item.pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                          </svg>
                        </span>
                      </button>

                      <button
                        className="history-edit"
                        title="Rename document"
                        aria-label="Rename document"
                        onClick={(e) => handleEditClick(item, e)}
                        disabled={actionLock || editingId !== null}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>

                      <button
                        className="history-delete"
                        title="Remove from history"
                        aria-label="Remove from history"
                        onClick={(e) => handleDeleteClick(item, e)}
                        disabled={actionLock || editingId !== null}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {showDeleteConfirm && itemToDelete && (
        <div className="delete-confirm-overlay">
          <div className="delete-confirm-popup">
            <Lottie id="del" animationData={dl} loop={true}/>
            <p className="delete-confirm-message">
              Are you sure you want to delete "<span className="delete-filename">{itemToDelete.name}</span>"?
            </p>
            <div className="delete-confirm-actions">
              <button
                className="delete-cancel-btn"
                onClick={cancelDelete}
                disabled={actionLock}
              >Cancel</button>
              <button
                className="delete-confirm-btn"
                onClick={confirmDelete}
                disabled={actionLock}
              >
                {actionLock ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Add prop validation
History.propTypes = HistoryPropTypes;

export default History;