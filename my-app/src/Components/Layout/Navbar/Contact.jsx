import React, { useEffect, useRef, useState } from "react";
import "./Contact.css";
import { useToast } from "../../Toast/ToastContext";
import { useAuth } from "./useAuth";
import { submitContactForm } from "../../../Services/ContactService";
import {
  SUBJECT_OPTIONS,
  MAX_MESSAGE_LENGTH,
  validateContactForm,
} from "./contactValidation";

function Contact({ onSuccess }) {
  const [formData, setFormData] = useState({
    subject: "",
    message: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showToast } = useToast();
  const { user, loading } = useAuth();

  const abortRef = useRef(null);
  const isLoggedIn = !!user;

  // Abort any in-flight request when component unmounts
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        try {
          abortRef.current.abort();
        } catch (_) {}
      }
    };
  }, []);

  const abortPreviousRequest = () => {
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch (_) {}
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || !isLoggedIn) return;

    const newErrors = validateContactForm(formData);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      abortPreviousRequest();

      const controller = new AbortController();
      abortRef.current = controller;

      await submitContactForm(
        {
          subject: formData.subject.trim(),
          message: formData.message.trim(),
        },
        controller.signal
      );

      showToast("Message sent. We'll get back to you soon.", {
        type: "success",
      });

      setFormData({
        subject: "",
        message: "",
      });

      setErrors({});

      if (typeof onSuccess === "function") {
        onSuccess();
      }
    } catch (err) {
      if (err?.name === "AbortError") return;

      showToast(err.message || "Failed to send message", {
        type: "error",
      });
    } finally {
      abortRef.current = null;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-container">
      <div className="contact-header">
        <div className="contact-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h2 className="contact-title">Get in Touch</h2>
        <p className="contact-subtitle">
          We'd love to hear from you. Send us a message!
        </p>
      </div>

      {!loading && !isLoggedIn && (
        <div className="info-item contact-login-warning" role="alert">
          <div className="info-content">
            <p className="contact-login-warning-text">
              Please log in to send us a message.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="contact-form">
        <div className="input-group">
          <label htmlFor="contact-subject">Subject</label>
          <select
            id="contact-subject"
            name="subject"
            value={formData.subject}
            onChange={handleInputChange}
            className={errors.subject ? "input-error" : ""}
            aria-invalid={!!errors.subject}
            aria-describedby={
              errors.subject ? "contact-subject-error" : undefined
            }
            disabled={!isLoggedIn || isSubmitting || loading}
            required
          >
            <option value="" disabled>
              Select a subject
            </option>
            {SUBJECT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {errors.subject && (
            <span id="contact-subject-error" className="error-message">
              {errors.subject}
            </span>
          )}
        </div>

        <div className="input-group">
          <label htmlFor="contact-message">Message</label>
          <textarea
            id="contact-message"
            name="message"
            placeholder="Tell us more about your inquiry..."
            value={formData.message}
            onChange={handleInputChange}
            className={errors.message ? "input-error" : ""}
            rows={4}
            minLength={10}
            maxLength={MAX_MESSAGE_LENGTH}
            aria-invalid={!!errors.message}
            aria-describedby={
              errors.message ? "contact-message-error" : "contact-message-help"
            }
            disabled={!isLoggedIn || isSubmitting || loading}
            required
          />
          {errors.message ? (
            <span id="contact-message-error" className="error-message" role="alert">
              {errors.message}
            </span>
          ) : (
            <span id="contact-message-help" className="message-counter">
              {formData.message.length} of {MAX_MESSAGE_LENGTH} characters
            </span>
          )}
        </div>

        <button
          type="submit"
          className={`submit-btn ${isSubmitting ? "submitting" : ""}`}
          disabled={isSubmitting || !isLoggedIn || loading}
        >
          {isSubmitting ? (
            <>
              <span className="spinner"></span>
              Sending Message...
            </>
          ) : isLoggedIn ? (
            "Send Message"
          ) : (
            "Login Required"
          )}
        </button>
      </form>

      <div className="contact-info">
        <div className="info-item">
          <div className="info-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div className="info-content">
            <h4>Email Us</h4>
            <p>smartdocq@gmail.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Contact;