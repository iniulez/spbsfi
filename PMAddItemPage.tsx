
import React, { useState, FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { Item } from '../../types';
import Modal from '../../components/Modal'; // Though not used directly, good for consistency if future modals are needed
import FormField from '../../components/forms/FormField';
import Spinner from '../../components/Spinner';
import { useNotifications } from '../../hooks/useNotifications';

const PMAddItemPage: React.FC = () => {
  const { user: pmUser } = useAuth();
  const { addItem, logActivity } = useData();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();

  const [newItem, setNewItem] = useState<Partial<Item>>({
    unit: 'Unit', // Default value
    currentStock: 0, // Default for new item suggested by PM
    estimatedUnitPrice: 0, // Default
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let processedValue: string | number = value;
    if (name === 'currentStock' || name === 'estimatedUnitPrice') {
      processedValue = parseFloat(value) || 0;
    }
    setNewItem(prev => ({ ...prev, [name]: processedValue }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!newItem.itemName?.trim()) errors.itemName = 'Nama barang wajib diisi.';
    if (!newItem.unit?.trim()) errors.unit = 'Satuan wajib diisi.';
    // currentStock is defaulted and likely not an error for PM suggestion
    if (newItem.estimatedUnitPrice === undefined || newItem.estimatedUnitPrice < 0) errors.estimatedUnitPrice = 'Estimasi harga satuan tidak valid (minimal 0).';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !pmUser) return;
    setProcessing(true);

    try {
      const newItemPayload: Omit<Item, 'id'> = {
        itemName: newItem.itemName!,
        description: newItem.description || '',
        unit: newItem.unit!,
        currentStock: newItem.currentStock || 0, // PMs usually suggest, stock added by warehouse/admin
        estimatedUnitPrice: newItem.estimatedUnitPrice!,
      };
      const added = await addItem(newItemPayload);
      logActivity(`${pmUser.role} ${pmUser.name} menambahkan barang baru: ${added.itemName}`, added.id);
      addNotification(`Barang baru "${added.itemName}" berhasil ditambahkan ke master list.`, pmUser.id);
      navigate('/pm/frb/new'); // Navigate to FRB form or PM dashboard
    } catch (error) {
      console.error("Error adding item:", error);
      addNotification('Gagal menambahkan barang baru. Silakan coba lagi.', pmUser.id, 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow-xl max-w-lg mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">Tambah Barang Baru ke Master</h1>
      <p className="text-sm text-gray-600 mb-6">Gunakan form ini untuk menambahkan item baru yang belum ada di daftar master barang. Item ini akan tersedia untuk dipilih di Form Request Barang.</p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          id="itemName"
          label="Nama Barang"
          value={newItem.itemName || ''}
          onChange={handleInputChange}
          error={formErrors.itemName}
          required
        />
        <FormField
          id="description"
          label="Deskripsi (Opsional)"
          value={newItem.description || ''}
          onChange={handleInputChange}
          rows={3}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            id="unit"
            label="Satuan"
            value={newItem.unit || ''}
            onChange={handleInputChange}
            error={formErrors.unit}
            required
            />
            <FormField // PM might not set initial stock, but field can be present, defaulted to 0.
            id="currentStock"
            label="Stok Awal (Default 0)"
            type="number"
            value={newItem.currentStock ?? 0}
            onChange={handleInputChange}
            error={formErrors.currentStock}
            disabled // Typically PMs don't set initial stock directly
            />
        </div>
        <FormField
          id="estimatedUnitPrice"
          label="Estimasi Harga Satuan (Rp)"
          type="number"
          value={newItem.estimatedUnitPrice ?? 0}
          onChange={handleInputChange}
          error={formErrors.estimatedUnitPrice}
          required
        />
        <div className="flex justify-end pt-4">
          <button 
            type="button" 
            onClick={() => navigate(-1)} 
            disabled={processing} 
            className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 mr-3"
          >
            Batal
          </button>
          <button 
            type="submit" 
            disabled={processing} 
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {processing ? <Spinner size="sm"/> : 'Simpan Barang Baru'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PMAddItemPage;
