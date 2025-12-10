
import React, { useState, useRef, useEffect } from 'react';
import { User, Unit } from '../types';
import { updateUser, getUnits } from '../services/firestoreService';
import { Save, UserCircle, Camera, Loader2, Lock, KeyRound, CheckCircle, X } from 'lucide-react';
import { useToast } from './Toast';
import Modal from './Modal';

interface ProfileProps {
  user: User;
  onUpdate: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdate }) => {
  // General Profile State
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || '');
  const [photoBase64, setPhotoBase64] = useState(user.photo_user || user.photoBase64 || '');
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [unitName, setUnitName] = useState('');
  
  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  
  // Image Preview State
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const { showToast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Unit Name
  useEffect(() => {
    const fetchUnitInfo = async () => {
      if (user.unitId) {
        try {
          const units = await getUnits();
          const found = units.find(u => u.id === user.unitId);
          if (found) {
            setUnitName(found.name);
          } else {
            setUnitName('-');
          }
        } catch (error) {
          console.error("Error fetching unit name:", error);
        }
      }
    };
    fetchUnitInfo();
  }, [user.unitId]);

  // --- Handle Profile Update ---
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProfileLoading(true);
    try {
      await updateUser(user.id!, { name, email, phone, photo_user: photoBase64 });
      showToast('Profil berhasil diperbarui');
      onUpdate();
    } catch (error) {
      console.error(error);
      showToast('Gagal memperbarui profil', 'error');
    } finally {
      setIsProfileLoading(false);
    }
  };

  // --- Handle Password Update ---
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast("Mohon isi semua kolom password", 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("Password baru dan konfirmasi tidak cocok", 'error');
      return;
    }

    if (newPassword.length < 4) {
      showToast("Password baru terlalu pendek (min 4 karakter)", 'error');
      return;
    }

    // 2. Validate current password (Client-side check since we have user data)
    // Note: In a production app with hashed passwords, this check happens on the server.
    if (currentPassword !== user.password) {
      showToast("Password saat ini salah", 'error');
      return;
    }

    setIsPasswordLoading(true);
    try {
      await updateUser(user.id!, { password: newPassword });
      showToast("Password berhasil diubah");
      // Reset password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onUpdate();
    } catch (error) {
      console.error(error);
      showToast("Gagal mengubah password", 'error');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  // --- Image Helpers ---
  const resizeAndCompressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_SIZE = 800;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      showToast("Ukuran file terlalu besar. Maksimal 3MB", 'error');
      return;
    }

    setIsProfileLoading(true);
    try {
      const compressedBase64 = await resizeAndCompressImage(file);
      setPhotoBase64(compressedBase64);
    } catch (error) {
      console.error("Error processing image", error);
      showToast("Gagal memproses gambar", 'error');
    } finally {
      setIsProfileLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <h2 className="text-2xl font-bold text-slate-900">Pengaturan Akun</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Photo & Role Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 flex flex-col items-center">
             <div className="relative group mb-4">
               {/* Click Main Circle to Preview */}
               <div 
                 className={`w-32 h-32 rounded-full border-4 border-slate-100 shadow-inner overflow-hidden bg-slate-50 flex items-center justify-center relative ${photoBase64 ? 'cursor-pointer' : ''}`}
                 onClick={() => photoBase64 && setPreviewImage(photoBase64)}
               >
                 {isProfileLoading ? (
                    <Loader2 className="animate-spin text-primary" size={32} />
                 ) : photoBase64 ? (
                   <img src={photoBase64} alt="Profile" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                 ) : (
                   <UserCircle size={80} className="text-slate-300" />
                 )}
               </div>
               
               {/* Camera Icon - Click to Upload */}
               <div 
                 className="absolute bottom-1 right-1 bg-primary text-white p-2 rounded-full shadow-lg border-2 border-white cursor-pointer hover:bg-blue-700 transition-colors"
                 onClick={(e) => { e.stopPropagation(); !isProfileLoading && fileInputRef.current?.click(); }}
                 title="Ganti Foto"
               >
                  <Camera size={16} />
               </div>
             </div>
             
             <input 
               type="file" 
               ref={fileInputRef} 
               className="hidden" 
               accept="image/*"
               onChange={handleImageChange}
             />
             
             <div className="text-center w-full">
               <h3 className="text-xl font-bold text-slate-900">{user.name}</h3>
               <p className="text-sm text-slate-500 mb-2 px-2 break-all">{user.email}</p>
               <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase inline-block
                 ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                   user.role === 'notulis' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
               `}>
                 {user.role}
               </span>
             </div>
             
             <div className="mt-6 w-full pt-6 border-t border-slate-100">
                <div className="flex justify-between items-center text-sm text-slate-600 mb-2">
                  <span>NIK</span>
                  <span className="font-mono font-medium">{user.nik}</span>
                </div>
                {user.unitId && (
                  <div className="flex justify-between items-center text-sm text-slate-600">
                    <span>Unit</span>
                    <span className="font-medium truncate ml-4" title={unitName}>{unitName || 'Memuat...'}</span>
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* Right Column: Forms */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* General Info Form */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
               <UserCircle size={20} className="text-slate-500" />
               <h3 className="font-semibold text-slate-900">Data Diri</h3>
             </div>
             
             <form onSubmit={handleProfileSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                    <input 
                      required
                      type="text" 
                      value={name} 
                      onChange={e => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input 
                      required
                      type="email" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">No Handphone</label>
                  <input 
                    type="tel" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    placeholder="Contoh: 08123456789"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button 
                    type="submit"
                    disabled={isProfileLoading}
                    className="bg-primary hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg shadow-sm flex items-center gap-2 transition-all disabled:opacity-70"
                  >
                    {isProfileLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    {isProfileLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
             </form>
          </div>

          {/* Password Form */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
               <Lock size={20} className="text-slate-500" />
               <h3 className="font-semibold text-slate-900">Keamanan / Password</h3>
             </div>
             
             <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Password Saat Ini</label>
                   <div className="relative">
                     <KeyRound className="absolute left-3 top-2.5 text-slate-400" size={16} />
                     <input 
                       required
                       type="password" 
                       value={currentPassword} 
                       onChange={e => setCurrentPassword(e.target.value)}
                       className="w-full pl-10 pr-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                       placeholder="Masukkan password lama"
                     />
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Password Baru</label>
                     <input 
                       required
                       type="password" 
                       value={newPassword} 
                       onChange={e => setNewPassword(e.target.value)}
                       className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                       placeholder="Minimal 4 karakter"
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Konfirmasi Password</label>
                     <input 
                       required
                       type="password" 
                       value={confirmPassword} 
                       onChange={e => setConfirmPassword(e.target.value)}
                       className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                       placeholder="Ulangi password baru"
                     />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button 
                    type="submit"
                    disabled={isPasswordLoading}
                    className="bg-slate-800 hover:bg-slate-900 text-white font-medium py-2 px-6 rounded-lg shadow-sm flex items-center gap-2 transition-all disabled:opacity-70"
                  >
                    {isPasswordLoading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                    {isPasswordLoading ? 'Memproses...' : 'Ganti Password'}
                  </button>
                </div>
             </form>
          </div>

        </div>
      </div>

      {/* --- Image Preview Modal --- */}
      <Modal isOpen={!!previewImage} onClose={() => setPreviewImage(null)} maxWidth="max-w-4xl">
         <div className="relative bg-black flex justify-center items-center">
            <button 
               onClick={() => setPreviewImage(null)}
               className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full transition-colors z-10"
            >
               <X size={24}/>
            </button>
            {previewImage && (
               <img 
                  src={previewImage} 
                  alt="Full Preview" 
                  className="max-h-[80vh] w-auto object-contain"
               />
            )}
         </div>
      </Modal>
    </div>
  );
};

export default Profile;
