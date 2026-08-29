export default function ErrorBox({ children }) {
  if (!children) return null;
  return (
    <div className="flex items-center gap-2 text-sm text-danger bg-danger/[0.07] border border-danger/30 rounded-md px-3 py-2.5">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="shrink-0">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {children}
    </div>
  );
}