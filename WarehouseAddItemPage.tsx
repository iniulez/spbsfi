
import React, { useState, FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { Item } from '../../types';
import FormField from '../../components/forms/FormField';
import Spinner from '../../components/Spinner';
import { useNotifications } from '../../hooks/useNotifications';

const WarehouseAddItemPage: React.FC = () => {
  const { user: whUser } = useAuth();
  const { addItem, logActivity } = useData();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();

  const [newItem, setNewItem] = useState<Partial<Item>>({
    unit: 'Unit',
    currentStock: 0, 
    estimatedUnitPrice: 0,
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
    if (newItem.currentStock === undefined || newItem.currentStock < 0) errors.currentStock = 'Stok awal tidak valid (minimal 0).';
    if (newItem.estimatedUnitPrice === undefined || newItem.estimatedUnitPrice < 0) errors.estimatedUnitPrice = 'Estimasi harga satuan tidak valid (minimal 0).';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !whUser) return;
    setProcessing(true);

    try {
      const newItemPayload: Omit<Item, 'id'> = {
        itemName: newItem.itemName!,
        description: newItem.description || '',
        unit: newItem.unit!,
        currentStock: newItem.currentStock!,
        estimatedUnitPrice: newItem.estimatedUnitPrice!,
      };
      const added = await addItem(newItemPayload);
      logActivity(`${whUser.role} ${whUser.name} menambahkan barang baru: ${added.itemName}`, added.id);
      addNotification(`Barang baru "${added.itemName}" berhasil ditambahkan dengan stok awal ${added.currentStock}.`, whUser.id);
      navigate('/warehouse/stock-management'); // Or warehouse dashboard
    } catch (error) {
      console.error("Error adding item:", error);
      addNotification('Gagal menambahkan barang baru. Silakan coba lagi.', whUser.id, 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow-xl max-w-lg mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">Tambah Barang Baru ke Master (Gudang)</h1>
       <p className="text-sm text-gray-600 mb-6">Gunakan form ini untuk menambahkan item baru yang ditemukan atau belum terdaftar di sistem. Anda dapat langsung mengatur stok awalnya.</p>
      
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
            <FormField
            id="currentStock"
            label="Stok Awal"
            type="number"
            value={newItem.currentStock ?? 0}
            onChange={handleInputChange}
            error={formErrors.currentStock}
            required
            />
        </div>
        <FormField
          id="estimatedUnitPrice"
          label="Estimasi Harga Satuan (Rp) (Jika diketahui)"
          type="number"
          value={newItem.estimatedUnitPrice ?? 0}
          onChange={handleInputChange}
          error={formErrors.estimatedUnitPrice}
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

export default WarehouseAddItemPage;
