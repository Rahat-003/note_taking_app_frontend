import { useEffect, useId, useRef } from 'react';
import { XIcon } from './icons.jsx';

/**
 * Modal dialog on the native <dialog> element: focus is trapped, the page behind is inert, and focus
 * returns to the element that opened it. Escape, the ✕ button and a click on the backdrop call onClose,
 * which may decline (e.g. to ask about unsaved changes).
 */
export default function Modal({ title, subtitle, onClose, children, footer, size = 'md' }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // no page scrolling behind the modal
    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
      // React removes the dialog before this cleanup runs, so the browser cannot restore focus itself.
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={`modal modal-${size}`}
      aria-labelledby={titleId}
      onCancel={(e) => { e.preventDefault(); onClose(); }} // Escape
      onMouseDown={(e) => { if (e.target === ref.current) onClose(); }} // the backdrop is the dialog element itself
    >
      <header className="modal-header">
        <div className="modal-heading">
          <h2 id={titleId}>{title}</h2>
          {subtitle && <div className="modal-subtitle">{subtitle}</div>}
        </div>
        <button type="button" className="btn btn-ghost btn-icon" aria-label="Close" onClick={onClose}><XIcon /></button>
      </header>
      <div className="modal-body">{children}</div>
      {footer && <footer className="modal-footer">{footer}</footer>}
    </dialog>
  );
}
