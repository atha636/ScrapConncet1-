export default function Card({ children, className = "", ...props }) {
  return (
    <div className={`ticket ${className}`} {...props}>
      {children}
    </div>
  );
}