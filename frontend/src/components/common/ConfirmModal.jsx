import { AnimatePresence, motion } from "framer-motion";

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="ticket w-full max-w-sm p-6"
          >
            <h3 className="font-display font-semibold text-lg text-ink mb-1">{title}</h3>
            {message && <p className="text-sm text-inkSoft mb-6">{message}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={onCancel} className="btn-secondary flex-1">
                {cancelLabel}
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={onConfirm}
                className="flex-1 rounded-md bg-rust text-surface text-sm font-semibold py-2.5 hover:bg-rust/90 transition-colors"
              >
                {confirmLabel}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}