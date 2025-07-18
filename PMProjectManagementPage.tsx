
import React, { useState, FormEvent, ChangeEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { Project } from '../../types';
import DataTable, { Column } from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/forms/FormField';
import Spinner from '../../components/Spinner';

const PMProjectManagementPage: React.FC = () => {
  const { user: pmUser } = useAuth();
  const { projects, addProject, updateProject, loading: dataLoading, logActivity } = useData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<Partial<Project>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);

  if (!pmUser) return null;

  const myProjects = projects.filter(p => p.pmId === pmUser.id);

  const openModal = (projectToEdit?: Project) => {
    if (projectToEdit) {
      setCurrentProject({ ...projectToEdit });
      setIsEditMode(true);
    } else {
      setCurrentProject({ pmId: pmUser.id }); // Default PM to current user
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
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !pmUser) return;
    setProcessing(true);

    try {
      if (isEditMode && currentProject.id) {
        const projectToUpdate: Project = {
            ...currentProject,
            pmId: pmUser.id, // Ensure PM ID remains current user
        } as Project;
        await updateProject(projectToUpdate);
        logActivity(`${pmUser.role} ${pmUser.name} memperbarui proyek: ${currentProject.projectName}`, currentProject.id);
      } else {
        const newProjectPayload: Omit<Project, 'id'> = {
          projectName: currentProject.projectName!,
          pmId: pmUser.id, // PM is the current user
          projectPO: currentProject.projectPO || undefined,
        };
        const newProject = await addProject(newProjectPayload);
        logActivity(`${pmUser.role} ${pmUser.name} membuat proyek baru: ${newProject.projectName}`, newProject.id);
      }
      closeModal();
    } catch (error) {
      console.error("Error saving project:", error);
      // Add notification for error
    } finally {
      setProcessing(false);
    }
  };

  const columns: Column<Project>[] = [
    { header: 'ID Proyek', accessor: 'id', className: "w-1/6" },
    { header: 'Nama Proyek', accessor: 'projectName', className: "w-3/6" },
    { header: 'PO Proyek', accessor: (item: Project) => item.projectPO || '-', className: "w-1/6" },
    {
      header: 'Aksi',
      accessor: (item: Project) => item.id, // Dummy accessor
      render: (item: Project) => (
        <div className="space-x-2">
          <button onClick={() => openModal(item)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
          {/* Delete functionality might be restricted for PMs */}
        </div>
      ),
      className: "w-1/6"
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Manajemen Proyek Saya</h1>
        <button onClick={() => openModal()} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition shadow">
          Tambah Proyek Baru
        </button>
      </div>

      <DataTable
        columns={columns}
        data={myProjects}
        keyExtractor={(project) => project.id}
        isLoading={dataLoading || processing}
        emptyMessage="Anda belum memiliki proyek atau belum ada proyek yang ditambahkan."
      />

      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={isEditMode ? 'Edit Proyek' : 'Tambah Proyek Baru'}
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
                form="pmProjectForm" 
                disabled={processing} 
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {processing ? <Spinner size="sm"/> : 'Simpan'}
              </button>
            </>
          }
        >
          <form id="pmProjectForm" onSubmit={handleSubmit} className="space-y-4">
            <FormField
              id="projectName"
              label="Nama Proyek"
              value={currentProject.projectName || ''}
              onChange={handleInputChange}
              error={formErrors.projectName}
              required
            />
            <FormField
              id="pmIdDisplay" // Display field, not for submission directly as pmId is fixed
              label="Project Manager"
              value={pmUser.name} // Display current PM's name
              disabled // This field is informational
              onChange={()=>{}}
            />
            <FormField
              id="projectPO"
              label="Nomor PO Proyek (Opsional)"
              value={currentProject.projectPO || ''}
              onChange={handleInputChange}
              placeholder="Contoh: PO-123/XYZ/2024"
            />
            {/* If Project PO is a file upload, FormField type needs to be "file" */}
          </form>
        </Modal>
      )}
    </div>
  );
};

export default PMProjectManagementPage;
