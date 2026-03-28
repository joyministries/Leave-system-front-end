import { MdClose, MdExitToApp } from 'react-icons/md';
import { useAuth } from '../hooks/authhook';
import { getAuthorizedMenuItems } from '../utils/sidebarConfig';


export default function SideBar({
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  onNavigate,
  onLogout,
  currentPath = '/dashboard',
  branding = 'Leave System'
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

  const renderMenuItem = (item) => {
    const active = isActive(item.path);
    const Icon = item.navIcon;

    return (
    <button
      key={item.id}
      onClick={() => handleNavigation(item.path)}
      title={item.description}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm sm:text-base ${active
        ? 'bg-slate-900 text-white font-bold shadow-lg'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
        }`}
    >
      <span className={`text-xl ${active ? 'text-white' : 'text-slate-500'}`}>
        {Icon ? <Icon /> : <div className="w-5 h-5"/>}
      </span>
      <span>{item.label}</span>
    </button>
  )}


  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white hidden md:flex flex-col h-screen sticky top-0 border-r border-slate-200 z-10 font-sans">
        <div className="p-6 text-2xl font-black text-slate-900 border-b border-slate-200 tracking-tight">{branding}</div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.length > 0 ? (
            menuItems.map(renderMenuItem)
          ) : (
            <div className="text-slate-500 text-sm p-4">No menu items available</div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold rounded-xl transition-all text-sm sm:text-base"
          >
            <MdExitToApp className="text-xl text-slate-500" />  
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 backdrop-blur-sm z-40 md:hidden bg-slate-900/20"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Mobile Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-white z-50 md:hidden transform transition-transform duration-300 font-sans border-r border-slate-200 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <div className="p-6 text-2xl font-black text-slate-900 border-b border-slate-200 tracking-tight flex justify-between items-center">
          {branding}
          <button onClick={() => setIsMobileMenuOpen(false)} className="text-2xl text-slate-500 hover:text-slate-900 transition">
            <MdClose />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.length > 0 ? (
            menuItems.map(renderMenuItem)
          ) : (
            <div className="text-slate-500 text-sm p-4">No menu items available</div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button
            onClick={handleMobileLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold rounded-xl transition-all text-sm sm:text-base"
          >
            <MdExitToApp className="text-xl text-slate-500" />  
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}