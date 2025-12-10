import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import MinuteList from './components/MinuteList';
import MinuteForm from './components/MinuteForm';
import UserManager from './components/UserManager';
import UnitManager from './components/UnitManager';
import Profile from './components/Profile';
import Modal from './components/Modal';
import AdminSettings from './components/AdminSettings'; // New Import
import { BarChart, DonutChart } from './components/DashboardCharts';
import { getMinutes, createMinute, updateMinute, updateParticipantStatus, authenticateUser, getUser, getUnits, getUsers, deleteMinute, signMinuteAsPIC } from './services/firestoreService';
import { Minute, User, UserRole, AttendanceStatus, Unit, MinuteStatus } from './types';
import { Loader2, LogIn, UserCheck, AlertCircle, Eye, Download, CheckCircle, MapPin, Calendar, X, Filter, Trash2, PenTool, Clock, ChevronRight, FileText, AlertTriangle, PenLine, ChevronDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from './components/Toast';
import SignaturePad, { SignaturePadRef } from './components/SignaturePad';

// Login Component
const LoginScreen: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  const [identifier, setIdentifier] = useState(''); // Email or NIK
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const user = await authenticateUser(identifier, password);
      if (user) {
        onLogin(user);
      } else {
        setError('Login gagal. Periksa NIK/Email atau Password anda.');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat login.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50">
      
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Top Right Blob */}
        <div className="absolute -top-[10%] -right-[5%] w-[500px] h-[500px] rounded-full bg-blue-200/40 blur-[80px] mix-blend-multiply animate-pulse"></div>
        {/* Bottom Left Blob */}
        <div className="absolute -bottom-[10%] -left-[5%] w-[500px] h-[500px] rounded-full bg-indigo-200/40 blur-[80px] mix-blend-multiply"></div>
        {/* Center Small Blob */}
        <div className="absolute top-[40%] left-[20%] w-[200px] h-[200px] rounded-full bg-sky-200/40 blur-[60px] mix-blend-multiply"></div>
      </div>

      <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full shadow-2xl border border-white/50 z-10 relative">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30 transform -rotate-3">
            <FileText className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">NotulenKu</h1>
          <p className="text-slate-500 mt-2 text-sm">Sistem Manajemen Notulen Rapat Digital</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-semibold text-slate-700 ml-1">NIK atau Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <UserCheck size={18} />
              </div>
              <input 
                type="text" 
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 bg-white/50 text-slate-900 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="Masukkan kredensial Anda"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-semibold text-slate-700 ml-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <LogIn size={18} />
              </div>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 bg-white/50 text-slate-900 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1 text-right">Default password peserta baru: NIK</p>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 mt-6 active:scale-[0.98]"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
            <span>Masuk Sekarang</span>
          </button>
        </form>

        <div className="mt-8 text-center">
           <p className="text-xs text-slate-400">
             &copy; {new Date().getFullYear()} Polibatam. All rights reserved.
           </p>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true); // New state for loading session
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewState, setViewState] = useState<'list' | 'create' | 'edit'>('list');
  const [minutes, setMinutes] = useState<Minute[]>([]);
  // Extra state for Admin Dashboard
  const [allUnits, setAllUnits] = useState<Unit[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
  // Dashboard Filters State
  const [statsYear, setStatsYear] = useState<number>(new Date().getFullYear());
  const [statsMonth, setStatsMonth] = useState<number | 'all'>('all');

  const [selectedMinute, setSelectedMinute] = useState<Minute | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  
  // Modal State for Attendance (Peserta)
  const [attendanceModal, setAttendanceModal] = useState<{isOpen: boolean, minute: Minute | null}>({
    isOpen: false, 
    minute: null
  });
  
  // Modal State for PIC Signing
  const [picSignModal, setPicSignModal] = useState<{isOpen: boolean, minute: Minute | null}>({
    isOpen: false,
    minute: null
  });

  const [isAttendanceSubmitting, setIsAttendanceSubmitting] = useState(false);
  const signaturePadRef = useRef<SignaturePadRef>(null);

  // Modal State for Delete Minute
  const [deleteMinuteModal, setDeleteMinuteModal] = useState<{isOpen: boolean, minute: Minute | null}>({
    isOpen: false,
    minute: null
  });

  const { showToast } = useToast();

  // --- SESSION RESTORATION LOGIC ---
  useEffect(() => {
    const restoreSession = async () => {
      const storedUserId = localStorage.getItem('notulen_user_id');
      if (storedUserId) {
        try {
          const user = await getUser(storedUserId);
          if (user) {
            setCurrentUser(user);
          } else {
            // User might be deleted, clear storage
            localStorage.removeItem('notulen_user_id');
          }
        } catch (error) {
          console.error("Failed to restore session", error);
        }
      }
      setIsAuthChecking(false);
    };

    restoreSession();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, activeTab]);

  const handleLogin = (user: User) => {
    // Save to local storage
    if (user.id) {
      localStorage.setItem('notulen_user_id', user.id);
    }
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('notulen_user_id');
    setCurrentUser(null);
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const minutesData = await getMinutes(currentUser?.id, currentUser?.role, currentUser?.unitId);
      setMinutes(minutesData);

      if (currentUser?.role === UserRole.ADMIN && activeTab === 'dashboard') {
        const [u, us] = await Promise.all([getUnits(), getUsers()]);
        setAllUnits(u);
        setAllUsers(us);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUserProfile = async () => {
    if (!currentUser?.id) return;
    const freshUser = await getUser(currentUser.id);
    if (freshUser) {
      setCurrentUser(freshUser);
    }
  };

  const handleCreateSubmit = async (data: Partial<Minute>) => {
    setIsLoading(true);
    try {
      await createMinute({ ...data, authorId: currentUser?.id });
      await fetchData();
      setViewState('list');
    } catch (err) {
      console.error(err);
      alert('Failed to save minute');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSubmit = async (data: Partial<Minute>) => {
    if (!selectedMinute?.id) return;
    setIsLoading(true);
    try {
      await updateMinute(selectedMinute.id, data);
      await fetchData();
      setViewState('list');
      setSelectedMinute(undefined);
    } catch (err) {
      console.error(err);
      alert('Failed to update minute');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDeleteMinute = async () => {
    if (deleteMinuteModal.minute && deleteMinuteModal.minute.id) {
      try {
        await deleteMinute(deleteMinuteModal.minute.id);
        await fetchData();
        showToast('Notulen berhasil dihapus');
        setDeleteMinuteModal({ isOpen: false, minute: null });
      } catch (error) {
        showToast('Gagal menghapus notulen', 'error');
        console.error(error);
      }
    }
  };

  // Open Modal Logic for Attendance
  const openAttendanceConfirmation = (minute: Minute) => {
    const me = minute.participants.find(p => p.userId === currentUser?.id);
    if (!me) {
      showToast("Maaf, Anda tidak terdaftar dalam daftar peserta rapat ini.", 'error');
      return;
    }
    setAttendanceModal({ isOpen: true, minute });
  };

  // Confirm Attendance Logic
  const confirmAttendance = async () => {
    if (!attendanceModal.minute || !currentUser?.id) return;
    
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
       showToast("Mohon tanda tangani terlebih dahulu", "error");
       return;
    }
    const signatureData = signaturePadRef.current.toDataURL();
    if (!signatureData) {
       showToast("Gagal mengambil data tanda tangan", "error");
       return;
    }

    setIsAttendanceSubmitting(true);
    try {
      await updateParticipantStatus(attendanceModal.minute.id!, currentUser.id, AttendanceStatus.HADIR, signatureData);
      
      // Update local state immediately to reflect UI change without waiting for network fetch
      if (selectedMinute && selectedMinute.id === attendanceModal.minute.id) {
         const updatedParticipants = selectedMinute.participants.map(p => 
           p.userId === currentUser.id ? { ...p, attendance: AttendanceStatus.HADIR, signature: signatureData } : p
         );
         setSelectedMinute({ ...selectedMinute, participants: updatedParticipants });
      }

      await fetchData();
      setAttendanceModal(prev => ({ ...prev, isOpen: false })); 
      showToast("Kehadiran berhasil dikonfirmasi!");
    } catch (error) {
      console.error("Attendance update failed:", error);
      showToast("Gagal menyimpan kehadiran.", 'error');
    } finally {
      setIsAttendanceSubmitting(false);
    }
  };

  // Open Modal Logic for PIC Signing
  const openPicSignModal = (minute: Minute) => {
    if (minute.picId !== currentUser?.id) return;
    setPicSignModal({ isOpen: true, minute });
  };

  // Confirm PIC Signing Logic
  const confirmPicSign = async () => {
    if (!picSignModal.minute || !currentUser?.id) return;

    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
       showToast("Mohon tanda tangani terlebih dahulu", "error");
       return;
    }
    const signatureData = signaturePadRef.current.toDataURL();
    if (!signatureData) return;

    setIsAttendanceSubmitting(true);
    try {
      await signMinuteAsPIC(picSignModal.minute.id!, signatureData);
      
      // Update local state immediately
      if (selectedMinute && selectedMinute.id === picSignModal.minute.id) {
         setSelectedMinute({ ...selectedMinute, picSignature: signatureData });
      }

      await fetchData();
      setPicSignModal({ isOpen: false, minute: null });
      showToast("Notulen berhasil ditandatangani!");
    } catch (error) {
       showToast("Gagal menyimpan tanda tangan PIC.", 'error');
    } finally {
      setIsAttendanceSubmitting(false);
    }
  };

  const getAdminCharts = () => {
    const unitCounts: Record<string, number> = {};
    allUnits.forEach(u => unitCounts[u.id!] = 0);
    const filteredMinutes = minutes.filter(m => {
      const d = new Date(m.date);
      return (d.getFullYear() === statsYear) && (statsMonth === 'all' || d.getMonth() === statsMonth);
    });
    filteredMinutes.forEach(m => { if (unitCounts[m.unitId] !== undefined) unitCounts[m.unitId]++; });
    const barData = allUnits.map(u => ({ label: u.name, value: unitCounts[u.id!] || 0 }));
    const roleCounts = { [UserRole.ADMIN]: 0, [UserRole.NOTULIS]: 0, [UserRole.PESERTA]: 0 };
    allUsers.forEach(u => { if (roleCounts[u.role] !== undefined) roleCounts[u.role]++; });
    const donutData = [
      { label: 'Admin', value: roleCounts[UserRole.ADMIN], color: '#A855F7' },
      { label: 'Notulis', value: roleCounts[UserRole.NOTULIS], color: '#3B82F6' },
      { label: 'Peserta', value: roleCounts[UserRole.PESERTA], color: '#22C55E' },
    ];
    return { barData, donutData };
  };

  // Helper for Peserta Dashboard
  const getUpcomingMeeting = () => {
    const now = new Date();
    // Filter future meetings or today's meetings
    const upcoming = minutes
      .filter(m => {
        const mDate = new Date(`${m.date}T${m.time}`);
        return mDate >= now;
      })
      .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
    
    return upcoming.length > 0 ? upcoming[0] : null;
  };

  // Show Loading while checking local storage
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard(); 
      case 'units': return currentUser.role === UserRole.ADMIN ? <UnitManager /> : null;
      case 'users': return currentUser.role === UserRole.ADMIN ? <UserManager roleFilter={undefined} /> : null;
      case 'settings': return currentUser.role === UserRole.ADMIN ? <AdminSettings /> : null; 
      case 'peserta': return currentUser.role === UserRole.NOTULIS ? <UserManager roleFilter={UserRole.PESERTA} title="Kelola Data Peserta" /> : null;
      case 'profile': return <Profile user={currentUser} onUpdate={refreshUserProfile} />;
      case 'minutes':
        if (viewState === 'create') {
          return (
            <MinuteForm isLoading={isLoading} onSubmit={handleCreateSubmit} onCancel={() => setViewState('list')} userUnitId={currentUser.unitId} />
          );
        }
        if (viewState === 'edit' && selectedMinute) {
          if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PESERTA) {
             return (
               <MinuteForm 
                  initialData={selectedMinute} 
                  readOnly={true} 
                  isLoading={false} 
                  onSubmit={async () => {}} 
                  onCancel={() => { setSelectedMinute(undefined); setViewState('list'); if (currentUser.role === UserRole.PESERTA) setActiveTab('dashboard'); }}
                  currentUserId={currentUser.id}
                  onAttendanceAction={openAttendanceConfirmation}
               />
             ); 
          }
          return (
             <MinuteForm 
               initialData={selectedMinute} 
               isLoading={isLoading} 
               onSubmit={handleEditSubmit} 
               onCancel={() => {setSelectedMinute(undefined); setViewState('list');}} 
               userUnitId={currentUser.unitId}
             />
          );
        }
        return (
          <>
            {isLoading ? <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-primary" size={32} /></div> : 
              <MinuteList 
                minutes={minutes} 
                userRole={currentUser.role}
                onView={(m) => { setSelectedMinute(m); setViewState('edit'); }}
                onCreate={() => { setSelectedMinute(undefined); setViewState('create'); }}
                onDelete={(m) => setDeleteMinuteModal({ isOpen: true, minute: m })}
              />
            }
          </>
        );
      default: return null;
    }
  };

  const renderDashboard = () => {
    const adminStats = currentUser.role === UserRole.ADMIN ? getAdminCharts() : null;
    
    // Derived Data for Notulis/Peserta Dashboards
    const upcomingMeeting = getUpcomingMeeting();
    const drafts = minutes.filter(m => m.status === MinuteStatus.DRAFT);
    const recentFinals = minutes.filter(m => m.status === MinuteStatus.FINAL).slice(0, 5); // Latest 5 finalized
    const unsignedMeetings = minutes.filter(m => 
      m.participants.some(p => p.userId === currentUser.id && p.attendance !== AttendanceStatus.HADIR)
    ).slice(0, 3); // Top 3 missed attendance

    // Find minutes where current user is PIC but hasn't signed yet
    const pendingPicSignatures = minutes.filter(m => 
      m.picId === currentUser.id && !m.picSignature
    );

    return (
       <div className="space-y-6">
         <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-slate-900">Dashboard {currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'notulis' ? 'Notulis' : 'Peserta'}</h1>
            <p className="text-slate-500 hidden sm:block">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
         </div>
         
         {/* --- STATS CARDS --- */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-slate-500 uppercase">Total Rapat</h3>
                <p className="text-3xl font-bold text-slate-900 mt-2">{minutes.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-primary">
                <FileText size={24} />
              </div>
            </div>

            {currentUser.role !== UserRole.PESERTA && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-500 uppercase">Draft Pending</h3>
                  <p className="text-3xl font-bold text-amber-500 mt-2">{drafts.length}</p>
                </div>
                <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
                  <PenTool size={24} />
                </div>
              </div>
            )}

            {currentUser.role === UserRole.ADMIN && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                   <h3 className="text-sm font-medium text-slate-500 uppercase">Total Pengguna</h3>
                   <p className="text-3xl font-bold text-blue-500 mt-2">{allUsers.length}</p>
                </div>
                <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-500">
                  <UserCheck size={24} />
                </div>
              </div>
            )}
            
            {currentUser.role === UserRole.PESERTA && (
               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                 <div>
                    <h3 className="text-sm font-medium text-slate-500 uppercase">Hadir</h3>
                    <p className="text-3xl font-bold text-green-500 mt-2">
                      {minutes.filter(m => m.participants.some(p => p.userId === currentUser.id && p.attendance === AttendanceStatus.HADIR)).length}
                    </p>
                 </div>
                 <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-500">
                    <CheckCircle size={24} />
                 </div>
               </div>
            )}
         </div>

         {/* --- ADMIN DASHBOARD --- */}
         {(currentUser.role === UserRole.ADMIN && adminStats) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="h-full min-h-[350px]">
                <BarChart data={adminStats.barData} title="Statistik Rapat per Unit" color="bg-blue-500" 
                   headerAction={<div className="flex gap-2">
                       <div className="relative">
                         <select value={statsMonth} onChange={(e) => setStatsMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))} className="text-sm border-slate-300 rounded-xl shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 appearance-none px-3 py-1 pr-8 bg-white bg-none text-slate-900 border">
                           <option value="all">Semua Bulan</option>
                           <option value="0">Januari</option>
                           <option value="1">Februari</option>
                           <option value="2">Maret</option>
                           <option value="3">April</option>
                           <option value="4">Mei</option>
                           <option value="5">Juni</option>
                           <option value="6">Juli</option>
                           <option value="7">Agustus</option>
                           <option value="8">September</option>
                           <option value="9">Oktober</option>
                           <option value="10">November</option>
                           <option value="11">Desember</option>
                         </select>
                         <ChevronDown size={14} className="absolute right-2 top-2 text-slate-500 pointer-events-none"/>
                       </div>
                       <div className="relative">
                         <select value={statsYear} onChange={(e) => setStatsYear(parseInt(e.target.value))} className="text-sm border-slate-300 rounded-xl shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 appearance-none px-3 py-1 pr-8 bg-white bg-none text-slate-900 border">
                           <option value={2024}>2024</option>
                           <option value={2025}>2025</option>
                           <option value={2026}>2026</option>
                         </select>
                         <ChevronDown size={14} className="absolute right-2 top-2 text-slate-500 pointer-events-none"/>
                       </div>
                   </div>}
                />
              </div>
              <div className="min-h-[320px]"><DonutChart data={adminStats.donutData} title="Komposisi Pengguna" /></div>
            </div>
         )}
         
         {/* --- NOTULIS DASHBOARD --- */}
         {currentUser.role === UserRole.NOTULIS && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {/* 1. Drafts needing attention */}
               <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200 bg-amber-50">
                     <h3 className="font-bold text-amber-800 flex items-center gap-2">
                        <AlertTriangle size={18}/> Draft Perlu Diselesaikan
                     </h3>
                  </div>
                  {drafts.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {drafts.map(m => (
                        <div key={m.id} className="p-4 hover:bg-slate-50 flex justify-between items-center group cursor-pointer" onClick={() => { setSelectedMinute(m); setViewState('edit'); setActiveTab('minutes'); }}>
                           <div>
                              <p className="font-semibold text-slate-800">{m.title}</p>
                              <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                <Calendar size={12}/> {new Date(m.date).toLocaleDateString('id-ID')}
                              </p>
                           </div>
                           <ChevronRight size={18} className="text-slate-300 group-hover:text-primary"/>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-500">
                       <CheckCircle size={32} className="mx-auto mb-2 text-green-400" />
                       <p>Semua pekerjaan beres! Tidak ada draft pending.</p>
                    </div>
                  )}
               </div>

               {/* 2. Recent Activity */}
               <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                     <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <Clock size={18}/> Baru Saja Final
                     </h3>
                  </div>
                  {recentFinals.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {recentFinals.map(m => (
                        <div key={m.id} className="p-4 hover:bg-slate-50 flex justify-between items-center group cursor-pointer" onClick={() => { setSelectedMinute(m); setViewState('edit'); setActiveTab('minutes'); }}>
                           <div>
                              <p className="font-semibold text-slate-800">{m.title}</p>
                              <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                <UserCheck size={12}/> {m.participants.length} Peserta
                              </p>
                           </div>
                           <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Final</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-500">
                       <p>Belum ada notulen yang diselesaikan.</p>
                    </div>
                  )}
               </div>
            </div>
         )}

         {/* --- PESERTA DASHBOARD --- */}
         {currentUser.role === UserRole.PESERTA && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. HIGHLIGHT: Upcoming Meeting */}
                <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl shadow-lg text-white p-6 relative overflow-hidden">
                   <div className="relative z-10">
                      <h3 className="text-blue-100 font-medium mb-1 uppercase text-xs tracking-wider">Agenda Rapat Berikutnya</h3>
                      {upcomingMeeting ? (
                        <>
                           <h2 className="text-2xl font-bold mb-4">{upcomingMeeting.title}</h2>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                                 <div className="flex items-center gap-2 text-blue-100 mb-1 text-xs">
                                    <Calendar size={14}/> Tanggal
                                 </div>
                                 <div className="font-semibold">{new Date(upcomingMeeting.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                              </div>
                              <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                                 <div className="flex items-center gap-2 text-blue-100 mb-1 text-xs">
                                    <Clock size={14}/> Jam
                                 </div>
                                 <div className="font-semibold">{upcomingMeeting.time} WIB</div>
                              </div>
                              <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm col-span-1 sm:col-span-2">
                                 <div className="flex items-center gap-2 text-blue-100 mb-1 text-xs">
                                    <MapPin size={14}/> Lokasi
                                 </div>
                                 <div className="font-semibold">{upcomingMeeting.location}</div>
                              </div>
                           </div>
                           <button 
                             onClick={() => { setSelectedMinute(upcomingMeeting); setViewState('edit'); setActiveTab('minutes'); }}
                             className="mt-6 bg-white text-blue-700 px-6 py-2 rounded-lg font-bold shadow-md hover:bg-blue-50 transition-colors w-full sm:w-auto"
                           >
                             Lihat Detail
                           </button>
                        </>
                      ) : (
                        <div className="py-8">
                           <p className="text-xl font-semibold opacity-90">Tidak ada agenda rapat dalam waktu dekat.</p>
                           <p className="text-blue-200 mt-2">Nikmati waktu luang Anda!</p>
                        </div>
                      )}
                   </div>
                   {/* Decoration */}
                   <Clock className="absolute -right-6 -bottom-6 text-white opacity-10" size={150} />
                </div>

                {/* 2. Action: Missed Attendance / Notulen Terbaru */}
                <div className="space-y-6">
                   {/* Recent Minutes Feed */}
                   <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">
                      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                         <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <FileText size={18}/> Notulen Terbaru
                         </h3>
                      </div>
                      <div className="divide-y divide-slate-100">
                         {recentFinals.length > 0 ? recentFinals.map(m => (
                            <div key={m.id} className="p-4 hover:bg-slate-50 cursor-pointer" onClick={() => { setSelectedMinute(m); setViewState('edit'); setActiveTab('minutes'); }}>
                               <p className="font-semibold text-slate-800 text-sm line-clamp-2">{m.title}</p>
                               <div className="flex justify-between items-center mt-2">
                                  <span className="text-xs text-slate-500">{new Date(m.date).toLocaleDateString('id-ID')}</span>
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Final</span>
                                </div>
                            </div>
                         )) : (
                            <div className="p-6 text-center text-slate-400 text-sm">Belum ada data.</div>
                         )}
                      </div>
                   </div>
                </div>

                {/* 3. Warning Row if Unsigned */}
                {unsignedMeetings.length > 0 && (
                  <div className="lg:col-span-3 bg-red-50 border border-red-100 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                     <div className="flex items-start gap-3">
                        <div className="bg-red-100 p-2 rounded-full text-red-600 mt-1">
                           <AlertCircle size={20} />
                        </div>
                        <div>
                           <h4 className="font-bold text-red-800">Anda belum mengisi kehadiran!</h4>
                           <p className="text-sm text-red-700">Tercatat {unsignedMeetings.length} rapat yang belum Anda konfirmasi kehadirannya.</p>
                        </div>
                     </div>
                     <button 
                       onClick={() => { setSelectedMinute(unsignedMeetings[0]); setViewState('edit'); setActiveTab('minutes'); }}
                       className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap shadow-sm"
                     >
                       Isi Kehadiran Sekarang
                     </button>
                  </div>
                )}
            </div>
         )}
         
         {/* --- ALERT: PIC Signature Needed (Moved to Bottom) --- */}
         {pendingPicSignatures.length > 0 && (
           <div className="bg-purple-50 border border-purple-100 rounded-xl p-6 mt-6 shadow-sm animate-in fade-in slide-in-from-bottom-2">
             <div className="flex items-start justify-between">
                <div className="flex gap-4 w-full">
                  <div className="bg-purple-100 p-3 rounded-full h-fit text-purple-600 shrink-0">
                     <PenLine size={24} />
                  </div>
                  <div className="w-full">
                     <h3 className="text-lg font-bold text-purple-900">Menunggu Tanda Tangan PIC</h3>
                     <p className="text-purple-700 text-sm mt-1">
                       Anda terdaftar sebagai PIC untuk {pendingPicSignatures.length} rapat yang belum ditandatangani.
                       Mohon segera lakukan validasi.
                     </p>
                     <div className="mt-4 space-y-2">
                       {pendingPicSignatures.map(m => (
                         <div key={m.id} className="flex items-center justify-between bg-white/60 p-3 rounded-lg border border-purple-100 shadow-sm">
                            <span className="text-sm font-medium text-purple-800 truncate mr-2">{m.title}</span>
                            <button 
                              onClick={() => openPicSignModal(m)}
                              className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700 transition-colors shrink-0"
                            >
                              Tanda Tangan
                            </button>
                         </div>
                       ))}
                     </div>
                  </div>
                </div>
             </div>
           </div>
         )}
       </div>
    );
  };

  return (
    <Layout 
      activeTab={activeTab} 
      onTabChange={(tab) => { setActiveTab(tab); setViewState('list'); }}
      currentUser={currentUser}
      onLogout={handleLogout}
    >
      {renderContent()}

      {/* Attendance Modal */}
      <Modal isOpen={attendanceModal.isOpen} onClose={() => setAttendanceModal(prev => ({...prev, isOpen: false}))}>
          <div className="bg-primary p-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg">Konfirmasi Kehadiran</h3>
              <button onClick={() => setAttendanceModal(prev => ({...prev, isOpen: false}))} className="hover:text-slate-200"><X size={24} /></button>
          </div>
          <div className="p-6">
              {attendanceModal.minute && (
                <>
                  <p className="text-slate-600 mb-4">Tanda tangan untuk konfirmasi kehadiran:</p>
                  <div className="mb-6"><SignaturePad ref={signaturePadRef} /></div>
                  <div className="flex gap-3">
                    <button onClick={() => setAttendanceModal(prev => ({...prev, isOpen: false}))} className="flex-1 py-2 bg-slate-100 rounded-lg">Batal</button>
                    <button onClick={confirmAttendance} disabled={isAttendanceSubmitting} className="flex-1 py-2 bg-primary text-white rounded-lg flex justify-center items-center">{isAttendanceSubmitting ? <Loader2 className="animate-spin" size={20} /> : "Simpan"}</button>
                  </div>
                </>
              )}
          </div>
      </Modal>

      {/* PIC Sign Modal */}
      <Modal isOpen={picSignModal.isOpen} onClose={() => setPicSignModal(prev => ({...prev, isOpen: false}))}>
          <div className="bg-purple-600 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg">Tanda Tangan PIC</h3>
              <button onClick={() => setPicSignModal(prev => ({...prev, isOpen: false}))} className="hover:text-slate-200"><X size={24} /></button>
          </div>
          <div className="p-6">
              {picSignModal.minute && (
                <>
                  <p className="text-slate-600 mb-4">Sebagai PIC Rapat, tanda tangani notulen ini untuk pengesahan:</p>
                  <div className="mb-6"><SignaturePad ref={signaturePadRef} /></div>
                  <div className="flex gap-3">
                    <button onClick={() => setPicSignModal(prev => ({...prev, isOpen: false}))} className="flex-1 py-2 bg-slate-100 rounded-lg">Batal</button>
                    <button onClick={confirmPicSign} disabled={isAttendanceSubmitting} className="flex-1 py-2 bg-purple-600 text-white rounded-lg flex justify-center items-center">{isAttendanceSubmitting ? <Loader2 className="animate-spin" size={20} /> : "Simpan Tanda Tangan"}</button>
                  </div>
                </>
              )}
          </div>
      </Modal>

      <Modal isOpen={deleteMinuteModal.isOpen} onClose={() => setDeleteMinuteModal({ isOpen: false, minute: null })}>
          <div className="p-6 text-center">
              <Trash2 className="mx-auto text-red-600 mb-4" size={32} />
              <h3 className="text-lg font-bold mb-2">Hapus Notulen?</h3>
              <p className="text-slate-500 mb-6">Anda yakin ingin menghapus "{deleteMinuteModal.minute?.title}"?</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteMinuteModal({ isOpen: false, minute: null })} className="flex-1 py-2 bg-slate-100 rounded-lg">Batal</button>
                <button onClick={confirmDeleteMinute} className="flex-1 py-2 bg-red-600 text-white rounded-lg">Hapus</button>
              </div>
          </div>
      </Modal>
    </Layout>
  );
};

export default App;