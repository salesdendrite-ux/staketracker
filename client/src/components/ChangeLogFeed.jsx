import { formatDistanceToNow } from 'date-fns';
import { UserPlus, ArrowUp, UserMinus, GitBranch, RotateCcw } from 'lucide-react';

const iconMap = {
  new_stakeholder: { icon: UserPlus, color: 'text-blue-500', bg: 'bg-blue-50' },
  title_change: { icon: ArrowUp, color: 'text-amber-500', bg: 'bg-amber-50' },
  departed: { icon: UserMinus, color: 'text-red-500', bg: 'bg-red-50' },
  reports_to_change: { icon: GitBranch, color: 'text-purple-500', bg: 'bg-purple-50' },
  returned: { icon: RotateCcw, color: 'text-emerald-500', bg: 'bg-emerald-50' },
};

function describeChange(entry) {
  const name = entry.stakeholder_name || 'Unknown';
  switch (entry.change_type) {
    case 'new_stakeholder':
      return `${name} joined`;
    case 'title_change':
      return `${name}: ${entry.old_value || 'No title'} → ${entry.new_value || 'No title'}`;
    case 'departed':
      return `${name} departed`;
    case 'reports_to_change':
      return `${name} now reports to ${entry.new_value || 'None'} (was ${entry.old_value || 'None'})`;
    case 'returned':
      return `${name} returned`;
    default:
      return `${name}: ${entry.change_type}`;
  }
}

export default function ChangeLogFeed({ entries, showCompany = false }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-sm">No changes recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => {
        const cfg = iconMap[entry.change_type] || iconMap.new_stakeholder;
        const Icon = cfg.icon;

        return (
          <div key={entry.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50/50 rounded-lg transition-colors">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
              <Icon className={`w-4 h-4 ${cfg.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800">{describeChange(entry)}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {showCompany && entry.company_name && (
                  <span className="text-xs text-brand-500 font-medium">{entry.company_name}</span>
                )}
                <span className="text-xs text-gray-400">
                  {entry.detected_at ? formatDistanceToNow(new Date(entry.detected_at), { addSuffix: true }) : ''}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
