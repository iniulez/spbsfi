
import React, { useState, FormEvent, ChangeEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { Project, UserRole } from '../../types';
import DataTable, { Column } from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/forms/FormField';
import Spinner from '../../components/Spinner';

const AdminProjectManagementPage: React.FC = () => {
  const { user: adminUser } = useAuth();
  const { projects, users, addProject, updateProject, getUserById, loading: dataLoading, logActivity } = useData();
  // deleteProject function would be needed from DataContext if deletion is implemented

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<Partial<Project>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);

  const projectManagers = users.filter(u => u.role === UserRole.PROJECT_MANAGER);

  const openModal = (projectToEdit?: Project) => {
    if (projectToEdit) {
      setCurrentProject({ ...projectToEdit });
      setIsEditMode(true);
    } else {
      setCurrentProject({ pmId: projectManagers[0]?.id || '' }); // Default PM
      setIsEditMode(false);
    }
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentProject({});
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentProject(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!currentProject.projectName?.trim()) errors.projectName = 'Nama proyek wajib diisi.';
    if (!currentProject.pmId) errors.pmId = 'Project Manager wajib dipilih.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !adminUser) return;
    setProcessing(true);

    try {
      if (isEditMode && currentProject.id) {
        await updateProject(currentProject as Project);
        logActivity(`Admin ${adminUser.name} memperbarui data proyek: ${currentProject.projectName}`, currentProject.id);
      } else {
        const newProjectPayload: Omit<Project, 'id'> = {
          projectName: currentProject.projectName!,
          pmId: currentProject.pmId!,
          projectPO: currentProject.projectPO || undefined,
        };
        await addProject(newProjectPayload);
        logActivity(`Admin ${adminUser.name} membuat proyek baru: ${currentProject.projectName}`);
      }
      closeModal();
    } catch (error) {
      console.error("Error saving project:", error);
    } finally {
      setProcessing(false);
    }
  };

  const columns: Column<Project>[] = [
    { header: 'ID Proyek', accessor: 'id', className: "w-1/6" },
    { header: 'Nama Proyek', accessor: 'projectName', className: "w-2/6" },
    { header: 'Project Manager', accessor: (item: Project) => getUserById(item.pmId)?.name || 'N/A', className: "w-1/6" },
    { header: 'PO Proyek', accessor: (item: Project) => item.projectPO || '-', className: "w-1/6" },
    {
      header: 'Aksi',
      accessor: (item: Project) => item.id, // Dummy accessor
      render: (item: Project) => (
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
        <h1 className="text-3xl font-bold text-gray-800">Manajemen Proyek</h1>
        <button onClick={() => openModal()} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition shadow">
          Tambah Proyek Baru
        </button>
      </div>

      <DataTable
        columns={columns}
        data={projects}
        keyExtractor={(project) => project.id}
        isLoading={dataLoading || processing}
        emptyMessage="Tidak ada data proyek."
      />

      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={isEditMode ? 'Edit Proyek' : 'Tambah Proyek Baru'}
          footer={
            <>
              <button type="button" onClick={closeModal} disabled={processing} className="btn-secondary">Batal</button>
              <button type="submit" form="projectForm" disabled={processing} className="btn-primary ml-3">
                {processing ? <Spinner size="sm"/> : 'Simpan'}
              </button>
            </>
          }
        >
          <form id="projectForm" onSubmit={handleSubmit} className="space-y-4">
            <FormField
              id="projectName"
              label="Nama Proyek"
              value={currentProject.projectName || ''}
              onChange={handleInputChange}
              error={formErrors.projectName}
              required
            />
            <FormField
              id="pmId"
              label="Project Manager"
              value={currentProject.pmId || ''}
              onChange={handleInputChange}
              options={[{value: '', label: 'Pilih PM'}, ...projectManagers.map(pm => ({ value: pm.id, label: pm.name }))]}
              error={formErrors.pmId}
              required
            />
            <FormField
              id="projectPO"
              label="Nomor PO Proyek (Opsional)"
              value={currentProject.projectPO || ''}
              onChange={handleInputChange}
              placeholder="Contoh: PO-123/ABC/2024"
            />
            {/* If Project PO is a file upload, this FormField needs to be type="file" and handle file state */}
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminProjectManagementPage;
