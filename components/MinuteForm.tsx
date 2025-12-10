
import React, { useState, useEffect, useRef } from 'react';
import { Minute, MinuteStatus, User, Unit, Participant, AttendanceStatus, UserRole, Attachment, MinuteItem } from '../types';
import { getUsers, getUnits, createUser, createUnit } from '../services/firestoreService';
import { sendWhatsAppInvitation } from '../services/notificationService';
import { 
  Save, X, Plus, Trash2, UserPlus, ArrowLeft, 
  Paperclip, ExternalLink, Image as ImageIcon, 
  File, FileText, Search, Check, Building2,
  MessageCircle, Bell, BellOff, Clock, UserCheck, ToggleLeft, ToggleRight, Type, Users, User as UserIcon,
  Hash, Mail, Phone, PlusCircle, List, PenTool, ChevronDown, Loader2
} from 'lucide-react';
import Modal from './Modal';
import { useToast } from './Toast';
import { Editor } from '@tinymce/tinymce-react';

interface MinuteFormProps {
  initialData?: Minute;
  onSubmit: (data: Partial<Minute>) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  userUnitId?: string; // The unit ID of the current logged in Notulis
  readOnly?: boolean;
  currentUserId?: string;
  onAttendanceAction?: (minute: Minute) => void;
}

