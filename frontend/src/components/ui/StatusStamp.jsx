import { useT } from "../../i18n/core";

const CLASS = {
  pending: "stamp-pending",
  accepted: "stamp-accepted",
  in_progress: "stamp-progress",
  completed: "stamp-completed",
  cancelled: "stamp-cancelled",
};

export default function StatusStamp({ status }) {
  const { t } = useT();
  const key = `status.${status}`;
  const label = t(key);
  return (
    <span className={`stamp ${CLASS[status] || "stamp-pending"}`}>
      {/* An unknown status has no key — t() returns the key itself, so show the raw status instead. */}
      {label === key ? status : label}
    </span>
  );
}