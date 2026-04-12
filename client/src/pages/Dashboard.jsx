import { useState, useEffect } from 'react';
import { Plus, Search, Building2 } from 'lucide-react';
import { companiesAPI } from '../services/api';
import CompanyCard from '../components/CompanyCard';
import AddCompanyModal from '../components/AddCompanyModal';

export default function Dashboard() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const fetchCompanies = async () => {
    try {
      const res = await companiesAPI.list(search);
      setCompanies(res.data);
    } catch (err) {
      console.error('Failed to load companies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [search]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Track stakeholder movements across your companies</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Company
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text" placeholder="Search companies…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5">
              <div className="skeleton h-5 w-32 mb-4" />
              <div className="skeleton h-4 w-24 mb-3" />
              <div className="skeleton h-3 w-40" />
            </div>
          ))}
        </div>
      ) : companies.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-brand-400" />
          </div>
          <h3 className="font-display text-xl text-gray-900 mb-2">No companies yet</h3>
          <p className="text-gray-500 text-sm mb-6">Add your first company to start tracking stakeholders</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mx-auto">
            <Plus className="w-4 h-4" />
            Add Company
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((c) => <CompanyCard key={c.id} company={c} />)}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <AddCompanyModal
          onClose={() => setShowModal(false)}
          onCreated={(newCompany) => setCompanies([newCompany, ...companies])}
        />
      )}
    </div>
  );
}
