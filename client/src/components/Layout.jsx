import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, ScrollText, LogOut, Target } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'bg-brand-500 text-white shadow-sm'
        : 'text-brand-200 hover:bg-brand-700 hover:text-white'
    }`;

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-brand-800 flex flex-col fixed inset-y-0 left-0 z-30">
        <div className="p-6 border-b border-brand-700">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-brand-400 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-display text-xl leading-tight">StakeTracker</h1>
              <p className="text-brand-400 text-[11px] tracking-wider uppercase">Org Intelligence</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavLink to="/" end className={linkClass}>
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </NavLink>
          <NavLink to="/changelog" className={linkClass}>
            <ScrollText className="w-4 h-4" />
            Change Log
          </NavLink>
        </nav>

        <div className="p-4 border-t border-brand-700">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-brand-400 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-brand-300 hover:text-white text-sm transition-colors w-full rounded-lg hover:bg-brand-700">
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
