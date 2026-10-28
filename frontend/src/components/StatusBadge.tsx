import type { ApplicationStatus } from '../types';
import { STATUS_LABELS } from '../types';

const STYLES: Record<ApplicationStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  INTERVIEW: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  OFFER: 'bg-emerald-100 text-emerald-800',
};

export default function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
