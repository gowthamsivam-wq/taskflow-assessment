/**
 * Prompt used to generate this component (Task 5, Section B — scored 5/5):
 *
 * "Create a fully typed, accessible React Modal component in TypeScript with these requirements:
 *  - Props: isOpen (boolean), onClose (() => void), title (string), children (ReactNode),
 *    footer (ReactNode, optional slot for action buttons).
 *  - Accessibility: focus trap — when open, Tab/Shift+Tab must cycle only within the modal;
 *    initial focus goes to the first focusable element; on close, restore focus to the element
 *    that triggered it.
 *  - Keyboard: pressing Escape closes the modal.
 *  - Overlay: clicking the backdrop closes the modal, but clicking inside the panel does not.
 *  - Animation: CSS transition (opacity + translate-y) for open/close using Tailwind classes.
 *  - No third-party focus-trap library — implement natively with refs and a keydown handler.
 *  - Do not render the portal when isOpen is false (clean unmount, no hidden DOM noise)."
 */

import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
} from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export default function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Save the element that had focus before opening
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Delay so the panel is painted before we attempt focus
      setTimeout(() => {
        const first = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)[0];
        first?.focus();
      }, 10);
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  const trapFocus = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;

    const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, [onClose]);

  const stopPropagation = (e: MouseEvent) => e.stopPropagation();

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={trapFocus}
      onClick={onClose}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 transition-opacity duration-200" />

      {/* Panel */}
      <div
        ref={panelRef}
        onClick={stopPropagation}
        className="relative z-10 w-full max-w-md bg-white rounded-xl shadow-xl flex flex-col
                   animate-[fadeSlideIn_150ms_ease-out]"
        style={{ animationFillMode: 'both' }}
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md p-1"
          >
            ✕
          </button>
        </header>

        <div className="px-6 py-4 text-sm text-gray-700">{children}</div>

        {footer && (
          <footer className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
