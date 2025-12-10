
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Menu, 
  X,
  LogOut,
  Building2,
  UserCircle,
  Settings
} from 'lucide-react';
import { User, UserRole } from '../types';
import { getGlobalSettings } from '../services/firestoreService';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUser: User;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, currentUser, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarLogo, setSidebarLogo] = useState<string>('');

  useEffect(() => {
    // Fetch global settings to get logo
    const fetchLogo = async () => {
      try {
        const settings = await getGlobalSettings();
        if (settings.sidebarLogoBase64) {
          setSidebarLogo(settings.sidebarLogoBase64);
        }
      } catch (e) {
        console.error("Failed to load layout settings", e);
      }
    };
    fetchLogo();
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.NOTULIS, UserRole.PESERTA] },
    { id: 'minutes', label: 'Notulen', icon: FileText, roles: [UserRole.ADMIN, UserRole.NOTULIS, UserRole.PESERTA] },
    { id: 'units', label: 'Unit', icon: Building2, roles: [UserRole.ADMIN] },
    { id: 'users', label: 'Pengguna', icon: Users, roles: [UserRole.ADMIN] },
    { id: 'peserta', label: 'Data Peserta', icon: Users, roles: [UserRole.NOTULIS] },
    { id: 'settings', label: 'Pengaturan', icon: Settings, roles: [UserRole.ADMIN] }, // New Settings Menu
  ];

  // Filter menu based on user role
  const filteredMenu = menuItems.filter(item => item.roles.includes(currentUser.role));

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between h-24">
            <div className="flex items-center justify-center w-full h-full">
              {sidebarLogo ? (
                <img src={sidebarLogo} alt="Logo" className="h-full max-h-16 w-auto object-contain" />
              ) : (
                <FileText className="text-primary" size={40} />
              )}
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600 absolute right-4 top-4">
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {filteredMenu.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                  ${activeTab === item.id 
                    ? 'bg-blue-50 text-primary' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                `}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-100 space-y-1">
             <button 
               onClick={() => {
                 onTabChange('profile');
                 setIsSidebarOpen(false);
               }}
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors mb-1
                  ${activeTab === 'profile' 
                    ? 'bg-blue-50 text-primary' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
               `}
            >
               <UserCircle size={20} />
               <span>Profil Saya</span>
            </button>
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={20} />
              Keluar
            </button>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3 px-2">
               <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs overflow-hidden shrink-0">
                  {currentUser.photo_user || currentUser.photoBase64 ? (
                    <img src={currentUser.photo_user || currentUser.photoBase64} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    currentUser.name.charAt(0)
                  )}
               </div>
               <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{currentUser.name}</p>
                  <p className="text-xs text-slate-500 truncate capitalize">{currentUser.role}</p>
               </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-full">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between shrink-0 h-16">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600">
              <Menu size={24} />
            </button>
            <div className="flex items-center">
              {sidebarLogo ? (
                 <img src={sidebarLogo} alt="Logo" className="h-10 w-auto object-contain" />
              ) : (
                 <FileText className="text-primary" size={28} />
              )}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs overflow-hidden">
             {currentUser.photo_user || currentUser.photoBase64 ? (
               <img src={currentUser.photo_user || currentUser.photoBase64} alt="User" className="w-full h-full object-cover" />
             ) : (
               currentUser.name.charAt(0)
             )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
           {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
