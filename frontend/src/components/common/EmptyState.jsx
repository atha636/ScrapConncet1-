import { Link } from "react-router-dom";
import Card from "../ui/Card";

/**
 * A friendly empty list: what's missing, why, and the one thing to do next.
 * Same dashed-circle icon the dashboards already use, so it reads as part of
 * the same design rather than a new pattern.
 *
 * @param {object} props
 * @param {React.ReactNode} props.icon - small svg
 * @param {string} props.title
 * @param {React.ReactNode} [props.children] - one or two lines of help
 * @param {{label: string, to?: string, onClick?: () => void}} [props.action] - the main next step
 * @param {string[]} [props.tips] - short tips shown under the action
 */
export default function EmptyState({ icon, title, children, action, tips }) {
  return (
    <Card className="p-8 sm:p-10 text-center">
      {icon && (
        <div className="w-11 h-11 mx-auto mb-3 rounded-full border-2 border-dashed border-line flex items-center justify-center text-inkFaint">
          {icon}
        </div>
      )}
      <p className="font-display font-semibold text-ink mb-1">{title}</p>
      {children && <p className="text-sm text-inkSoft leading-relaxed max-w-sm mx-auto">{children}</p>}

      {action && (
        <div className="mt-4">
          {action.to ? (
            <Link to={action.to} className="btn-primary inline-flex">{action.label}</Link>
          ) : (
            <button type="button" onClick={action.onClick} className="btn-primary inline-flex">{action.label}</button>
          )}
        </div>
      )}

      {tips?.length > 0 && (
        <ul className="mt-5 space-y-1.5 text-xs text-inkFaint max-w-xs mx-auto text-left">
          {tips.map((tip) => (
            <li key={tip} className="flex gap-2">
              <span className="text-rust" aria-hidden="true">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}