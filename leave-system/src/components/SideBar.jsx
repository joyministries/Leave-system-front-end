import { IoClose } from 'react-icons/io5';
import { useAuth } from '../hooks/authhook';
import { getAuthorizedMenuItems } from '../utils/sidebarConfig';


export default function SideBar({
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  onNavigate,
  onLogout,
  currentPath = '/dashboard',
  branding = 'Team Impact Christian University'
}) {
  const { user } = useAuth();

  // Calculate menu items directly from user (no need for state)
  const menuItems = getAuthorizedMenuItems(user);

  const handleNavigation = (path) => {
    onNavigate(path);
    setIsMobileMenuOpen(false);
  };

  const handleMobileLogout = () => {
    onLogout();
    setIsMobileMenuOpen(false);
  };

  const isActive = (path) => currentPath === path;

  const renderMenuItem = (item) => (
    <button
      key={item.id}
      onClick={() => handleNavigation(item.path)}
      title={item.description}
      className={`w-full text-left block px-4 py-2 rounded-lg transition ${isActive(item.path)
        ? 'bg-blue-600 text-white font-medium'
        : 'hover:bg-slate-800 text-slate-300 hover:text-white'
        }`}
    >
      {item.label}
    </button>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 sm:w-64 w-72 bg-slate-900 text-white hidden md:flex flex-col">
        <div className="p-6 text-xl font-bold border-b border-slate-800 tracking-tight">{branding}</div>
        
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.length > 0 ? (
            menuItems.map(renderMenuItem)
          ) : (
            <div className="text-slate-400 text-sm p-4">No menu items available</div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full text-left px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Mobile Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-slate-900 text-white z-50 md:hidden transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <div className="p-6 text-xl font-bold border-b border-slate-800 tracking-tight flex justify-between items-center">
          {branding}
          <button onClick={() => setIsMobileMenuOpen(false)} className="text-2xl hover:text-slate-300 transition">
            <IoClose />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.length > 0 ? (
            menuItems.map(renderMenuItem)
          ) : (
            <div className="text-slate-400 text-sm p-4">No menu items available</div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleMobileLogout}
            className="w-full text-left px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}