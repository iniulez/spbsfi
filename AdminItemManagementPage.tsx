
import React, { useState, FormEvent, ChangeEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { Item } from '../../types';
import DataTable, { Column } from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/forms/FormField';
import Spinner from '../../components/Spinner';

const AdminItemManagementPage: React.FC = () => {
  const { user: adminUser } = useAuth();
  const { items, addItem, updateItem, loading: dataLoading, logActivity } = useData();
  // deleteItem function would be needed from DataContext if deletion is implemented

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<Item>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);

  const openModal = (itemToEdit?: Item) => {
    if (itemToEdit) {
      setCurrentItem({ ...itemToEdit });
      setIsEditMode(true);
    } else {
      setCurrentItem({ unit: 'Unit', currentStock: 0, estimatedUnitPrice: 0 }); // Defaults
      setIsEditMode(false);
    }
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentItem({});
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let processedValue: string | number = value;
    if (name === 'currentStock' || name === 'estimatedUnitPrice') {
      processedValue = parseFloat(value) || 0;
    }
    setCurrentItem(prev => ({ ...prev, [name]: processedValue }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!currentItem.itemName?.trim()) errors.itemName = 'Nama barang wajib diisi.';
    if (!currentItem.unit?.trim()) errors.unit = 'Satuan wajib diisi.';
    if (currentItem.currentStock === undefined || currentItem.currentStock < 0) errors.currentStock = 'Stok saat ini tidak valid.';
    if (currentItem.estimatedUnitPrice === undefined || currentItem.estimatedUnitPrice < 0) errors.estimatedUnitPrice = 'Estimasi harga satuan tidak valid.';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !adminUser) return;
    setProcessing(true);

    try {
      if (isEditMode && currentItem.id) {
        await updateItem(currentItem as Item);
        logActivity(`Admin ${adminUser.name} memperbarui data barang: ${currentItem.itemName}`, currentItem.id);
      } else {
        const newItemPayload: Omit<Item, 'id'> = {
          itemName: currentItem.itemName!,
          description: currentItem.description || '',
          unit: currentItem.unit!,
          currentStock: currentItem.currentStock!,
          estimatedUnitPrice: currentItem.estimatedUnitPrice!,
        };
        await addItem(newItemPayload);
        logActivity(`Admin ${adminUser.name} membuat barang baru: ${currentItem.itemName}`);
      }
      closeModal();
    } catch (error) {
      console.error("Error saving item:", error);
      // addNotification might be useful here
    } finally {
      setProcessing(false);
    }
  };

  // const handleDelete = async (itemId: string) => { /* ... similar to UserManagement ... */ }

  const columns: Column<Item>[] = [
    { header: 'ID Barang', accessor: 'id', className: "w-1/12" },
    { header: 'Nama Barang', accessor: 'itemName', className: "w-4/12" },
    { header: 'Unit', accessor: 'unit', className: "w-1/12" },
    { header: 'Stok', accessor: 'currentStock', className: "w-1/12 text-center" },
    { header: 'Est. Harga Satuan', accessor: (item: Item) => `Rp ${item.estimatedUnitPrice.toLocaleString('id-ID')}`, className: "w-2/12 text-right" },
    {
      header: 'Aksi',
      accessor: (item: Item) => item.id, // Dummy accessor
      render: (item: Item) => (
        <div className="space-x-2">
          <button onClick={() => openModal(item)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
          {/* <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 text-sm">Hapus</button> */}
        </div>
      ),
      className: "w-1/12"
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Manajemen Barang</h1>
        <button onClick={() => openModal()} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition shadow">
          Tambah Barang Baru
        </button>
      </div>

      <DataTable
        columns={columns}
        data={items}
        keyExtractor={(item) => item.id}
        isLoading={dataLoading || processing}
        emptyMessage="Tidak ada data barang."
      />

      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={isEditMode ? 'Edit Barang' : 'Tambah Barang Baru'}
          footer={
            <>
              <button type="button" onClick={closeModal} disabled={processing} className="btn-secondary">Batal</button>
              <button type="submit" form="itemForm" disabled={processing} className="btn-primary ml-3">
                {processing ? <Spinner size="sm"/> : 'Simpan'}
              </button>
            </>
          }
        >
          <form id="itemForm" onSubmit={handleSubmit} className="space-y-4">
            <FormField
              id="itemName"
              label="Nama Barang"
              value={currentItem.itemName || ''}
              onChange={handleInputChange}
              error={formErrors.itemName}
              required
            />
            <FormField
              id="description"
              label="Deskripsi"
              value={currentItem.description || ''}
              onChange={handleInputChange}
              rows={3}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                id="unit"
                label="Satuan"
                value={currentItem.unit || ''}
                onChange={handleInputChange}
                error={formErrors.unit}
                required
                />
                <FormField
                id="currentStock"
                label="Stok Saat Ini"
                type="number"
                value={currentItem.currentStock ?? ''}
                onChange={handleInputChange}
                error={formErrors.currentStock}
                required
                />
            </div>
            <FormField
              id="estimatedUnitPrice"
              label="Estimasi Harga Satuan (Rp)"
              type="number"
              value={currentItem.estimatedUnitPrice ?? ''}
              onChange={handleInputChange}
              error={formErrors.estimatedUnitPrice}
              required
            />
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminItemManagementPage;