const MinuteForm: React.FC<MinuteFormProps> = ({ initialData, onSubmit, onCancel, isLoading, userUnitId, readOnly = false, currentUserId, onAttendanceAction }) => {
  // Local state for form fields
  const [title, setTitle] = useState(initialData?.title || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(initialData?.time || '09:00');
  const [location, setLocation] = useState(initialData?.location || '');
  
  // New PIC Field
  const [picId, setPicId] = useState(initialData?.picId || '');
  // Custom Searchable Dropdown State for PIC
  const [isPicDropdownOpen, setIsPicDropdownOpen] = useState(false);
  const [picSearchTerm, setPicSearchTerm] = useState('');

  // New Agenda Items State
  // Default to one empty item with Topic/PIC/Monitor in one row logic
  const [items, setItems] = useState<MinuteItem[]>(initialData?.items || [{
    topic: '', decision: '', action: '', pic: '', monitoring: ''
  }]);
  
  // Track which items/fields use Rich Text
  // Key format: `${index}_decision` or `${index}_action`
  const [richTextState, setRichTextState] = useState<Record<string, boolean>>({});

  const [status, setStatus] = useState<MinuteStatus>(initialData?.status || MinuteStatus.DRAFT);
  const [unitId, setUnitId] = useState(initialData?.unitId || userUnitId || '');
  const [participants, setParticipants] = useState<Participant[]>(initialData?.participants || []);
  const [attachments, setAttachments] = useState<Attachment[]>(initialData?.attachments || []);
  
  // State for new attachment input
  const [isAttachmentUploading, setIsAttachmentUploading] = useState(false);

  // Toggle Notification
  const [sendNotification, setSendNotification] = useState(!initialData);

  // Mock data for selections
  const [users, setUsers] = useState<User[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  // State for creating new user on the fly
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', nik: '', email: '', phone: '' });
  const [newUserUnitId, setNewUserUnitId] = useState('');
  const [isAddingNewUnit, setIsAddingNewUnit] = useState(false);
  const [newUnitNameForUser, setNewUnitNameForUser] = useState('');

  // State for Searching Participants
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [participantSearchTerm, setParticipantSearchTerm] = useState('');
  
  // Notification State
  const [isSendingNotif, setIsSendingNotif] = useState(false);
  const { showToast } = useToast();
  
  // Ref for closing dropdown when clicking outside
  const picDropdownRef = useRef<HTMLDivElement>(null);

  const newParticipantsCount = participants.filter(p => 
    !initialData?.participants?.some(ip => ip.userId === p.userId)
  ).length;

  // Determine if current user needs to sign
  const myParticipantData = initialData?.participants?.find(p => p.userId === currentUserId);
  const needsToSign = myParticipantData && myParticipantData.attendance !== AttendanceStatus.HADIR;

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (picDropdownRef.current && !picDropdownRef.current.contains(event.target as Node)) {
        setIsPicDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (initialData && newParticipantsCount > 0 && !sendNotification) {
      setSendNotification(true);
    }
  }, [newParticipantsCount, initialData]);

  // Sync participants if initialData updates (e.g., external attendance confirmation)
  useEffect(() => {
    if (initialData?.participants) {
      setParticipants(prevParticipants => {
         // Map through new participants to update status, but try to preserve local unitNames if backfilled
         return initialData.participants.map(freshP => {
           const existingP = prevParticipants.find(p => p.userId === freshP.userId);
           return {
             ...freshP,
             unitName: existingP?.unitName || freshP.unitName
           };
         });
      });
    }
  }, [initialData]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedUsers, fetchedUnits] = await Promise.all([
          getUsers(),
          getUnits()
        ]);
        
        setUsers(fetchedUsers);
        setUnits(fetchedUnits);
        
        if (!initialData && userUnitId) {
            setUnitId(userUnitId);
        } else if(!unitId && fetchedUnits.length > 0) {
          setUnitId(fetchedUnits[0].id || '');
        }

        // BACKFILL LOGIC: 
        if (initialData && initialData.participants) {
          let hasBackfillUpdates = false;
          const updatedParticipants = initialData.participants.map(p => {
            if (!p.unitName) {
              const user = fetchedUsers.find(u => u.id === p.userId);
              if (user && user.unitId) {
                const uName = fetchedUnits.find(un => un.id === user.unitId)?.name;
                if (uName) {
                  hasBackfillUpdates = true;
                  return { ...p, unitName: uName };
                }
              }
            }
            return p;
          });

          if (hasBackfillUpdates) {
            setParticipants(updatedParticipants);
          }
        }

      } catch (error) {
        console.error("Failed to fetch form data", error);
      }
    };

    fetchData();
  }, []);

  // Agenda Item Handlers
  const addAgendaItem = () => {
    setItems([...items, { topic: '', decision: '', action: '', pic: '', monitoring: '' }]);
  };

  const removeAgendaItem = (index: number) => {
    if (items.length === 1) return; // Prevent deleting last item
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const updateAgendaItem = (index: number, field: keyof MinuteItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };
  
  const toggleRichText = (index: number, field: 'decision' | 'action') => {
    const key = `${index}_${field}`;
    setRichTextState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Helper to get unit name
  const getUnitName = (uId?: string) => units.find(u => u.id === uId)?.name || 'Unknown Unit';

  // NEW: Handle Selecting PIC from custom dropdown
  const handleSelectPic = (user: User) => {
    setPicId(user.id!);
    setIsPicDropdownOpen(false);
    setPicSearchTerm(''); // Clear search logic, effectively

    // Auto-add PIC to participants list if not already there
    const isAlreadyParticipant = participants.some(p => p.userId === user.id);
    
    if (!isAlreadyParticipant) {
      setParticipants([...participants, {
        userId: user.id!,
        name: user.name,
        unitName: getUnitName(user.unitId),
        attendance: AttendanceStatus.TIDAK_HADIR
      }]);
      showToast("PIC otomatis ditambahkan ke daftar peserta", "info");
    }
  };

  // Filter PICs for dropdown
  const filteredPics = users.filter(u => 
    u.name.toLowerCase().includes(picSearchTerm.toLowerCase()) || 
    getUnitName(u.unitId).toLowerCase().includes(picSearchTerm.toLowerCase())
  );
  
  const selectedPicObj = users.find(u => u.id === picId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    
    // Find PIC Name
    const selectedPic = users.find(u => u.id === picId);
    if (!selectedPic) {
      showToast("Mohon pilih Penanggung Jawab Rapat (PIC)", "error");
      return;
    }

    try {
      await onSubmit({
        title,
        date,
        time,
        location,
        picId,
        picName: selectedPic.name,
        items,
        status,
        unitId,
        participants,
        attachments
      });
      showToast('Notulen berhasil disimpan');
    } catch (error) {
      console.error("Submit Error:", error);
      showToast('Gagal menyimpan notulen. File mungkin terlalu besar.', 'error');
      return;
    }

    // Handle Notifications (WA only)
    const hasNewParticipants = participants.length > 0;
    
    if (hasNewParticipants && sendNotification) {
      setIsSendingNotif(true);
      const initialParticipantIds = new Set(initialData?.participants?.map(p => p.userId) || []);
      const newParticipants = participants.filter(p => !initialParticipantIds.has(p.userId));

      if (newParticipants.length > 0) {
        const unitName = units.find(u => u.id === unitId)?.name;
        let sentWaCount = 0;
        let attemptCount = 0;

        // Filter valid targets first to know total expected
        const validTargets = newParticipants.filter(p => {
           const u = users.find(user => user.id === p.userId);
           return u && u.phone;
        });
        
        for (const p of validTargets) {
          const userDetail = users.find(u => u.id === p.userId);
          
          if (userDetail && userDetail.phone) {
             // DELAY: Wait 3 seconds between sends to prevent Rate Limiting / Blocking
             if (attemptCount > 0) {
                await new Promise(resolve => setTimeout(resolve, 3000));
             }

             const meetingDetails = { title, date: `${date} ${time}`, location, unitName };
             const waSuccess = await sendWhatsAppInvitation(userDetail.phone, userDetail.name, meetingDetails);
             
             attemptCount++;
             if (waSuccess) sentWaCount++;
          }
        }
        
        if (validTargets.length > 0) {
             if (sentWaCount === validTargets.length) {
                 showToast(`Sukses! Notifikasi WA terkirim ke semua ${sentWaCount} peserta.`, 'success');
             } else {
                 showToast(`Selesai. Notifikasi WA terkirim ke ${sentWaCount} dari ${validTargets.length} peserta.`, 'info');
             }
        }
      }
      setIsSendingNotif(false);
    }
  };

  const addAllFromUnit = () => {
    if (!unitId) return;
    const unitUsers = users.filter(u => u.unitId === unitId);
    const currentParticipantIds = new Set(participants.map(p => p.userId));
    const uName = getUnitName(unitId);
    
    const newParticipants = unitUsers
      .filter(u => !currentParticipantIds.has(u.id!))
      .map(u => ({
        userId: u.id!,
        name: u.name,
        unitName: uName, // Store unit name for PDF
        attendance: AttendanceStatus.TIDAK_HADIR
      }));

    if (newParticipants.length === 0) {
      showToast("User unit ini sudah ditambahkan semua", "info");
      return;
    }

    setParticipants([...participants, ...newParticipants]);
    showToast(`${newParticipants.length} peserta ditambahkan`, "success");
  };

  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.nik || !newUser.email) return;

    if (isAddingNewUnit && !newUnitNameForUser.trim()) {
      showToast("Nama unit baru tidak boleh kosong", "error");
      return;
    }
    if (!isAddingNewUnit && !newUserUnitId) {
      showToast("Silakan pilih unit untuk peserta baru", "error");
      return;
    }

    try {
      let finalUnitId = newUserUnitId;
      let finalUnitName = isAddingNewUnit ? newUnitNameForUser : getUnitName(newUserUnitId);

      if (isAddingNewUnit) {
          finalUnitId = await createUnit({ name: newUnitNameForUser });
          const newUnitObj: Unit = { id: finalUnitId, name: newUnitNameForUser, createdAt: new Date() };
          setUnits([...units, newUnitObj]);
      }

      const newId = await createUser({
        ...newUser,
        role: UserRole.PESERTA,
        unitId: finalUnitId,
        password: newUser.nik 
      });

      const createdUser: User = {
        id: newId,
        ...newUser,
        role: UserRole.PESERTA,
        unitId: finalUnitId,
        createdAt: new Date()
      };
      setUsers([...users, createdUser]);
      setParticipants([...participants, {
        userId: newId,
        name: createdUser.name,
        unitName: finalUnitName, // Store unit name
        attendance: AttendanceStatus.TIDAK_HADIR
      }]);

      setNewUser({ name: '', nik: '', email: '', phone: '' });
      setIsNewUserModalOpen(false);
      showToast("Peserta baru berhasil dibuat dan ditambahkan");
    } catch (error) {
      showToast("Gagal membuat user baru", "error");
    }
  };

  const addSpecificUser = (user: User) => {
    if (participants.some(p => p.userId === user.id)) return;
    setParticipants([...participants, {
      userId: user.id!,
      name: user.name,
      unitName: getUnitName(user.unitId), // Store unit name
      attendance: AttendanceStatus.TIDAK_HADIR
    }]);
  };

  const removeParticipant = (index: number) => {
    const newP = [...participants];
    newP.splice(index, 1);
    setParticipants(newP);
  };

  const updateParticipant = (index: number, field: keyof Participant, value: any) => {
    const newP = [...participants];
    newP[index] = { ...newP[index], [field]: value };
    setParticipants(newP);
  };

  // --- Image Compression Logic ---
  const compressImage = (file: File): Promise<string> => {
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
          
          // Max dimension 1024px to ensure size < 500KB usually
          const MAX_SIZE = 1024;
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
          
          // Force JPEG with 0.6 quality (High compression, decent quality)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side hard check for files that are definitely NOT images
    if (!file.type.startsWith('image/') && file.size > 1024 * 1024) {
      showToast("Ukuran file dokumen terlalu besar. Maksimal 1MB", "error");
      return;
    }

    setIsAttachmentUploading(true);

    try {
      let fileData = '';
      
      // If it's an image (including HEIC which browsers might handle as image/* on input), try to compress
      if (file.type.startsWith('image/')) {
        try {
          fileData = await compressImage(file);
          // showToast("Gambar berhasil dikompresi");
        } catch (err) {
          console.warn("Compression failed, fallback to normal read", err);
          // Fallback to normal read
          const reader = new FileReader();
          reader.readAsDataURL(file);
          await new Promise(resolve => { reader.onload = resolve; });
          fileData = reader.result as string;
        }
      } else {
        // Document / PDF
        const reader = new FileReader();
        reader.readAsDataURL(file);
        await new Promise(resolve => { reader.onload = resolve; });
        fileData = reader.result as string;
      }

      setAttachments([...attachments, {
        fileName: file.name,
        filePath: fileData, 
        uploadedAt: new Date().toISOString()
      }]);
      showToast("File berhasil diupload");

    } catch (error) {
      console.error(error);
      showToast("Gagal memproses file.", "error");
    } finally {
      setIsAttachmentUploading(false);
      // Reset input value to allow uploading same file again if needed
      e.target.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    const newA = [...attachments];
    newA.splice(index, 1);
    setAttachments(newA);
  };
  
  const isImage = (path: string) => path.startsWith('data:image');
  const getFileIcon = (path: string) => path.startsWith('data:application/pdf') ? <FileText className="text-red-500" size={24} /> : <File className="text-slate-400" size={24} />;
  
  const filteredSearchUsers = users.filter(u => {
    const term = participantSearchTerm.toLowerCase();
    return u.name.toLowerCase().includes(term) || u.nik.includes(term) || getUnitName(u.unitId).toLowerCase().includes(term);
  });

  return (
    <>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full md:h-auto">
        <div className="p-4 md:p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 sticky top-0 z-10 md:static">
          <h2 className="text-lg md:text-xl font-bold text-slate-900 line-clamp-1">
            {readOnly ? 'Detail Notulen' : (initialData ? 'Edit Notulen' : 'Buat Notulen Baru')}
          </h2>
          <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-6 md:space-y-8 overflow-y-auto min-h-[400px]">
          
          {/* Header Info */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Judul Rapat</label>
              <input 
                disabled={readOnly} required type="text" 
                value={title} onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-2 focus:ring-primary outline-none disabled:bg-slate-100"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Unit / Bagian</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                <select 
                  disabled={readOnly} value={unitId} onChange={e => setUnitId(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 border border-slate-300 bg-white bg-none text-slate-900 rounded-lg focus:ring-2 focus:ring-primary outline-none disabled:bg-slate-100 appearance-none"
                >
                  {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
                   <ChevronDown size={16}/>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Tanggal</label>
                  <input 
                    disabled={readOnly} required type="date" 
                    value={date} onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-2 focus:ring-primary outline-none disabled:bg-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-1"><Clock size={14}/> Jam</label>
                  <input 
                    disabled={readOnly} required type="time" 
                    value={time} onChange={e => setTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-2 focus:ring-primary outline-none disabled:bg-slate-100"
                  />
                </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Lokasi</label>
              <input 
                disabled={readOnly} required type="text" 
                value={location} onChange={e => setLocation(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-2 focus:ring-primary outline-none disabled:bg-slate-100"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1"><UserCheck size={16}/> Penanggung Jawab Rapat (PIC)</label>
              
              <div className="relative" ref={picDropdownRef}>
                 {/* Custom Searchable Input */}
                 <div 
                   className={`relative w-full border rounded-lg bg-white flex items-center ${readOnly ? 'bg-slate-100 border-slate-300' : 'border-slate-300 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary'}`}
                 >
                    <input 
                      disabled={readOnly}
                      type="text"
                      className="w-full pl-3 pr-10 py-2 bg-transparent outline-none text-slate-900 rounded-lg disabled:cursor-not-allowed"
                      placeholder={selectedPicObj ? selectedPicObj.name : "Cari dan pilih PIC..."}
                      value={isPicDropdownOpen ? picSearchTerm : (selectedPicObj ? `${selectedPicObj.name} (${getUnitName(selectedPicObj.unitId)})` : '')}
                      onChange={(e) => setPicSearchTerm(e.target.value)}
                      onFocus={() => { 
                        if(!readOnly) {
                          setIsPicDropdownOpen(true); 
                          setPicSearchTerm(''); 
                        }
                      }}
                      onClick={() => {
                        if(!readOnly && !isPicDropdownOpen) {
                          setIsPicDropdownOpen(true);
                          setPicSearchTerm('');
                        }
                      }}
                    />
                    <div className="absolute right-3 text-slate-400 pointer-events-none">
                       {isPicDropdownOpen ? <Search size={16}/> : <ChevronDown size={16}/>}
                    </div>
                 </div>

                 {/* Dropdown List */}
                 {isPicDropdownOpen && (
                   <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1 animate-in fade-in zoom-in-95 duration-100">
                      {filteredPics.length > 0 ? (
                        filteredPics.map(u => (
                          <div 
                            key={u.id}
                            onClick={() => handleSelectPic(u)}
                            className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between group border-b border-slate-50 last:border-0"
                          >
                             <div>
                               <div className="font-medium text-slate-900 group-hover:text-primary transition-colors">{u.name}</div>
                               <div className="text-xs text-slate-500">{getUnitName(u.unitId)}</div>
                             </div>
                             {u.id === picId && <Check size={16} className="text-primary"/>}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-slate-500 text-center">
                          Tidak ditemukan.
                        </div>
                      )}
                   </div>
                 )}
              </div>
            </div>
          </section>

          {/* Agenda Items (Dynamic) */}
          <section className="space-y-4 pt-4 border-t border-slate-100">
             <div className="flex justify-between items-center">
               <h3 className="text-base font-bold text-slate-900">Pembahasan & Tindak Lanjut</h3>
               {!readOnly && (
                 <button 
                   type="button" 
                   onClick={addAgendaItem}
                   className="text-xs bg-primary hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium flex items-center transition-colors"
                 >
                   <Plus size={14} className="mr-1" /> Tambah Item
                 </button>
               )}
             </div>

             <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative group">
                     {!readOnly && items.length > 1 && (
                       <button 
                         type="button" 
                         onClick={() => removeAgendaItem(index)}
                         className="absolute top-2 right-2 text-slate-400 hover:text-red-500 p-1"
                         title="Hapus Item Ini"
                       >
                         <X size={16} />
                       </button>
                     )}
                     
                     <div className="grid grid-cols-1 gap-4">
                        {/* Row 1: Pokok Bahasan, PIC, Monitoring */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <div className="space-y-1">
                              <label className="text-xs font-semibold text-slate-500 uppercase">Pokok Bahasan</label>
                              {readOnly ? (
                                <div className="text-sm font-medium text-slate-900 bg-white p-2 border border-slate-100 rounded">{item.topic || '-'}</div>
                              ) : (
                                <input 
                                  type="text" 
                                  value={item.topic}
                                  onChange={(e) => updateAgendaItem(index, 'topic', e.target.value)}
                                  placeholder="Topik pembahasan..."
                                  className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-sm focus:ring-1 focus:ring-primary outline-none"
                                />
                              )}
                           </div>
                           <div className="space-y-1">
                             <label className="text-xs font-semibold text-slate-500 uppercase">PIC (Pelaksana)</label>
                             {readOnly ? (
                               <div className="text-sm text-slate-900 font-medium bg-white p-2 border border-slate-100 rounded">{item.pic || '-'}</div>
                             ) : (
                               <input 
                                 type="text" 
                                 value={item.pic}
                                 onChange={(e) => updateAgendaItem(index, 'pic', e.target.value)}
                                 placeholder="Siapa yang bertugas..."
                                 className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-sm focus:ring-1 focus:ring-primary outline-none"
                               />
                             )}
                           </div>
                           <div className="space-y-1">
                             <label className="text-xs font-semibold text-slate-500 uppercase">Monitoring / Status</label>
                             {readOnly ? (
                               <div className="text-sm text-slate-900 bg-white p-2 border border-slate-100 rounded">{item.monitoring || '-'}</div>
                             ) : (
                               <input 
                                 type="text" 
                                 value={item.monitoring}
                                 onChange={(e) => updateAgendaItem(index, 'monitoring', e.target.value)}
                                 placeholder="Status pengerjaan..."
                                 className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-sm focus:ring-1 focus:ring-primary outline-none"
                               />
                             )}
                           </div>
                        </div>

                        {/* Row 2: Keputusan */}
                        <div className="space-y-1">
                             <div className="flex justify-between items-center">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Keputusan</label>
                                {!readOnly && (
                                  <button 
                                    type="button"
                                    onClick={() => toggleRichText(index, 'decision')}
                                    className="text-xs flex items-center gap-1 text-primary hover:text-blue-700"
                                  >
                                    <Type size={12}/> {richTextState[`${index}_decision`] ? 'Teks Biasa' : 'Editor Kaya'}
                                  </button>
                                )}
                             </div>
                             {readOnly ? (
                               <div className="text-sm text-slate-800 bg-white p-2 rounded border border-slate-100" dangerouslySetInnerHTML={{ __html: item.decision || '-' }}></div>
                             ) : (
                               richTextState[`${index}_decision`] ? (
                                 <Editor
                                   apiKey="sxu2h11wfympk93xbfq962avj8sn80hpgv89hdtetftajvc1"
                                   value={item.decision}
                                   onEditorChange={(content) => updateAgendaItem(index, 'decision', content)}
                                   init={{
                                     height: 150,
                                     menubar: false,
                                     plugins: 'lists link',
                                     toolbar: 'undo redo | bold italic | bullist numlist | removeformat',
                                   }}
                                 />
                               ) : (
                                 <textarea 
                                   rows={2}
                                   value={item.decision}
                                   onChange={(e) => updateAgendaItem(index, 'decision', e.target.value)}
                                   placeholder="Hasil keputusan..."
                                   className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-sm focus:ring-1 focus:ring-primary outline-none"
                                 />
                               )
                             )}
                        </div>

                        {/* Row 3: Tindakan */}
                        <div className="space-y-1">
                             <div className="flex justify-between items-center">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Tindakan / Follow Up</label>
                                {!readOnly && (
                                  <button 
                                    type="button"
                                    onClick={() => toggleRichText(index, 'action')}
                                    className="text-xs flex items-center gap-1 text-primary hover:text-blue-700"
                                  >
                                    <Type size={12}/> {richTextState[`${index}_action`] ? 'Teks Biasa' : 'Editor Kaya'}
                                  </button>
                                )}
                             </div>
                             {readOnly ? (
                               <div className="text-sm text-slate-800 bg-white p-2 rounded border border-slate-100" dangerouslySetInnerHTML={{ __html: item.action || '-' }}></div>
                             ) : (
                               richTextState[`${index}_action`] ? (
                                 <Editor
                                   apiKey="sxu2h11wfympk93xbfq962avj8sn80hpgv89hdtetftajvc1"
                                   value={item.action}
                                   onEditorChange={(content) => updateAgendaItem(index, 'action', content)}
                                   init={{
                                     height: 150,
                                     menubar: false,
                                     plugins: 'lists link',
                                     toolbar: 'undo redo | bold italic | bullist numlist | removeformat',
                                   }}
                                 />
                               ) : (
                                 <textarea 
                                   rows={2}
                                   value={item.action}
                                   onChange={(e) => updateAgendaItem(index, 'action', e.target.value)}
                                   placeholder="Langkah selanjutnya..."
                                   className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-sm focus:ring-1 focus:ring-primary outline-none"
                                 />
                               )
                             )}
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </section>

          {/* Attachments Section */}
          <section className="space-y-4 pt-4 border-t border-slate-100">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Paperclip size={16} /> Lampiran
            </label>
            
            {!readOnly && (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="relative">
                   <input 
                     type="file" 
                     id="file-upload"
                     className="hidden" 
                     accept="image/*, .pdf"
                     onChange={handleFileUpload}
                     disabled={isAttachmentUploading}
                   />
                   <label 
                     htmlFor="file-upload"
                     className={`flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors ${isAttachmentUploading ? 'opacity-50' : ''}`}
                   >
                      <div className="text-center">
                         {isAttachmentUploading ? (
                           <Loader2 className="mx-auto text-primary animate-spin mb-2" size={24} />
                         ) : (
                           <Paperclip className="mx-auto text-slate-400 mb-2" size={24} />
                         )}
                         <span className="text-sm text-slate-600 font-medium">
                           {isAttachmentUploading ? 'Mengompresi & Mengupload...' : 'Klik untuk Upload (Gambar/PDF)'}
                         </span>
                         <p className="text-xs text-slate-400 mt-1">Otomatis kompresi untuk foto HP (Max 1MB)</p>
                      </div>
                   </label>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {attachments.map((att, idx) => (
                <div key={idx} className="relative group bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-all">
                  {isImage(att.filePath) ? (
                    <div className="h-28 w-full bg-slate-100 relative overflow-hidden group-hover:opacity-90">
                       <img src={att.filePath} alt={att.fileName} className="w-full h-full object-cover"/>
                       <div className="absolute top-1 right-1 bg-black/60 text-white p-0.5 rounded"><ImageIcon size={12} /></div>
                    </div>
                  ) : (
                    <div className="h-28 w-full bg-slate-50 flex items-center justify-center">{getFileIcon(att.filePath)}</div>
                  )}
                  <div className="p-2 border-t border-slate-100">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0 mr-1">
                        <h4 className="text-[10px] font-medium text-slate-900 truncate" title={att.fileName}>{att.fileName}</h4>
                        <a href={att.filePath} download={att.fileName} target="_blank" rel="noopener noreferrer" className="text-[9px] text-primary hover:underline flex items-center mt-0.5">Download <ExternalLink size={8} className="ml-1" /></a>
                      </div>
                      {!readOnly && (
                        <button type="button" onClick={() => removeAttachment(idx)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={12} /></button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Participants */}
          <section className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-slate-700">Daftar Peserta</label>
              {!readOnly && (
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <button type="button" onClick={addAllFromUnit} className="flex-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg font-medium flex items-center justify-center">
                    <Building2 size={14} className="mr-1.5" /> Pilih Semua dari Unit
                  </button>
                  <button type="button" onClick={() => { setIsNewUserModalOpen(true); }} className="flex-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg font-medium flex items-center justify-center">
                    <UserPlus size={14} className="mr-1.5" /> Daftar Peserta Baru
                  </button>
                  <button type="button" onClick={() => { setIsSearchModalOpen(true); setParticipantSearchTerm(''); }} className="flex-1 text-xs bg-primary hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium flex items-center justify-center">
                    <Search size={14} className="mr-1.5" /> Cari Peserta
                  </button>
                </div>
              )}
            </div>
            
            <div className="border border-slate-200 rounded-lg overflow-hidden w-full">
               {participants.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 bg-slate-50 text-slate-500">
                     <Users size={32} className="mb-2 text-slate-300" />
                     <p className="text-sm">Belum ada peserta ditambahkan</p>
                  </div>
               ) : (
                 <div className="overflow-x-auto w-full">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Nama Peserta</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase w-40">Kehadiran</th>
                        {!readOnly && <th className="px-4 py-3 w-10"></th>}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {participants.map((p, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-slate-900">{p.name}</div>
                              <div className="text-xs text-slate-500">{users.find(u => u.id === p.userId)?.nik} {p.unitName ? `- ${p.unitName}` : ''}</div>
                            </td>
                            <td className="px-4 py-3">
                              {readOnly ? (
                                <span className={`text-sm font-medium ${p.attendance === AttendanceStatus.HADIR ? 'text-green-600' : 'text-red-600'}`}>
                                  {p.attendance === AttendanceStatus.HADIR ? 'Hadir' : 'Tidak Hadir'}
                                </span>
                              ) : (
                                <div className="relative">
                                  <select 
                                    value={p.attendance} 
                                    onChange={e => updateParticipant(idx, 'attendance', e.target.value)} 
                                    className={`w-full p-2 pr-8 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-primary bg-white bg-none appearance-none ${p.attendance === AttendanceStatus.HADIR ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}`}
                                  >
                                    <option value={AttendanceStatus.HADIR} className="text-green-700">Hadir</option>
                                    <option value={AttendanceStatus.TIDAK_HADIR} className="text-red-600">Tidak Hadir</option>
                                  </select>
                                  <div className="absolute right-2 top-2.5 pointer-events-none text-slate-400">
                                    <ChevronDown size={14}/>
                                  </div>
                                </div>
                              )}
                            </td>
                            {!readOnly && (
                              <td className="px-4 py-3 text-center">
                                <button type="button" onClick={() => removeParticipant(idx)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                              </td>
                            )}
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
               )}
            </div>
          </section>

          {/* Footer Actions */}
          <section className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-4 border-t border-slate-100">
             <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
               <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-slate-700">Status:</label>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button type="button" disabled={readOnly} onClick={() => setStatus(MinuteStatus.DRAFT)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${status === MinuteStatus.DRAFT ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Draft</button>
                    <button type="button" disabled={readOnly} onClick={() => setStatus(MinuteStatus.FINAL)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${status === MinuteStatus.FINAL ? 'bg-green-500 text-white shadow-sm' : 'text-slate-500'}`}>Final</button>
                  </div>
               </div>
               {!readOnly && (
                 <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setSendNotification(!sendNotification)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${sendNotification ? 'bg-green-500' : 'bg-slate-300'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${sendNotification ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <div className="flex flex-col cursor-pointer" onClick={() => setSendNotification(!sendNotification)}>
                        <span className={`text-sm font-medium ${sendNotification ? 'text-green-700' : 'text-slate-500'}`}>Notif WA</span>
                    </div>
                 </div>
               )}
             </div>

             {/* Peserta Attendance Confirmation Button */}
             {readOnly && needsToSign && onAttendanceAction && initialData && (
                <button 
                  type="button" 
                  onClick={() => onAttendanceAction(initialData)}
                  className="w-full md:w-auto px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-sm flex items-center justify-center space-x-2 transition-all animate-pulse"
                >
                  <PenTool size={18} />
                  <span>Konfirmasi Kehadiran</span>
                </button>
             )}
          </section>
        </div>

        <div className="px-4 md:px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3 sticky bottom-0 z-10 md:static shadow-inner md:shadow-none">
          <button type="button" onClick={onCancel} disabled={isLoading || isSendingNotif || isAttachmentUploading} className="flex-1 sm:flex-none px-4 py-2 text-slate-700 font-medium hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2">
            {readOnly ? <ArrowLeft size={18} /> : null} <span>{readOnly ? 'Kembali' : 'Batal'}</span>
          </button>
          {!readOnly && (
            <button type="submit" disabled={isLoading || isSendingNotif || isAttachmentUploading} className="flex-1 sm:flex-none px-6 py-2 bg-primary hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm flex items-center justify-center space-x-2 transition-all">
               {isSendingNotif ? <MessageCircle className="animate-pulse" size={18} /> : <Save size={18} />}
               <span>{isLoading ? 'Menyimpan...' : (isSendingNotif ? 'Mengirim Notif...' : (isAttachmentUploading ? 'Uploading...' : 'Simpan'))}</span>
            </button>
          )}
        </div>
      </form>

      {/* Modern Search Modal */}
      <Modal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)}>
        <div className="flex flex-col h-[500px] md:h-[600px] w-full max-w-lg mx-auto bg-white rounded-xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users size={20} className="text-primary"/> Cari Peserta
                </h3>
                <button onClick={() => setIsSearchModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition-colors">
                  <X size={20}/>
                </button>
            </div>
            
            {/* Search Bar */}
            <div className="p-4 bg-white shadow-sm z-10">
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input 
                    autoFocus 
                    type="text" 
                    placeholder="Cari nama, NIK, atau unit..." 
                    value={participantSearchTerm} 
                    onChange={e => setParticipantSearchTerm(e.target.value)} 
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-slate-400 text-slate-900"
                  />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50/50">
               {filteredSearchUsers.length > 0 ? (
                 filteredSearchUsers.map(u => {
                   const isAdded = participants.some(p => p.userId === u.id);
                   const uName = getUnitName(u.unitId);
                   return (
                     <div key={u.id} className="flex justify-between items-center p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-100 shadow-sm transition-all group">
                        <div className="flex items-center gap-3 overflow-hidden">
                           <div className="w-10 h-10 rounded-full bg-blue-100 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                              {u.photo_user ? <img src={u.photo_user} alt={u.name} className="w-full h-full object-cover rounded-full"/> : u.name.charAt(0)}
                           </div>
                           <div className="min-w-0">
                              <h4 className="font-semibold text-slate-900 truncate">{u.name}</h4>
                              <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                                <span className="font-mono bg-slate-100 px-1 rounded">{u.nik}</span> 
                                <span className="text-slate-300">•</span> 
                                <span>{uName}</span>
                              </p>
                           </div>
                        </div>
                        
                        {!isAdded ? 
                          <button 
                            onClick={() => addSpecificUser(u)} 
                            className="text-xs font-medium bg-white border border-primary text-primary hover:bg-primary hover:text-white px-3 py-1.5 rounded-lg transition-all shadow-sm flex items-center gap-1 shrink-0"
                          >
                            <Plus size={14}/> Tambah
                          </button> :
                          <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg flex items-center gap-1 shrink-0">
                            <Check size={14}/> Ditambahkan
                          </span>
                        }
                     </div>
                   );
                 })
               ) : (
                 <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
                    <Search size={48} className="mb-4 text-slate-200" />
                    <p className="text-sm font-medium">Tidak ada peserta ditemukan</p>
                    <p className="text-xs">Coba kata kunci lain atau tambah baru</p>
                 </div>
               )}
            </div>
            
            {/* Footer Tip */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
               <p className="text-xs text-slate-500">Menampilkan {filteredSearchUsers.length} hasil</p>
            </div>
        </div>
      </Modal>

      {/* Modern New User Modal */}
      <Modal isOpen={isNewUserModalOpen} onClose={() => setIsNewUserModalOpen(false)}>
          <div className="flex flex-col h-full md:h-auto w-full max-w-lg mx-auto bg-white rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus size={20} className="text-primary"/> Peserta Baru
                </h3>
                <button onClick={() => setIsNewUserModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition-colors">
                  <X size={20}/>
                </button>
            </div>

            <form onSubmit={handleCreateNewUser} className="flex flex-col h-full">
               <div className="p-6 space-y-5 overflow-y-auto flex-1">
                  
                  {/* Personal Info Group */}
                  <div className="space-y-4">
                     <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                        <UserIcon size={12}/> Data Diri
                     </h4>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="relative">
                           <Hash className="absolute left-3 top-3 text-slate-400" size={16}/>
                           <input 
                             required 
                             type="text" 
                             value={newUser.nik} 
                             onChange={e => setNewUser({...newUser, nik: e.target.value})} 
                             className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400 text-sm" 
                             placeholder="NIK (Nomor Induk)"
                           />
                        </div>
                        <div className="relative">
                           <UserIcon className="absolute left-3 top-3 text-slate-400" size={16}/>
                           <input 
                             required 
                             type="text" 
                             value={newUser.name} 
                             onChange={e => setNewUser({...newUser, name: e.target.value})} 
                             className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400 text-sm" 
                             placeholder="Nama Lengkap"
                           />
                        </div>
                     </div>
                  </div>

                  {/* Unit Selection Group */}
                  <div className="space-y-2">
                     <div className="flex justify-between items-center mb-1">
                        <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                           <Building2 size={12}/> Unit / Bagian
                        </h4>
                        <button 
                          type="button" 
                          onClick={() => setIsAddingNewUnit(!isAddingNewUnit)} 
                          className="text-[10px] font-bold text-primary hover:text-blue-700 bg-blue-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
                        >
                           {isAddingNewUnit ? <List size={10}/> : <PlusCircle size={10}/>}
                           {isAddingNewUnit ? "Pilih dari List" : "Buat Unit Baru"}
                        </button>
                     </div>
                     
                     <div className="relative">
                        {isAddingNewUnit ? (
                           <div className="relative animate-in fade-in slide-in-from-bottom-1 duration-200">
                              <PlusCircle className="absolute left-3 top-3 text-primary" size={16}/>
                              <input 
                                autoFocus
                                type="text" 
                                value={newUnitNameForUser} 
                                onChange={e => setNewUnitNameForUser(e.target.value)} 
                                className="w-full pl-10 pr-3 py-2.5 bg-blue-50/50 border border-blue-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400 text-sm text-primary font-medium" 
                                placeholder="Nama Unit Baru..."
                              />
                           </div>
                        ) : (
                           <div className="relative">
                              <Building2 className="absolute left-3 top-3 text-slate-400" size={16}/>
                              <select 
                                value={newUserUnitId} 
                                onChange={e => setNewUserUnitId(e.target.value)} 
                                className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm appearance-none bg-none text-slate-700"
                              >
                                 <option value="">-- Pilih Unit --</option>
                                 {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                              </select>
                              <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
                                 <ChevronDown size={16}/>
                              </div>
                           </div>
                        )}
                     </div>
                  </div>

                  {/* Contact Info Group */}
                  <div className="space-y-4">
                     <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                        <Phone size={12}/> Kontak
                     </h4>
                     <div className="space-y-3">
                        <div className="relative">
                           <Mail className="absolute left-3 top-3 text-slate-400" size={16}/>
                           <input 
                             required 
                             type="email" 
                             value={newUser.email} 
                             onChange={e => setNewUser({...newUser, email: e.target.value})} 
                             className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400 text-sm" 
                             placeholder="Alamat Email"
                           />
                        </div>
                        <div className="relative">
                           <Phone className="absolute left-3 top-3 text-slate-400" size={16}/>
                           <input 
                             required 
                             type="tel" 
                             value={newUser.phone} 
                             onChange={e => setNewUser({...newUser, phone: e.target.value})} 
                             className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400 text-sm" 
                             placeholder="Nomor WhatsApp (Contoh: 0812...)"
                           />
                        </div>
                     </div>
                  </div>

               </div>
               
               {/* Footer */}
               <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
                  <button type="button" onClick={() => setIsNewUserModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors text-sm">
                     Batal
                  </button>
                  <button type="submit" className="px-6 py-2 bg-primary hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm shadow-blue-200 transition-all flex items-center gap-2 text-sm">
                     <UserPlus size={16}/> Simpan Peserta
                  </button>
               </div>
            </form>
          </div>
      </Modal>
    </>
  );
};

export default MinuteForm;
