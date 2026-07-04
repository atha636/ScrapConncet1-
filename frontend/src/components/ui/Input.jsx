export default function Input({ label, error, className = "", ...props }) {
  return (
    <div className={className}>
      {label && <label className="field-label">{label}</label>}
      <input className={`field-input ${error ? "field-error" : ""}`} {...props} />
      {error && <p className="text-xs text-danger mt-1.5">{error}</p>}
    </div>
  );
}