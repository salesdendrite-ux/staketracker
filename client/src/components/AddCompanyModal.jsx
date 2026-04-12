import { useState } from 'react';
import { X } from 'lucide-react';
import { companiesAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function AddCompanyModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', linkedin_url: '', org_url: '', scrape_frequency: 'weekly' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await companiesAPI.create(form);
      toast.success(`${form.name} added`);
      onCreated(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl text-gray-900">Add Company</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Company name *</label>
            <input
              type="text" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field" placeholder="Acme Corp"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">LinkedIn URL</label>
            <input
              type="url" value={form.linkedin_url}
              onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
              className="input-field" placeholder="https://linkedin.com/company/acme"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">TheOrg URL</label>
            <input
              type="url" value={form.org_url}
              onChange={(e) => setForm({ ...form, org_url: e.target.value })}
              className="input-field" placeholder="https://theorg.com/org/acme"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Scrape frequency</label>
            <select
              value={form.scrape_frequency}
              onChange={(e) => setForm({ ...form, scrape_frequency: e.target.value })}
              className="input-field"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Add Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
