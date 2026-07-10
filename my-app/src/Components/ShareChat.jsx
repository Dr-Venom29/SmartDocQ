import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import './Chat.css';
import { useToast } from './Toast/ToastContext';
import { exportSharedChat, getSharedChat } from '../Services/ServiceChat';
import DOMPurify from 'dompurify';

const formatToSafeHtml = (text) => {
  if (!text) return '';
  const normalized = String(text).replace(/\r\n/g, '\n');
  let html = normalized;
  html = html.replace(/\n\n+/g, '</p><p>');
  html = html.replace(/\n/g, '<br />');
  if (!html.includes('<p>')) html = `<p>${html}</p>`;

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br'],
    ALLOWED_ATTR: [],
  });
};

const ShareChat = () => {
  const { shareId } = useParams();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('Shared Chat');
  const [messages, setMessages] = useState([]);
  const [expiresAt, setExpiresAt] = useState(null);
  const [countdown, setCountdown] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const chatEndRef = useRef(null);
  const exportControllerRef = useRef(null);

  useEffect(() => {
    return () => {
      exportControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      try {
        setLoading(true);
        setError('');
        setIsExpired(false);
        setCountdown('');
        const json = await getSharedChat(shareId, { signal: controller.signal });
        setTitle(json.title || 'Shared Chat');
        setMessages(Array.isArray(json.messages) ? json.messages : []);
        setExpiresAt(json.expiresAt || null);
      } catch (e) {
        if (e?.name === 'AbortError') return;
        setError(e.message || 'Unable to load share');
      } finally {
        if (controller.signal.aborted) return;
        setLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [shareId]);

  // countdown timer
  useEffect(() => {
    if (!expiresAt) {
      setIsExpired(false);
      setCountdown('');
      return;
    }
    const end = new Date(expiresAt).getTime();
    if (Number.isNaN(end)) return;

    let intervalId;
    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, end - now);

      if (diff === 0) {
        setCountdown('00h 00m 00s');
        setIsExpired(true);
        setError((prev) => prev || 'This share has expired');
        if (intervalId) clearInterval(intervalId);
        return;
      }

      setIsExpired(false);
      const s = Math.floor(diff / 1000);
      const hh = String(Math.floor(s / 3600)).padStart(2, '0');
      const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      setCountdown(`${hh}h ${mm}m ${ss}s`);
    };
    tick();
    intervalId = setInterval(tick, 1000);
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [expiresAt]);

  const exportShared = async () => {
    try {
      if (isExpired) {
        showToast('This share has expired', { type: 'error' });
        return;
      }

      exportControllerRef.current?.abort();
      const controller = new AbortController();
      exportControllerRef.current = controller;

      const blob = await exportSharedChat(shareId, { signal: controller.signal });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'SharedChat.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      if (e?.name === 'AbortError') return;
      showToast(e?.message || 'Export failed', { type: 'error' });
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const copyToClipboard = (text) => {
    if (!text) return;
    if (isExpired) {
      showToast('This share has expired', { type: 'error' });
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      showToast('Message copied to clipboard', { type: 'success' });
    }).catch(() => {
      showToast('Failed to copy', { type: 'error' });
    });
  };

  const getMessageKey = (m, i) => {
    if (!m || typeof m !== 'object') return i;
    return m.id ?? m._id ?? m.timestamp ?? m.createdAt ?? i;
  };

  return (
    <div className="chat-section share-view">
      <div className="chat-header share-header">
        <div className="share-left">
          <h2 className="share-title">{title}</h2>
        </div>
        <div className="share-center">
          {expiresAt && !loading && isExpired ? (
            <div className="share-countdown">This share has expired</div>
          ) : expiresAt && !error ? (
            <div className="share-countdown">Expires in {countdown}</div>
          ) : null}
        </div>
        <div className="share-right">
          <button
            className="export-chat-button"
            onClick={exportShared}
            title="Export shared chat"
            aria-label="Export shared chat"
            disabled={loading || !!error || isExpired || messages.length === 0}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
        </div>
      </div>
      <div className="chat-list-wrapper">
        {loading ? (
          <div className="chat-empty-state"><p className="chat-empty">Loading…</p></div>
        ) : error ? (
          <div className="chat-empty-state"><p className="chat-empty">{error}</p></div>
        ) : messages.length === 0 ? (
          <div className="chat-empty-state"><p className="chat-empty">No messages</p></div>
        ) : (
          <ul className="chat-list" role="log" aria-live="polite" aria-relevant="additions text">
            {messages.map((m, i) => (
              <li key={getMessageKey(m, i)} className={`chat-item ${m.role}`}>
                <div className="chat-bubble">
                  <div
                    className="chat-message-content"
                    dangerouslySetInnerHTML={{ __html: formatToSafeHtml(m.text) }}
                  />
                </div>
                <div className="message-actions">
                  <button
                    className="copy-button"
                    onClick={() => copyToClipboard(m.text)}
                    title="Copy message"
                    aria-label="Copy message"
                    disabled={isExpired}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>
              </li>
            ))}
            <div ref={chatEndRef} />
          </ul>
        )}
      </div>
      {/* No input in shared view */}
    </div>
  );
};

export default ShareChat;
