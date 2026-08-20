import { AnimatePresence, motion } from "framer-motion";

export default function GoogleRoleModal({ open, onChoose, onCancel }) {
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
            className="ticket w-full max-w-md p-6"
          >
            <h3 className="font-display font-semibold text-lg text-ink mb-1 text-center">
              How will you use ScrapConnect?
            </h3>
            <p className="text-sm text-inkSoft mb-5 text-center">
              This is your first time signing in — pick one to finish setting up your account.
            </p>

            <div className="flex flex-col gap-3">
              <motion.button
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onChoose(false)}
                className="text-left ticket p-4 hover:border-rust transition-colors group flex items-center gap-3"
              >
                <div className="w-10 h-10 shrink-0 rounded-full bg-rust/10 text-rust flex items-center justify-center group-hover:bg-rust group-hover:text-surface transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div>
                  <div className="font-display font-semibold text-ink">I have scrap to sell</div>
                  <p className="text-xs text-inkSoft">Post pickups, get matched with a collector.</p>
                </div>
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onChoose(true)}
                className="text-left ticket p-4 hover:border-amber transition-colors group flex items-center gap-3"
              >
                <div className="w-10 h-10 shrink-0 rounded-full bg-amber/15 text-amber-dark flex items-center justify-center group-hover:bg-amber group-hover:text-surface transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="1" y="3" width="15" height="13" rx="2" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                </div>
                <div>
                  <div className="font-display font-semibold text-ink">I want to collect scrap</div>
                  <p className="text-xs text-inkSoft">Browse nearby pickups, get paid per job.</p>
                </div>
              </motion.button>
            </div>

            <button type="button" onClick={onCancel} className="text-center text-sm text-inkFaint hover:text-inkSoft w-full mt-4">
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}