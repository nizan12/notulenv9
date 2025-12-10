
import React, { useState, useEffect, useRef } from 'react';
import { getGlobalSettings, saveGlobalSettings } from '../services/firestoreService';
import { GlobalSettings } from '../types';
import { Save, Upload, Loader2, Image as ImageIcon, Trash2, Settings, LayoutTemplate } from 'lucide-react';
import { useToast } from './Toast';

const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<GlobalSettings>({});
  
  // Preview States
  const [logoPreview, setLogoPreview] = useState<string>(''); // PDF Logo
  const [sidebarLogoPreview, setSidebarLogoPreview] = useState<string>(''); // Sidebar Logo

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sidebarFileInputRef = useRef<HTMLInputElement>(null);
  
  const { showToast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const data = await getGlobalSettings();
      setSettings(data);
      if (data.logoBase64) {
        setLogoPreview(data.logoBase64);
      }
      if (data.sidebarLogoBase64) {
        setSidebarLogoPreview(data.sidebarLogoBase64);
      }
    } catch (error) {
      showToast('Gagal memuat pengaturan', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for PDF Logo
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { 
      showToast("Ukuran file logo terlalu besar. Maksimal 2MB", 'error');
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogoPreview(base64);
      setSettings(prev => ({ ...prev, logoBase64: base64 }));
    };
  };

  // Handler for Sidebar Logo
  const handleSidebarImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { 
      showToast("Ukuran file logo terlalu besar. Maksimal 2MB", 'error');
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSidebarLogoPreview(base64);
      setSettings(prev => ({ ...prev, sidebarLogoBase64: base64 }));
    };
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    setSettings(prev => ({ ...prev, logoBase64: '' }));
  };

  const handleRemoveSidebarLogo = () => {
    setSidebarLogoPreview('');
    setSettings(prev => ({ ...prev, sidebarLogoBase64: '' }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveGlobalSettings(settings);
      showToast('Pengaturan berhasil disimpan');
      // Force reload page to apply changes specifically for Layout to catch up
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      showToast('Gagal menyimpan pengaturan', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center gap-3 mb-6">
        <Settings size={28} className="text-slate-900" />
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Pengaturan Global</h2>
          <p className="text-slate-500">Konfigurasi tampilan aplikasi dan dokumen</p>
        </div>
      </div>

      {/* SECTION 1: SIDEBAR LOGO */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <LayoutTemplate size={18} /> Logo Aplikasi (Sidebar)
          </h3>
        </div>
        
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-full md:w-1/3 flex flex-col items-center space-y-3">
              <div className="w-full aspect-square md:w-48 md:h-48 bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center relative overflow-hidden group">
                {sidebarLogoPreview ? (
                  <>
                    <img src={sidebarLogoPreview} alt="Logo Sidebar" className="w-full h-full object-contain p-2" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={handleRemoveSidebarLogo}
                        className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                        title="Hapus Logo"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <LayoutTemplate className="mx-auto text-slate-300 mb-2" size={40} />
                    <p className="text-xs text-slate-400">Belum ada logo</p>
                  </div>
                )}
              </div>
              <input 
                type="file" 
                ref={sidebarFileInputRef} 
                className="hidden" 
                accept="image/png, image/jpeg, image/svg+xml"
                onChange={handleSidebarImageChange}
              />
              <button 
                onClick={() => sidebarFileInputRef.current?.click()}
                className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
              >
                <Upload size={14} /> Upload Logo Sidebar
              </button>
            </div>

            <div className="flex-1 space-y-4">
               <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                 <h4 className="font-bold text-blue-800 text-sm mb-1">Informasi Logo Aplikasi</h4>
                 <p className="text-sm text-blue-700">
                   Logo ini akan ditampilkan di pojok kiri atas (Sidebar Menu) dan Mobile Header.
                 </p>
                 <p className="text-xs text-blue-600 mt-2 italic">
                   Disarankan menggunakan format PNG transparan atau SVG dengan aspek rasio persegi atau horizontal.
                 </p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: PDF LOGO */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <ImageIcon size={18} /> Logo Dokumen (PDF)
          </h3>
        </div>
        
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-full md:w-1/3 flex flex-col items-center space-y-3">
              <div className="w-full aspect-square md:w-48 md:h-48 bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center relative overflow-hidden group">
                {logoPreview ? (
                  <>
                    <img src={logoPreview} alt="Logo Dokumen" className="w-full h-full object-contain p-2" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={handleRemoveLogo}
                        className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                        title="Hapus Logo"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <ImageIcon className="mx-auto text-slate-300 mb-2" size={40} />
                    <p className="text-xs text-slate-400">Belum ada logo</p>
                  </div>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/png, image/jpeg"
                onChange={handleImageChange}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
              >
                <Upload size={14} /> Upload Logo PDF
              </button>
            </div>

            <div className="flex-1 space-y-4">
               <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                 <h4 className="font-bold text-amber-800 text-sm mb-1">Informasi Logo Dokumen</h4>
                 <p className="text-sm text-amber-700">
                   Logo ini khusus untuk Header (Kop Surat) pada file PDF yang didownload.
                 </p>
                 <ul className="list-disc list-inside text-sm text-amber-700 mt-2 space-y-1">
                   <li>Header Notulen Rapat</li>
                   <li>Header Daftar Hadir</li>
                 </ul>
               </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-all disabled:opacity-70"
          >
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {isSaving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
