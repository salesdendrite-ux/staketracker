import { useState } from 'react';
import { X } from 'lucide-react';
import { stakeholdersAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function AddStakeholderModal({ companyId, stakeholders = [], onClose, onCreated }) {
  const [form, setForm] = useState({
    full_name: '', title: '', linkedin_url: '', reports_to: '', email: '', phone: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.reports_to) delete payload.reports_to;
      const res = await stakeholdersAPI.create(companyId, payload);
      toast.success(`${form.full_name} added`);
      onCreated(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add stakeholder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl text-gray-900">Add Stakeholder</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name *</label>
            <input type="text" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input-field" placeholder="Jane Smith" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="VP Engineering" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">LinkedIn URL</label>
            <input type="url" value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} className="input-field" placeholder="https://linkedin.com/in/janesmith" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Reports to</label>
            <select value={form.reports_to} onChange={(e) => setForm({ ...form, reports_to: e.target.value })} className="input-field">
              <option value="">— None —</option>
              {stakeholders.filter(s => s.status !== 'inactive').map((s) => (
                <option key={s.id} value={s.id}>{s.full_name} — {s.title || 'No title'}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="jane@co.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" placeholder="+1 555-0123" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Add Stakeholder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
