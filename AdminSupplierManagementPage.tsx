
import React, { useState, FormEvent, ChangeEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { Supplier } from '../../types';
import DataTable, { Column } from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/forms/FormField';
import Spinner from '../../components/Spinner';

const AdminSupplierManagementPage: React.FC = () => {
  const { user: adminUser } = useAuth();
  const { suppliers, addSupplier, updateSupplier, loading: dataLoading, logActivity } = useData();
  // deleteSupplier function would be needed

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<Partial<Supplier>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);

  const openModal = (supplierToEdit?: Supplier) => {
    if (supplierToEdit) {
      setCurrentSupplier({ ...supplierToEdit });
      setIsEditMode(true);
    } else {
      setCurrentSupplier({});
      setIsEditMode(false);
    }
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentSupplier({});
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentSupplier(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!currentSupplier.supplierName?.trim()) errors.supplierName = 'Nama supplier wajib diisi.';
    if (!currentSupplier.contactPerson?.trim()) errors.contactPerson = 'Nama kontak person wajib diisi.';
    if (!currentSupplier.phone?.trim()) errors.phone = 'Nomor telepon wajib diisi.';
    if (!currentSupplier.email?.trim()) errors.email = 'Email wajib diisi.';
    else if (!/\S+@\S+\.\S+/.test(currentSupplier.email)) errors.email = 'Format email tidak valid.';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !adminUser) return;
    setProcessing(true);

    try {
      if (isEditMode && currentSupplier.id) {
        await updateSupplier(currentSupplier as Supplier);
        logActivity(`Admin ${adminUser.name} memperbarui data supplier: ${currentSupplier.supplierName}`, currentSupplier.id);
      } else {
        const newSupplierPayload: Omit<Supplier, 'id'> = {
          supplierName: currentSupplier.supplierName!,
          contactPerson: currentSupplier.contactPerson!,
          phone: currentSupplier.phone!,
          email: currentSupplier.email!,
        };
        await addSupplier(newSupplierPayload);
        logActivity(`Admin ${adminUser.name} membuat supplier baru: ${currentSupplier.supplierName}`);
      }
      closeModal();
    } catch (error) {
      console.error("Error saving supplier:", error);
    } finally {
      setProcessing(false);
    }
  };

  const columns: Column<Supplier>[] = [
    { header: 'ID Supplier', accessor: 'id', className: "w-1/6" },
    { header: 'Nama Supplier', accessor: 'supplierName', className: "w-2/6" },
    { header: 'Kontak Person', accessor: 'contactPerson', className: "w-1/6" },
    { header: 'Telepon', accessor: 'phone', className: "w-1/6" },
    { header: 'Email', accessor: 'email', className: "w-1/6" },
    {
      header: 'Aksi',
      accessor: (item: Supplier) => item.id, // Dummy
      render: (item: Supplier) => (
        <div className="space-x-2">
          <button onClick={() => openModal(item)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
          {/* <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 text-sm">Hapus</button> */}
        </div>
      ),
      className: "w-1/6"
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Manajemen Supplier</h1>
        <button onClick={() => openModal()} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition shadow">
          Tambah Supplier Baru
        </button>
      </div>

      <DataTable
        columns={columns}
        data={suppliers}
        keyExtractor={(supplier) => supplier.id}
        isLoading={dataLoading || processing}
        emptyMessage="Tidak ada data supplier."
      />

      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={isEditMode ? 'Edit Supplier' : 'Tambah Supplier Baru'}
          footer={
            <>
              <button type="button" onClick={closeModal} disabled={processing} className="btn-secondary">Batal</button>
              <button type="submit" form="supplierForm" disabled={processing} className="btn-primary ml-3">
                {processing ? <Spinner size="sm"/> : 'Simpan'}
              </button>
            </>
          }
        >
          <form id="supplierForm" onSubmit={handleSubmit} className="space-y-4">
            <FormField
              id="supplierName"
              label="Nama Supplier"
              value={currentSupplier.supplierName || ''}
              onChange={handleInputChange}
              error={formErrors.supplierName}
              required
            />
            <FormField
              id="contactPerson"
              label="Nama Kontak Person"
              value={currentSupplier.contactPerson || ''}
              onChange={handleInputChange}
              error={formErrors.contactPerson}
              required
            />
            <FormField
              id="phone"
              label="Nomor Telepon"
              type="text" // Could be 'tel'
              value={currentSupplier.phone || ''}
              onChange={handleInputChange}
              error={formErrors.phone}
              required
            />
            <FormField
              id="email"
              label="Alamat Email"
              type="email"
              value={currentSupplier.email || ''}
              onChange={handleInputChange}
              error={formErrors.email}
              required
            />
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminSupplierManagementPage;
