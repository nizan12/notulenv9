
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Unit } from '../types';
import { getUsers, createUser, updateUser, deleteUser, getUnits, createUnit } from '../services/firestoreService';
import { Trash2, Plus, User as UserIcon, Edit, X, AlertTriangle, Loader2, FileSpreadsheet, Download, Upload, Info, ChevronDown, ChevronRight, Search, Filter, CheckSquare, Square, Minus, Eye, Phone, Mail, Hash, Calendar, Building2 } from 'lucide-react';
import Modal from './Modal';
import { useToast } from './Toast';
import { utils, writeFile, read } from 'xlsx';
import Pagination from './Pagination';

interface UserManagerProps {
  roleFilter?: UserRole; // If provided, only manages users of this role
  title?: string;
}

const UserManager: React.FC<UserManagerProps> = ({ roleFilter, title = "Kelola Pengguna" }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  
  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // View User & Image Preview State
  const [viewUser, setViewUser] = useState<User | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, isBulk: boolean, id: string | null, name: string}>({
    isOpen: false, isBulk: false, id: null, name: ''
  });
  const [showUnitsList, setShowUnitsList] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { showToast } = useToast();
  
  // Form State
  const [nik, setNik] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(roleFilter || UserRole.PESERTA);
  const [unitId, setUnitId] = useState('');
  const [phone, setPhone] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // File Input Ref for Import
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [roleFilter]);

  // Reset pagination and selection when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchTerm, filterUnit]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersData, unitsData] = await Promise.all([
        getUsers(roleFilter), 
        getUnits()
      ]);
      setUsers(usersData);
      setUnits(unitsData);
      // Set default unit for dropdown if creating new and units exist
      if (unitsData.length > 0 && !unitId) setUnitId(unitsData[0].id!);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Filtering Logic ---
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      user.nik.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesUnit = filterUnit ? user.unitId === filterUnit : true;
    
    return matchesSearch && matchesUnit;
  });

  // --- Pagination Logic ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  // --- Selection Logic ---
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      // Select all displayed users (filtered)
      const allIds = new Set(selectedIds);
      filteredUsers.forEach(u => {
        if (u.id) allIds.add(u.id);
      });
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const isAllSelected = filteredUsers.length > 0 && filteredUsers.every(u => u.id && selectedIds.has(u.id));
  const isIndeterminate = selectedIds.size > 0 && !isAllSelected;

  // --- CRUD Logic ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const userData: Partial<User> = {
      nik, name, email, role, unitId, phone
    };

    try {
      if (editingId) {
        await updateUser(editingId, userData);
        showToast('Data pengguna berhasil diperbarui');
      } else {
        userData.password = nik;
        await createUser(userData);
        showToast('Pengguna berhasil ditambahkan');
      }
      
      closeFormModal();
      loadData();
    } catch (error) {
      console.error("Failed to save user", error);
      showToast('Gagal menyimpan data pengguna', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingId(user.id!);
    setNik(user.nik);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setUnitId(user.unitId || (units.length > 0 ? units[0].id! : ''));
    setPhone(user.phone || '');
    setIsFormModalOpen(true);
  };

  // Handle View Click
  const handleView = (user: User) => {
    setViewUser(user);
  };

  const handleDeleteClick = (user: User) => {
    setDeleteModal({ isOpen: true, isBulk: false, id: user.id!, name: user.name });
  };

  const handleBulkDeleteClick = () => {
    setDeleteModal({ isOpen: true, isBulk: true, id: null, name: `${selectedIds.size} Pengguna Terpilih` });
  };

  const confirmDelete = async () => {
    setIsLoading(true);
    try {
      if (deleteModal.isBulk) {
        // Bulk Delete
        const promises = Array.from(selectedIds).map((id) => deleteUser(id as string));
        await Promise.all(promises);
        showToast(`${selectedIds.size} pengguna berhasil dihapus`);
        setSelectedIds(new Set());
      } else if (deleteModal.id) {
        // Single Delete
        await deleteUser(deleteModal.id as string);
        showToast('Pengguna berhasil dihapus');
      }
      
      loadData();
      setDeleteModal({ isOpen: false, isBulk: false, id: null, name: '' });
    } catch (error) {
      console.error("Error deleting user", error);
      showToast('Gagal menghapus data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setNik('');
    setName('');
    setEmail('');
    setRole(roleFilter || UserRole.PESERTA);
    setPhone('');
    if (units.length > 0) setUnitId(units[0].id!);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setTimeout(resetForm, 300);
  };

  // --- Excel Import Logic ---
  const downloadTemplate = () => {
    const headers = [
      { NIK: '123456', Nama: 'Contoh Nama', Email: 'email@contoh.com', Role: 'peserta', Nama_Unit: 'Teknik Informatika', No_HP: '08123456789' }
    ];
    const wsMain = utils.json_to_sheet(headers);
    const unitReferenceData = units.map(u => ({ "UNIT TERSEDIA (COPY DARI SINI)": u.name }));
    if (unitReferenceData.length === 0) unitReferenceData.push({ "UNIT TERSEDIA (COPY DARI SINI)": "Belum ada unit terdaftar" });
    const wsRef = utils.json_to_sheet(unitReferenceData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, wsMain, "Template_User");
    utils.book_append_sheet(wb, wsRef, "Referensi_Unit");
    writeFile(wb, "Template_Import_User.xlsx");
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = utils.sheet_to_json(worksheet);

      let successCount = 0;
      let failCount = 0;
      let createdUnitsCount = 0;
      let currentUnits = [...units];

      for (const row of jsonData) {
        if (!row.NIK || !row.Nama || !row.Email) {
          failCount++;
          continue;
        }

        const excelUnitName = row.Nama_Unit ? row.Nama_Unit.toString().trim() : '';
        let mappedUnitId = '';

        if (excelUnitName) {
          const foundUnit = currentUnits.find(u => u.name.toLowerCase() === excelUnitName.toLowerCase());
          if (foundUnit) {
            mappedUnitId = foundUnit.id!;
          } else {
            try {
              const newId = await createUnit({ name: excelUnitName });
              const newUnitObj: Unit = { id: newId, name: excelUnitName, createdAt: new Date() };
              currentUnits.push(newUnitObj);
              mappedUnitId = newId;
              createdUnitsCount++;
            } catch (uErr) {
              console.error(`Failed to auto-create unit: ${excelUnitName}`, uErr);
            }
          }
        }

        let mappedRole = UserRole.PESERTA;
        if (row.Role) {
          const r = row.Role.toString().toLowerCase();
          if (r === 'admin') mappedRole = UserRole.ADMIN;
          else if (r === 'notulis') mappedRole = UserRole.NOTULIS;
        }
        if (roleFilter) mappedRole = roleFilter;

        const newUser: Partial<User> = {
          nik: row.NIK.toString(),
          name: row.Nama,
          email: row.Email,
          role: mappedRole,
          unitId: mappedUnitId,
          phone: row.No_HP ? row.No_HP.toString() : '',
          password: row.NIK.toString()
        };

        try {
          await createUser(newUser);
          successCount++;
        } catch (err) {
          failCount++;
        }
      }

      let msg = `Import: ${successCount} Berhasil, ${failCount} Gagal.`;
      if (createdUnitsCount > 0) msg += ` (${createdUnitsCount} Unit baru)`;
      showToast(msg, successCount > 0 ? 'success' : 'error');
      setIsImportModalOpen(false);
      loadData();
    } catch (error) {
      showToast("Gagal memproses file Excel", 'error');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 line-clamp-1">{title}</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg font-medium flex items-center justify-center gap-2 shadow-sm transition-colors text-sm md:text-base"
          >
            <FileSpreadsheet size={18} /> <span className="hidden sm:inline">Import Excel</span>
          </button>
          <button 
            onClick={() => { resetForm(); setIsFormModalOpen(true); }}
            className="flex-1 sm:flex-none bg-primary hover:bg-blue-700 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg font-medium flex items-center justify-center gap-2 shadow-sm transition-colors text-sm md:text-base"
          >
            <Plus size={18} /> <span className="hidden sm:inline">Tambah</span> {roleFilter === UserRole.PESERTA ? 'Peserta' : 'User'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        
        {/* --- Filter Bar --- */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between">
           <div className="relative w-full md:w-1/3">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Cari Nama / NIK / Email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none text-slate-900"
              />
           </div>
           
           <div className="flex gap-4 w-full md:w-auto items-center">
             <div className="flex items-center gap-2 text-slate-600">
               <Filter size={18} />
               <span className="text-sm font-medium">Filter:</span>
             </div>
             <div className="relative w-full md:w-64">
                <select 
                  value={filterUnit}
                  onChange={(e) => setFilterUnit(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 bg-white bg-none border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none appearance-none text-slate-900 cursor-pointer"
                >
                  <option value="">Semua Unit</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
             </div>
           </div>
        </div>

        {/* --- Bulk Action Bar (Visible when selected) --- */}
        {selectedIds.size > 0 && (
          <div className="bg-blue-50 px-6 py-3 border-b border-blue-100 flex justify-between items-center animate-in fade-in slide-in-from-top-1">
             <div className="flex items-center gap-2 text-blue-800 font-medium">
                <CheckSquare size={18} />
                <span>{selectedIds.size} Pengguna Dipilih</span>
             </div>
             <button 
               onClick={handleBulkDeleteClick}
               className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
             >
                <Trash2 size={16} /> Hapus Terpilih
             </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 w-10">
                   <div className="flex items-center">
                     <input 
                       type="checkbox" 
                       className="form-checkbox w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer"
                       style={{ accentColor: '#2563EB' }}
                       checked={isAllSelected}
                       ref={input => { if (input) input.indeterminate = isIndeterminate; }}
                       onChange={handleSelectAll}
                     />
                   </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Nama / NIK</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Kontak</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {currentUsers.map((user) => (
                <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(user.id!) ? 'bg-blue-50/50' : ''}`}>
                  <td className="px-6 py-4">
                     <input 
                       type="checkbox" 
                       className="form-checkbox w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer"
                       style={{ accentColor: '#2563EB' }}
                       checked={selectedIds.has(user.id!)}
                       onChange={() => handleSelectOne(user.id!)}
                     />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div 
                        className={`h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mr-3 overflow-hidden border border-slate-200 shrink-0 ${user.photo_user || user.photoBase64 ? 'cursor-pointer hover:opacity-80' : ''}`}
                        onClick={() => (user.photo_user || user.photoBase64) && setPreviewImage(user.photo_user || user.photoBase64)}
                      >
                        {user.photo_user || user.photoBase64 ? (
                          <img src={user.photo_user || user.photoBase64} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon size={18} />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">{user.name}</div>
                        <div className="text-xs text-slate-500">NIK: {user.nik}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-800' : 
                        user.role === UserRole.NOTULIS ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {units.find(u => u.id === user.unitId)?.name || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    <div title={user.email}>{user.email}</div>
                    <div className="text-xs text-slate-400">{user.phone || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleView(user)} 
                        className="text-slate-500 hover:text-primary p-2 hover:bg-slate-100 rounded-full transition-colors"
                        title="Lihat Detail"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => handleEdit(user)} 
                        className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-full transition-colors"
                        title="Edit Pengguna"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(user)} 
                        className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-full transition-colors"
                        title="Hapus Pengguna"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center">
                       <Search size={32} className="text-slate-300 mb-2" />
                       <p className="font-medium">Tidak ada data ditemukan</p>
                       <p className="text-xs">Coba ubah kata kunci pencarian atau filter unit.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <Pagination 
          currentPage={currentPage}
          totalItems={filteredUsers.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* --- View User Detail Modal --- */}
      <Modal isOpen={!!viewUser} onClose={() => setViewUser(null)}>
        {viewUser && (
          <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden">
             {/* Modal Header */}
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                   <UserIcon size={20} className="text-primary" /> Detail Pengguna
                </h3>
                <button 
                  onClick={() => setViewUser(null)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={22} />
                </button>
             </div>
             
             {/* Modal Content */}
             <div className="p-6 overflow-y-auto">
                <div className="flex flex-col items-center mb-6">
                   <div 
                     className={`w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-lg flex items-center justify-center overflow-hidden mb-3 text-slate-400 ${viewUser.photo_user || viewUser.photoBase64 ? 'cursor-pointer hover:opacity-90' : ''}`}
                     onClick={() => (viewUser.photo_user || viewUser.photoBase64) && setPreviewImage(viewUser.photo_user || viewUser.photoBase64)}
                   >
                      {viewUser.photo_user || viewUser.photoBase64 ? (
                        <img src={viewUser.photo_user || viewUser.photoBase64} alt={viewUser.name} className="w-full h-full object-cover"/>
                      ) : (
                        <UserIcon size={48} />
                      )}
                   </div>
                   <h2 className="text-xl font-bold text-slate-900 text-center">{viewUser.name}</h2>
                   <span className={`mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase
                      ${viewUser.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-800' : 
                        viewUser.role === UserRole.NOTULIS ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                      {viewUser.role}
                   </span>
                </div>

                <div className="grid grid-cols-1 gap-4 text-sm">
                   <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-3">
                      <div className="bg-white p-2 rounded text-slate-500 shadow-sm"><Hash size={16}/></div>
                      <div>
                         <p className="text-xs text-slate-400">NIK (Nomor Induk)</p>
                         <p className="font-semibold text-slate-800">{viewUser.nik}</p>
                      </div>
                   </div>

                   <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-3">
                      <div className="bg-white p-2 rounded text-slate-500 shadow-sm"><Building2 size={16}/></div>
                      <div>
                         <p className="text-xs text-slate-400">Unit / Bagian</p>
                         <p className="font-semibold text-slate-800">
                            {units.find(u => u.id === viewUser.unitId)?.name || '-'}
                         </p>
                      </div>
                   </div>

                   <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-3">
                      <div className="bg-white p-2 rounded text-slate-500 shadow-sm"><Mail size={16}/></div>
                      <div className="min-w-0">
                         <p className="text-xs text-slate-400">Email Address</p>
                         <p className="font-semibold text-slate-800 truncate" title={viewUser.email}>{viewUser.email}</p>
                      </div>
                   </div>

                   <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-3">
                      <div className="bg-white p-2 rounded text-slate-500 shadow-sm"><Phone size={16}/></div>
                      <div>
                         <p className="text-xs text-slate-400">No Handphone / WA</p>
                         <p className="font-semibold text-slate-800">{viewUser.phone || '-'}</p>
                      </div>
                   </div>
                   
                   <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-3">
                      <div className="bg-white p-2 rounded text-slate-500 shadow-sm"><Calendar size={16}/></div>
                      <div>
                         <p className="text-xs text-slate-400">Terdaftar Sejak</p>
                         <p className="font-semibold text-slate-800">
                           {viewUser.createdAt?.toDate 
                              ? viewUser.createdAt.toDate().toLocaleDateString('id-ID') 
                              : (viewUser.createdAt ? new Date(viewUser.createdAt).toLocaleDateString('id-ID') : '-')}
                         </p>
                      </div>
                   </div>
                </div>
             </div>
             
             {/* Footer Actions */}
             <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                <button 
                  onClick={() => { setViewUser(null); handleEdit(viewUser); }}
                  className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  <Edit size={16}/> Edit Profil
                </button>
                <button 
                   onClick={() => setViewUser(null)} 
                   className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg text-sm transition-colors"
                >
                   Tutup
                </button>
             </div>
          </div>
        )}
      </Modal>

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

      {/* Form Modal (Create/Edit) */}
      <Modal isOpen={isFormModalOpen} onClose={closeFormModal}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingId ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
              </h3>
              <button onClick={closeFormModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Form Fields */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">NIK (ID)</label>
                <input 
                  required 
                  type="text" 
                  value={nik} 
                  onChange={e => setNik(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                  placeholder="NIK akan digunakan sebagai Password awal"
                />
              </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <div className="relative">
                    <select 
                      value={role} 
                      onChange={e => setRole(e.target.value as UserRole)} 
                      className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg bg-white bg-none text-slate-900 focus:ring-2 focus:ring-primary outline-none appearance-none"
                      disabled={!!roleFilter}
                    >
                      <option value={UserRole.ADMIN}>Admin</option>
                      <option value={UserRole.NOTULIS}>Notulis</option>
                      <option value={UserRole.PESERTA}>Peserta</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                  <div className="relative">
                    <select 
                      value={unitId} 
                      onChange={e => setUnitId(e.target.value)} 
                      className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg bg-white bg-none text-slate-900 focus:ring-2 focus:ring-primary outline-none appearance-none"
                    >
                      {units.map(u => <option key={u.id} value={u.id!}>{u.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">No HP</label>
                <input 
                  type="tel" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                  placeholder="0812..."
                />
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={closeFormModal} 
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                  disabled={isLoading}
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="animate-spin" size={16} />}
                  {editingId ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)}>
         <div className="p-6">
           <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="text-green-600" size={24}/> Import User dari Excel
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
           </div>
           
           <div className="space-y-6">
              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 space-y-2">
                 <div className="flex items-start gap-2">
                    <Info size={18} className="shrink-0 mt-0.5"/>
                    <div>
                      <span className="font-bold">Tips Import:</span>
                      <ul className="list-disc list-inside mt-1 ml-1 space-y-1">
                        <li>Download template agar format kolom sesuai.</li>
                        <li>Sheet ke-2 berisi daftar Unit yang tersedia.</li>
                      </ul>
                    </div>
                 </div>
              </div>

              {/* Units List Toggle */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <button 
                  onClick={() => setShowUnitsList(!showUnitsList)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-medium text-slate-700"
                >
                   <span>Lihat Daftar Unit Tersedia ({units.length})</span>
                   {showUnitsList ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                </button>
                {showUnitsList && (
                  <div className="p-4 bg-white max-h-40 overflow-y-auto text-sm border-t border-slate-200">
                    {units.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {units.map(u => (
                          <span key={u.id} className="px-2 py-1 bg-slate-100 rounded text-slate-600 border border-slate-200">
                            {u.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic">Belum ada unit terdaftar.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={downloadTemplate}
                  className="py-3 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors"
                >
                  <Download size={18}/> Download Template
                </button>

                <div className="relative">
                  <input 
                    type="file" 
                    accept=".xlsx, .xls"
                    onChange={handleFileImport}
                    className="hidden"
                    id="excel-upload"
                    ref={fileInputRef}
                    disabled={isImporting}
                  />
                  <label 
                    htmlFor="excel-upload"
                    className={`w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg cursor-pointer flex items-center justify-center gap-2 transition-colors ${isImporting ? 'opacity-70 cursor-wait' : ''}`}
                  >
                      {isImporting ? <Loader2 className="animate-spin" size={18}/> : <Upload size={18}/>}
                      <span>{isImporting ? 'Mengupload...' : 'Upload File Excel'}</span>
                  </label>
                </div>
              </div>
           </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal (Handles Bulk & Single) */}
      <Modal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, isBulk: false, id: null, name: '' })}>
          <div className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Konfirmasi Hapus</h3>
              <p className="text-slate-500 text-sm mb-6">
                Apakah Anda yakin ingin menghapus <br/>
                <span className="font-semibold text-slate-900">{deleteModal.name}</span>?
                <br/>Tindakan ini tidak dapat dibatalkan.
              </p>
              
              <div className="flex w-full gap-3">
                <button 
                  onClick={() => setDeleteModal({ isOpen: false, isBulk: false, id: null, name: '' })}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
                  disabled={isLoading}
                >
                  Batal
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm transition-colors flex justify-center items-center gap-2"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                  <span>Ya, Hapus</span>
                </button>
              </div>
            </div>
          </div>
      </Modal>
    </div>
  );
};

export default UserManager;
