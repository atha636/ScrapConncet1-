/**
 * Renders N pulsing placeholder cards shaped like the real list items
 * they're standing in for. Used instead of a bare spinner on list pages —
 * gives a sense of the page's structure while data loads, rather than a
 * blank gap followed by a layout jump.
 */
export default function CardSkeleton({ count = 3, withImage = false }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="ticket p-5 pt-6 flex items-center justify-between gap-4 animate-pulse">
          <div className="flex gap-4 flex-1">
            {withImage && <div className="w-16 h-16 rounded-md bg-line shrink-0" />}
            <div className="flex-1 space-y-2 max-w-xs">
              <div className="h-4 bg-line rounded w-3/4" />
              <div className="h-3 bg-line rounded w-1/2" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="h-4 bg-line rounded w-14" />
            <div className="h-6 bg-line rounded-full w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}