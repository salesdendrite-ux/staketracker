import { formatDistanceToNow } from 'date-fns';

const config = {
  active: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Active' },
  new:    { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'New' },
  inactive: { bg: 'bg-red-50',   text: 'text-red-700',     dot: 'bg-red-500',     label: 'Inactive' },
};

export default function StatusBadge({ status, firstSeenAt, markedInactiveAt }) {
  const c = config[status] || config.active;

  let tooltip = '';
  if (status === 'new' && firstSeenAt) {
    tooltip = `First seen ${formatDistanceToNow(new Date(firstSeenAt), { addSuffix: true })}`;
  } else if (status === 'inactive' && markedInactiveAt) {
    tooltip = `Inactive since ${formatDistanceToNow(new Date(markedInactiveAt), { addSuffix: true })}`;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`} title={tooltip}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
