import { useState, useEffect } from 'react';
import { changelogAPI, companiesAPI } from '../services/api';
import ChangeLogFeed from '../components/ChangeLogFeed';
import { ChevronLeft, ChevronRight, ScrollText } from 'lucide-react';

export default function GlobalChangelog() {
  const [entries, setEntries] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ change_type: '', company_id: '', page: 1, limit: 30 });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  useEffect(() => {
    companiesAPI.list().then((res) => setCompanies(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filters.change_type) params.change_type = filters.change_type;
    if (filters.company_id) params.company_id = filters.company_id;
    params.page = filters.page;
    params.limit = filters.limit;

    changelogAPI.global(params)
      .then((res) => {
        setEntries(res.data.data || []);
        setPagination(res.data.pagination || {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filters]);

  const changeTypes = [
    { value: '', label: 'All changes' },
    { value: 'new_stakeholder', label: 'New stakeholders' },
    { value: 'title_change', label: 'Title changes' },
    { value: 'departed', label: 'Departures' },
    { value: 'reports_to_change', label: 'Reporting changes' },
    { value: 'returned', label: 'Returns' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl text-gray-900">Change Log</h1>
        <p className="text-gray-500 text-sm mt-1">All stakeholder changes across your companies</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <select
          value={filters.change_type}
          onChange={(e) => setFilters({ ...filters, change_type: e.target.value, page: 1 })}
          className="input-field w-auto"
        >
          {changeTypes.map((ct) => (
            <option key={ct.value} value={ct.value}>{ct.label}</option>
          ))}
        </select>
        <select
          value={filters.company_id}
          onChange={(e) => setFilters({ ...filters, company_id: e.target.value, page: 1 })}
          className="input-field w-auto"
        >
          <option value="">All companies</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="card p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="skeleton w-8 h-8 rounded-lg flex-shrink-0" />
              <div className="flex-1">
                <div className="skeleton h-4 w-3/4 mb-2" />
                <div className="skeleton h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ScrollText className="w-8 h-8 text-brand-400" />
          </div>
          <h3 className="font-display text-xl text-gray-900 mb-2">No changes yet</h3>
          <p className="text-gray-500 text-sm">Changes will appear here as stakeholders are tracked</p>
        </div>
      ) : (
        <>
          <div className="card">
            <ChangeLogFeed entries={entries} showCompany />
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-gray-500">
                Page {pagination.page} of {pagination.pages} ({pagination.total} changes)
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  disabled={filters.page <= 1}
                  className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  disabled={filters.page >= pagination.pages}
                  className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
