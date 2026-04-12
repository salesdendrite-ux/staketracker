import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Building2, Users, Clock, ChevronRight } from 'lucide-react';

export default function CompanyCard({ company }) {
  const navigate = useNavigate();

  const activeCount = parseInt(company.active_count) || 0;
  const newCount = parseInt(company.new_count) || 0;
  const inactiveCount = parseInt(company.inactive_count) || 0;
  const totalCount = parseInt(company.stakeholder_count) || 0;

  return (
    <button
      onClick={() => navigate(`/companies/${company.id}`)}
      className="card p-5 text-left w-full hover:shadow-md hover:border-brand-200 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-brand-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">{company.name}</h3>
            {company.last_scraped_at && (
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                Scraped {formatDistanceToNow(new Date(company.last_scraped_at), { addSuffix: true })}
              </p>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-400 transition-colors" />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-600 font-medium">{totalCount} stakeholder{totalCount !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex items-center gap-2">
        {activeCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700">
            <span className="w-1 h-1 rounded-full bg-emerald-500" />
            {activeCount}
          </span>
        )}
        {newCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">
            <span className="w-1 h-1 rounded-full bg-blue-500" />
            {newCount}
          </span>
        )}
        {inactiveCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700">
            <span className="w-1 h-1 rounded-full bg-red-500" />
            {inactiveCount}
          </span>
        )}
      </div>
    </button>
  );
}
