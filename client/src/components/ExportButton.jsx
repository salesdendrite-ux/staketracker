import { useState } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import { exportAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function ExportButton({ companyId, companyName }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const download = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportCompany = async () => {
    setLoading(true);
    setOpen(false);
    try {
      const res = await exportAPI.company(companyId);
      const safeName = companyName?.replace(/[^a-zA-Z0-9]/g, '_') || 'Company';
      download(res.data, `${safeName}_Stakeholders_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Export downloaded');
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExportAll = async () => {
    setLoading(true);
    setOpen(false);
    try {
      const res = await exportAPI.all();
      download(res.data, `StakeTracker_All_Companies_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Export downloaded');
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} disabled={loading} className="btn-secondary">
        <Download className="w-4 h-4" />
        {loading ? 'Exporting…' : 'Export'}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50">
            <button onClick={handleExportCompany} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              Export this company
            </button>
            <button onClick={handleExportAll} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              Export all companies
            </button>
          </div>
        </>
      )}
    </div>
  );
}
