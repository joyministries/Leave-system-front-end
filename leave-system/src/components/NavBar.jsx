import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/authhook';
import { FiLogOut, FiMenu } from 'react-icons/fi';

/**
 * Reusable Navbar component for pages
 * Matches the Dashboard header styling and structure
 * @param {string} title - Page title to display
 * @param {string} subtitle - Optional subtitle/description
 */
export const Navbar = ({ title = 'Page', subtitle = '', setIsMobileMenuOpen }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="flex justify-between items-center mb-6 sm:mb-8 gap-4 flex-wrap">
      
      {/* Left side (Menu + Title) */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        
        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="md:hidden text-2xl text-slate-800 p-2 hover:bg-slate-100 rounded-lg transition flex-shrink-0"
          title="Open menu"
        >
          <FiMenu />
        </button>

        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight truncate">{title}</h1>
          {subtitle && <p className="text-slate-500 mt-1 text-xs sm:text-sm truncate">{subtitle}</p>}
        </div>

      </div>

      {/* Logout Button */}
      <button 
        onClick={handleLogout}
        className="bg-slate-900 hover:bg-black text-white px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold shadow-lg transition-all flex items-center gap-2 active:scale-95 text-xs sm:text-sm md:text-base min-h-[44px] flex-shrink-0"
        title="Logout"
      >
        <FiLogOut className="text-lg md:text-xl" />
        <span className="hidden sm:inline">Logout</span>
      </button>

    </header>
  );
}