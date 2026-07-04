export default function Loader({ label = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-inkSoft">
      <div className="w-8 h-8 border-[2.5px] border-line border-t-rust rounded-full animate-spin mb-3" />
      <p className="text-sm">{label}</p>
    </div>
  );
}