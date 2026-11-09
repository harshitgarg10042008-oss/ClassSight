'use client';

import React, { useState, useEffect } from 'react';

// ─── Tabs ─────────────────────────────────────────────────────────────────────
export interface TabItem {
  id: string;
  label: React.ReactNode;
  count?: number;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: 'underline' | 'pills' | 'segmented';
}

export function Tabs({
  tabs,
  activeId,
  onChange,
  className = '',
  variant = 'underline',
}: TabsProps) {
  return (
    <div className={`cs-tabs cs-tabs-${variant} ${className}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            disabled={tab.disabled}
            className={`cs-tab-btn ${isActive ? 'is-active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`cs-tab-badge ${isActive ? 'is-active' : ''}`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="cs-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className={`cs-modal cs-modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'cs-modal-title' : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cs-modal-header">
          <div>
            {title && <h2 id="cs-modal-title" className="cs-modal-title">{title}</h2>}
            {description && <p className="cs-modal-desc">{description}</p>}
          </div>
          <button
            type="button"
            className="cs-modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>
        <div className="cs-modal-body">{children}</div>
        {footer && <div className="cs-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Drawer ───────────────────────────────────────────────────────────────────
export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: 'right' | 'left' | 'bottom';
}

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  footer,
  side = 'right',
}: DrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="cs-drawer-backdrop" onClick={onClose} role="presentation">
      <div
        className={`cs-drawer cs-drawer-${side}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cs-drawer-header">
          {title && <h2 className="cs-drawer-title">{title}</h2>}
          <button
            type="button"
            className="cs-modal-close"
            onClick={onClose}
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>
        <div className="cs-drawer-body">{children}</div>
        {footer && <div className="cs-drawer-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Toast System ─────────────────────────────────────────────────────────────
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
  action?: { label: string; onClick: () => void };
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="cs-toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`cs-toast cs-toast-${toast.type}`} role="alert">
          <div className="cs-toast-content">
            {toast.title && <strong className="cs-toast-title">{toast.title}</strong>}
            <p className="cs-toast-message">{toast.message}</p>
          </div>
          {toast.action && (
            <button
              type="button"
              className="cs-toast-action"
              onClick={() => {
                toast.action?.onClick();
                onDismiss(toast.id);
              }}
            >
              {toast.action.label}
            </button>
          )}
          <button
            type="button"
            className="cs-toast-close"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss toast"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

