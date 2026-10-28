import { Link, NavLink, useNavigate } from 'react-router-dom';
import { authClient } from '../lib/authClient';

export default function Nav({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authClient.signOut();
    onLogout();
    navigate('/login');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm font-medium ${
      isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
    }`;

  return (
    <nav className="bg-slate-900">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/dashboard" className="text-lg font-bold text-white">
          求职追踪
        </Link>
        <div className="flex items-center gap-2">
          <NavLink to="/dashboard" end className={linkClass}>
            仪表盘
          </NavLink>
          <NavLink to="/applications" className={linkClass}>
            申请列表
          </NavLink>
          <button
            onClick={handleLogout}
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            登出
          </button>
        </div>
      </div>
    </nav>
  );
}
