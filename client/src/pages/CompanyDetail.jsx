import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, UserPlus, Pause, Play, Trash2, ExternalLink } from 'lucide-react';
import { companiesAPI, stakeholdersAPI, changelogAPI, scrapeAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import StakeholderTable from '../components/StakeholderTable';
import ChangeLogFeed from '../components/ChangeLogFeed';
import ScrapeButton from '../components/ScrapeButton';
import ExportButton from '../components/ExportButton';
import AddStakeholderModal from '../components/AddStakeholderModal';
import StatusBadge from '../components/StatusBadge';

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [stakeholders, setStakeholders] = useState([]);
  const [changelog, setChangelog] = useState([]);
  const [scrapeJobs, setScrapeJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('stakeholders');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [compRes, stakRes, clRes, jobsRes] = await Promise.all([
        companiesAPI.get(id),
        stakeholdersAPI.list(id),
        changelogAPI.byCompany(id, { limit: 50 }),
        scrapeAPI.jobs(id),
      ]);
      setCompany(compRes.data);
      setStakeholders(stakRes.data);
      setChangelog(clRes.data.data || []);
      setScrapeJobs(jobsRes.data);
    } catch (err) {
      toast.error('Failed to load company');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleToggleScraping = async () => {
    try {
      const res = await companiesAPI.update(id, { scrape_enabled: !company.scrape_enabled });
      setCompany({ ...company, ...res.data });
      toast.success(res.data.scrape_enabled ? 'Scraping resumed' : 'Scraping paused');
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async (stakeholder) => {
    if (!confirm(`Mark ${stakeholder.full_name} as inactive?`)) return;
    try {
      await stakeholdersAPI.delete(id, stakeholder.id);
      toast.success(`${stakeholder.full_name} marked inactive`);
      fetchAll();
    } catch {
      toast.error('Failed to update');
    }
  };

  if (loading) {
    return (
      <div>
        <div className="skeleton h-8 w-48 mb-4" />
        <div className="skeleton h-4 w-64 mb-8" />
        <div className="skeleton h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!company) return null;

  const stats = company.stats || {};
  const tabs = [
    { key: 'stakeholders', label: 'Stakeholders', count: parseInt(stats.total_count) || 0 },
    { key: 'changelog', label: 'Change Log', count: changelog.length },
    { key: 'scrape_history', label: 'Scrape History', count: scrapeJobs.length },
  ];

  return (
    <div>
      {/* Header */}
      <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-gray-900">{company.name}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            {company.linkedin_url && (
              <a href={company.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-brand-500">
                <ExternalLink className="w-3.5 h-3.5" /> LinkedIn
              </a>
            )}
            {company.org_url && (
              <a href={company.org_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-brand-500">
                <ExternalLink className="w-3.5 h-3.5" /> TheOrg
              </a>
            )}
            {company.last_scraped_at && (
              <span>Last scraped {formatDistanceToNow(new Date(company.last_scraped_at), { addSuffix: true })}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleToggleScraping} className="btn-secondary" title={company.scrape_enabled ? 'Pause scraping' : 'Resume scraping'}>
            {company.scrape_enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {company.scrape_enabled ? 'Pause' : 'Resume'}
          </button>
          <ScrapeButton companyId={id} onComplete={fetchAll} />
          <ExportButton companyId={id} companyName={company.name} />
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total_count || 0, color: 'text-gray-900' },
          { label: 'Active', value: stats.active_count || 0, color: 'text-emerald-600' },
          { label: 'New', value: stats.new_count || 0, color: 'text-blue-600' },
          { label: 'Inactive', value: stats.inactive_count || 0, color: 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className="card px-4 py-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-semibold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px ${
              tab === t.key
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}>
            {t.label}
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'stakeholders' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowAddModal(true)} className="btn-primary">
              <UserPlus className="w-4 h-4" /> Add Stakeholder
            </button>
          </div>
          <StakeholderTable
            data={stakeholders}
            statusFilter={statusFilter}
            onStatusFilter={setStatusFilter}
            onEdit={(s) => toast('Edit coming soon — update via API for now', { icon: '🛠️' })}
            onDelete={handleDelete}
          />
        </div>
      )}

      {tab === 'changelog' && (
        <div className="card">
          <ChangeLogFeed entries={changelog} />
        </div>
      )}

      {tab === 'scrape_history' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Triggered By</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Started</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">People Found</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Changes</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Error</th>
              </tr>
            </thead>
            <tbody>
              {scrapeJobs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No scrape history</td></tr>
              ) : scrapeJobs.map((job) => (
                <tr key={job.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      job.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                      job.status === 'failed' ? 'bg-red-50 text-red-700' :
                      job.status === 'running' ? 'bg-amber-50 text-amber-700' :
                      'bg-gray-50 text-gray-700'
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{job.triggered_by}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {job.started_at ? formatDistanceToNow(new Date(job.started_at), { addSuffix: true }) : 'Pending'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{job.stakeholders_found}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{job.changes_detected}</td>
                  <td className="px-4 py-3 text-sm text-red-500 max-w-[200px] truncate">{job.error_message || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add stakeholder modal */}
      {showAddModal && (
        <AddStakeholderModal
          companyId={id}
          stakeholders={stakeholders}
          onClose={() => setShowAddModal(false)}
          onCreated={() => fetchAll()}
        />
      )}
    </div>
  );
}
