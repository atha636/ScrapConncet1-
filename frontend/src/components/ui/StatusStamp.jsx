const LABELS = {
  pending: "Pending",
  accepted: "Accepted",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const CLASS = {
  pending: "stamp-pending",
  accepted: "stamp-accepted",
  in_progress: "stamp-progress",
  completed: "stamp-completed",
  cancelled: "stamp-cancelled",
};

export default function StatusStamp({ status }) {
  return (
    <span className={`stamp ${CLASS[status] || "stamp-pending"}`}>
      {LABELS[status] || status}
    </span>
  );
}