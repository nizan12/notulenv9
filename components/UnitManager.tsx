
import React, { useState, useEffect } from 'react';
import { Unit } from '../types';
import { getUnits, createUnit, updateUnit, deleteUnit } from '../services/firestoreService';
import { Trash2, Edit2, Plus, Save, X, AlertTriangle, Loader2 } from 'lucide-react';
import Modal from './Modal';
import { useToast } from './Toast';
import Pagination from './Pagination';

const UnitManager: React.FC = () => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  
  // Add state form inputs
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitAbbrev, setNewUnitAbbrev] = useState('');
  
  // Edit state inputs
  const [editName, setEditName] = useState('');
  const [editAbbrev, setEditAbbrev] = useState('');
  
  // Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: string | null, name: string}>({
    isOpen: false, id: null, name: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { showToast } = useToast();

  useEffect(() => {
    loadUnits();
  }, []);

  const loadUnits = async () => {
    const data = await getUnits();
    setUnits(data);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName.trim()) return;
    setIsLoading(true);
    try {
      await createUnit({ name: newUnitName, abbreviation: newUnitAbbrev });
      setNewUnitName('');
      setNewUnitAbbrev('');
      await loadUnits();
      showToast('Unit berhasil ditambahkan');
    } catch (error) {
      showToast('Gagal menambahkan unit', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updateUnit(id, { name: editName, abbreviation: editAbbrev });
      setIsEditing(null);
      await loadUnits();
      showToast('Unit berhasil diperbarui');
    } catch (error) {
      showToast('Gagal memperbarui unit', 'error');
    }
  };

  const handleDeleteClick = (unit: Unit) => {
    setDeleteModal({ isOpen: true, id: unit.id!, name: unit.name });
  };

  const confirmDelete = async () => {
    if (deleteModal.id) {
      setIsLoading(true);
      try {
        await deleteUnit(deleteModal.id);
        await loadUnits();
        setDeleteModal({ isOpen: false, id: null, name: '' });
        showToast('Unit berhasil dihapus');
      } catch (error) {
        console.error("Error deleting unit", error);
        showToast('Gagal menghapus unit', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUnits = units.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Kelola Unit</h2>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-200 bg-slate-50">
          <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
                <input 
                  type="text" 
                  placeholder="Nama Unit Baru"
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  disabled={isLoading}
                  className="flex-[2] px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-2 focus:ring-primary outline-none w-full"
                />
                <input 
                  type="text" 
                  placeholder="Singkatan (Opsional)"
                  value={newUnitAbbrev}
                  onChange={(e) => setNewUnitAbbrev(e.target.value)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-2 focus:ring-primary outline-none w-full sm:w-auto"
                />
            </div>
            <button 
              type="submit"
              disabled={isLoading}
              className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 sm:w-auto w-full md:w-32 shrink-0"
            >
              <Plus size={18} /> {isLoading ? 'Adding...' : 'Tambah'}
            </button>
          </form>
        </div>

        <ul className="divide-y divide-slate-200">
          {currentUnits.map((unit) => (
            <li key={unit.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              {isEditing === unit.id ? (
                <div className="flex flex-col sm:flex-row items-center gap-2 flex-1 mr-2 md:mr-4 w-full">
                  <div className="flex-1 w-full flex flex-col sm:flex-row gap-2">
                      <input 
                        type="text" 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-[2] w-full min-w-0 px-3 py-1.5 border border-slate-300 bg-white text-slate-900 rounded focus:ring-2 focus:ring-primary outline-none text-sm"
                        placeholder="Nama Unit"
                      />
                      <input 
                        type="text" 
                        value={editAbbrev}
                        onChange={(e) => setEditAbbrev(e.target.value)}
                        className="flex-1 w-full sm:w-auto min-w-0 px-3 py-1.5 border border-slate-300 bg-white text-slate-900 rounded focus:ring-2 focus:ring-primary outline-none text-sm"
                        placeholder="Singkatan"
                      />
                  </div>
                  <div className="flex items-center gap-1 self-end sm:self-auto shrink-0 mt-2 sm:mt-0">
                      <button onClick={() => handleUpdate(unit.id!)} className="text-green-600 hover:text-green-700 p-2 sm:p-1 bg-green-50 sm:bg-transparent rounded-full"><Save size={18} /></button>
                      <button onClick={() => setIsEditing(null)} className="text-slate-400 hover:text-slate-600 p-2 sm:p-1 hover:bg-slate-100 sm:bg-transparent rounded-full"><X size={18} /></button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 overflow-hidden mr-2">
                    <span className="font-medium text-slate-700 truncate">{unit.name}</span>
                    {unit.abbreviation && (
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                            {unit.abbreviation}
                        </span>
                    )}
                </div>
              )}
              
              <div className="flex items-center gap-1 md:gap-2 shrink-0">
                {isEditing !== unit.id && (
                  <button 
                    onClick={() => {
                      setIsEditing(unit.id!);
                      setEditName(unit.name);
                      setEditAbbrev(unit.abbreviation || '');
                    }}
                    className="text-blue-500 hover:text-blue-700 p-2 rounded-full hover:bg-blue-50"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
                <button 
                  onClick={() => handleDeleteClick(unit)}
                  className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
          {units.length === 0 && (
            <li className="p-8 text-center text-slate-500 italic">Belum ada data unit.</li>
          )}
        </ul>

        <Pagination 
          currentPage={currentPage}
          totalItems={units.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, id: null, name: '' })}>
          <div className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Konfirmasi Hapus Unit</h3>
              <p className="text-slate-500 text-sm mb-6">
                Apakah Anda yakin ingin menghapus unit <br/>
                <span className="font-semibold text-slate-900">"{deleteModal.name}"</span>?
              </p>
              
              <div className="flex w-full gap-3">
                <button 
                  onClick={() => setDeleteModal({ isOpen: false, id: null, name: '' })}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
                  disabled={isLoading}
                >
                  Batal
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 shadow-sm transition-colors flex justify-center items-center gap-2"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          </div>
      </Modal>
    </div>
  );
};

export default UnitManager;
