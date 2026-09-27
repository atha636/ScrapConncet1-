import { AnimatePresence, motion } from "framer-motion";

/**
 * A completion photo used to only open in a new browser tab (plain
 * `<a target="_blank">`) — functional, but it leaves the app and loses
 * all context (which pickup, what else is on this page). This keeps the
 * requester in-app: tap the thumbnail, see it full-screen, tap again (or
 * the close button) to get back to exactly where they were.
 */
export default function PhotoLightbox({ src, alt, open, onClose }) {
  return (
    <AnimatePresence>
      {open && src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/80 p-4 cursor-zoom-out"
        >
          <motion.img
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            src={src}
            alt={alt || "Completion photo"}
            className="max-w-full max-h-full rounded-md object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={onClose}
            aria-label="Close photo"
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-ink/40 hover:bg-ink/60 text-white flex items-center justify-center"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}