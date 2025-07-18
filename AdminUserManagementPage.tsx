import React, { useState, FormEvent, useEffect, ChangeEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { User, UserRole } from '../../types';
import DataTable, { Column } from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/forms/FormField';
import Spinner from '../../components/Spinner';

const AdminUserManagementPage: React.FC = () => {
  const { user: adminUser } = useAuth(); 
  const { users, addUser, updateUser, deleteUser, loading: dataLoading, logActivity } = useData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<User>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);

  const openModal = (userToEdit?: User) => {
    if (userToEdit) {
      setCurrentUser({ ...userToEdit });
      setIsEditMode(true);
    } else {
      setCurrentUser({ role: UserRole.PROJECT_MANAGER }); // Default role for new user
      setIsEditMode(false);
    }
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentUser({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentUser(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!currentUser.name?.trim()) errors.name = 'Nama wajib diisi.';
    if (!currentUser.email?.trim()) errors.email = 'Email wajib diisi.';
    else if (!/\S+@\S+\.\S+/.test(currentUser.email)) errors.email = 'Format email tidak valid.';
    if (!isEditMode && !currentUser.password?.trim()) errors.password = 'Password wajib diisi untuk user baru.';
    else if (!isEditMode && currentUser.password && currentUser.password.length < 6) errors.password = 'Password minimal 6 karakter.';
    if (!currentUser.role) errors.role = 'Role wajib dipilih.';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !adminUser) return;
    setProcessing(true);

    try {
      if (isEditMode && currentUser.id) {
        await updateUser(currentUser as User);
        logActivity(`Admin ${adminUser.name} memperbarui data user: ${currentUser.name}`, currentUser.id);
      } else {
        const newUserPayload: Omit<User, 'id'> = {
            name: currentUser.name!,
            email: currentUser.email!,
            password: currentUser.password!,
            role: currentUser.role!,
        };
        await addUser(newUserPayload);
        // Logging is now handled inside addUser context function
      }
      closeModal();
    } catch (error: any) {
      console.error("Error saving user:", error);
      setFormErrors({ ...formErrors, submit: error.message || "Failed to save user." });
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus profil user ini? Tindakan ini tidak akan menghapus login user dari sistem.')) {
      setProcessing(true);
      try {
        await deleteUser(userId);
        // Logging handled in deleteUser context function
      } catch (error) {
        console.error("Error deleting user:", error);
      } finally {
        setProcessing(false);
      }
    }
  };


  const columns: Column<User>[] = [
    { header: 'Nama', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Role', accessor: 'role' },
    {
      header: 'Aksi',
      accessor: (item: User) => item.id, // Dummy accessor
      render: (item: User) => (
        <div className="space-x-2">
          <button onClick={() => openModal(item)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
          <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 text-sm" disabled={item.id === adminUser?.id}>Hapus</button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Manajemen Pengguna</h1>
        <button onClick={() => openModal()} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition shadow">
          Tambah Pengguna Baru
        </button>
      </div>

      <DataTable
        columns={columns}
        data={users}
        keyExtractor={(user) => user.id}
        isLoading={dataLoading || processing}
        emptyMessage="Tidak ada pengguna terdaftar."
      />

      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={isEditMode ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
          footer={
            <>
              <button 
                type="button" 
                onClick={closeModal} 
                disabled={processing} 
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                Batal
              </button>
              <button 
                type="submit" 
                form="userForm" 
                disabled={processing} 
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {processing ? <Spinner size="sm"/> : 'Simpan'}
              </button>
            </>
          }
        >
          <form id="userForm" onSubmit={handleSubmit} className="space-y-4">
            <FormField
              id="name"
              label="Nama Lengkap"
              value={currentUser.name || ''}
              onChange={handleInputChange}
              error={formErrors.name}
              required
            />
            <FormField
              id="email"
              label="Alamat Email"
              type="email"
              value={currentUser.email || ''}
              onChange={handleInputChange}
              error={formErrors.email}
              required
              disabled={isEditMode} // Prevent changing email for existing users for simplicity
            />
            {!isEditMode && (
                <FormField
                    id="password"
                    label="Password"
                    type="password"
                    value={currentUser.password || ''}
                    onChange={handleInputChange}
                    error={formErrors.password}
                    required={!isEditMode}
                />
            )}
            <FormField
              id="role"
              label="Role Pengguna"
              value={currentUser.role || ''}
              onChange={handleInputChange}
              options={Object.values(UserRole).map(role => ({ value: role, label: role }))}
              error={formErrors.role}
              required
            />
            {formErrors.submit && <p className="text-sm text-red-600">{formErrors.submit}</p>}
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminUserManagementPage;
