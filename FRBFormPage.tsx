import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { useNotifications } from '../../hooks/useNotifications';
import { FormRequestBarang, FRBItem, FRBStatus, Item, Project } from '../../types';
import FormField from '../../components/forms/FormField';
import { formatDate } from '../../utils/helpers';
import Spinner from '../../components/Spinner';
import { storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Timestamp } from 'firebase/firestore';

type FormFRBItem = Omit<FRBItem, 'id' | 'estimatedUnitPrice'> & { 
  id?: string; // id is optional for new items
  estimatedUnitPrice?: number; 
  itemName?: string; 
};


const FRBFormPage: React.FC = () => {
  const { id: frbIdFromParams } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects, items: masterItems, addFRB, getFRBById, updateFRB, loading: dataLoading, getProjectById, getItemById, logActivity } = useData();
  const { addNotification } = useNotifications();

  const [isEditMode, setIsEditMode] = useState(false);
  const [currentFRB, setCurrentFRB] = useState<FormRequestBarang | null>(null);

  const [projectId, setProjectId] = useState('');
  const [deliveryDeadline, setDeliveryDeadline] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientContact, setRecipientContact] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  
  const [frbItems, setFrbItems] = useState<FormFRBItem[]>([
    { itemId: '', requestedQuantity: 1 }
  ]);

  const [projectPOFile, setProjectPOFile] = useState<File | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (frbIdFromParams) {
      setIsLoading(true);
      setIsEditMode(true);
      const frbToEdit = getFRBById(frbIdFromParams);
      if (frbToEdit) {
        setCurrentFRB(frbToEdit);
        setProjectId(frbToEdit.projectId);
        // Format Firestore Timestamp to yyyy-MM-dd for date input
        const deadlineDate = frbToEdit.deliveryDeadline.toDate();
        setDeliveryDeadline(deadlineDate.toISOString().split('T')[0]);
        setRecipientName(frbToEdit.recipientName);
        setRecipientContact(frbToEdit.recipientContact);
        setDeliveryAddress(frbToEdit.deliveryAddress);
        setFrbItems(frbToEdit.items.map(item => {
            const masterItem = getItemById(item.itemId);
            return {
                id: item.id,
                itemId: item.itemId,
                requestedQuantity: item.requestedQuantity,
                approvedQuantity: item.approvedQuantity,
                estimatedUnitPrice: item.estimatedUnitPrice,
                itemName: masterItem?.itemName
            };
        }));
      } else {
        addNotification('Error: FRB tidak ditemukan.', user?.id || '', 'error');
        navigate('/pm/frb');
      }
      setIsLoading(false);
    }
  }, [frbIdFromParams, getFRBById, navigate, addNotification, user, getItemById]);

  const handleItemChange = (index: number, field: keyof FormFRBItem, value: string | number) => {
    const newItems = [...frbItems];
    const itemToUpdate = { ...newItems[index] };
    
    if (field === 'itemId') {
        itemToUpdate.itemId = value as string;
        const selectedMasterItem = masterItems.find(mi => mi.id === value);
        itemToUpdate.estimatedUnitPrice = selectedMasterItem?.estimatedUnitPrice;
        itemToUpdate.itemName = selectedMasterItem?.itemName;
    } else if (field === 'requestedQuantity') {
        itemToUpdate.requestedQuantity = Number(value) > 0 ? Number(value) : 1;
    }
    
    newItems[index] = { ...newItems[index], [field]: value };
    setFrbItems(newItems);
  };

  const addItem = () => {
    setFrbItems([...frbItems, { itemId: '', requestedQuantity: 1 }]);
  };

  const removeItem = (index: number) => {
    if (frbItems.length > 1) {
      setFrbItems(frbItems.filter((_, i) => i !== index));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!projectId) errors.projectId = 'Proyek wajib dipilih.';
    if (!deliveryDeadline) errors.deliveryDeadline = 'Tanggal deadline pengiriman wajib diisi.';
    if (!recipientName.trim()) errors.recipientName = 'Nama penerima wajib diisi.';
    if (!recipientContact.trim()) errors.recipientContact = 'Kontak penerima wajib diisi.';
    if (!deliveryAddress.trim()) errors.deliveryAddress = 'Alamat pengiriman wajib diisi.';
    
    frbItems.forEach((item, index) => {
      if (!item.itemId) errors[`item_${index}_itemId`] = 'Barang wajib dipilih.';
      if (item.requestedQuantity <= 0) errors[`item_${index}_requestedQuantity`] = 'Jumlah harus lebih dari 0.';
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent, draft: boolean = false) => {
    e.preventDefault();
    if (!user) return; 

    if (!draft && !validateForm()) {
      addNotification('Mohon perbaiki error pada form.', user.id, 'error');
      return;
    }
    setIsLoading(true);

    try {
      let fileUrl = currentFRB?.projectPOFile;
      if (projectPOFile) {
        const storageRef = ref(storage, `project-po-files/${Date.now()}_${projectPOFile.name}`);
        await uploadBytes(storageRef, projectPOFile);
        fileUrl = await getDownloadURL(storageRef);
      }
      
      const finalFrbItemsForSubmission: Omit<FRBItem, 'id'>[] = frbItems.map(item => ({
          itemId: item.itemId,
          requestedQuantity: item.requestedQuantity,
          approvedQuantity: item.approvedQuantity,
          estimatedUnitPrice: masterItems.find(mi => mi.id === item.itemId)?.estimatedUnitPrice || 0,
      }));

      if (isEditMode && currentFRB) {
        const updatedData: FormRequestBarang = { 
            ...currentFRB, 
            projectId,
            deliveryDeadline: Timestamp.fromDate(new Date(deliveryDeadline)),
            recipientName,
            recipientContact,
            deliveryAddress,
            projectPOFile: fileUrl,
            items: frbItems.map(fi => ({
                id: fi.id || Date.now().toString(), // Use existing id or generate new for items added in edit mode
                itemId: fi.itemId,
                requestedQuantity: fi.requestedQuantity,
                approvedQuantity: fi.approvedQuantity,
                estimatedUnitPrice: fi.estimatedUnitPrice || masterItems.find(mi => mi.id === fi.itemId)?.estimatedUnitPrice || 0
            })),
            status: draft ? FRBStatus.DRAFT : currentFRB.status,
        };
        await updateFRB(updatedData);
        logActivity(`PM updated FRB: ${currentFRB.id} (Status: ${updatedData.status})`, currentFRB.id);
        addNotification(`FRB ${currentFRB.id} berhasil diperbarui.`, user.id);
      } else {
        const frbDataPayload = {
          projectId,
          pmId: user.id,
          deliveryDeadline, // Pass as string, context will convert to Timestamp
          recipientName,
          recipientContact,
          deliveryAddress,
          items: finalFrbItemsForSubmission,
          projectPOFile: fileUrl,
        };
        const newFrb = await addFRB(frbDataPayload, draft); 
        logActivity(`PM created new FRB: ${newFrb.id} (Status: ${newFrb.status})`, newFrb.id);
        addNotification(`FRB ${newFrb.id} berhasil ${draft ? 'disimpan sebagai draft' : 'diajukan'}.`, user.id);
      }
      navigate('/pm/frb');
    } catch (error) {
      console.error("Error submitting FRB:", error);
      addNotification('Gagal menyimpan FRB. Silakan coba lagi.', user.id, 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const selectedProject = getProjectById(projectId);

  if ((isLoading || dataLoading) && frbIdFromParams) return <div className="flex justify-center items-center h-64"><Spinner message="Memuat data FRB..." /></div>;
  
  const canEdit = !isEditMode || (currentFRB && (currentFRB.status === FRBStatus.DRAFT || currentFRB.status === FRBStatus.REJECTED_BY_DIRECTOR));

  return (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow-xl max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">
        {isEditMode ? `Detail FRB: ${currentFRB?.id || ''}` : 'Form Request Barang Baru'}
      </h1>

      {isEditMode && currentFRB && (
        <div className="mb-6 p-4 bg-gray-800 text-gray-200 rounded-md border border-gray-700">
            <h3 className="text-lg font-semibold text-white">Informasi FRB Saat Ini</h3>
            <p className="mt-1"><strong>Status:</strong> <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${ currentFRB.status === FRBStatus.APPROVED_BY_DIRECTOR ? 'bg-green-100 text-green-700' : currentFRB.status === FRBStatus.REJECTED_BY_DIRECTOR ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{currentFRB.status}</span></p>
            {currentFRB.status === FRBStatus.REJECTED_BY_DIRECTOR && <p className="text-red-400"><strong>Alasan Penolakan:</strong> {currentFRB.directorRejectionReason}</p>}
            <p className="mt-1"><strong>Tanggal Pengajuan:</strong> {formatDate(currentFRB.submissionDate, true)}</p>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            id="projectId"
            label="Proyek"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            options={[{value: '', label: 'Pilih Proyek'}, ...projects.filter(p=>p.pmId === user?.id).map(p => ({ value: p.id, label: p.projectName }))]}
            error={formErrors.projectId}
            required
            disabled={!canEdit}
          />
          <FormField
            id="pmName"
            label="Project Manager"
            value={user?.name || ''}
            onChange={() => {}}
            disabled
          />
        </div>
        
        {selectedProject?.projectPO && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700">
                    PO Proyek terkait: <strong>{selectedProject.projectPO}</strong> (Sudah terunggah di data proyek)
                </p>
            </div>
        )}

        <FormField
          id="projectPOFile"
          label="Upload PO Proyek (Jika berbeda/tambahan)"
          type="file"
          value={""} // File input value is managed by browser
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files[0]) {
              setProjectPOFile(e.target.files[0]);
            } else {
              setProjectPOFile(null);
            }
          }}
          disabled={!canEdit}
        >
          {projectPOFile && <p className="mt-1 text-sm text-gray-500">File dipilih: {projectPOFile.name}</p>}
          {isEditMode && currentFRB?.projectPOFile && !projectPOFile && (
            <p className="mt-1 text-sm text-gray-500">File terunggah: <a href={currentFRB.projectPOFile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Lihat File</a></p>
          )}
        </FormField>
        
        <hr className="my-6"/>
        <h2 className="text-xl font-semibold text-gray-700">Detail Pengiriman</h2>
        <FormField
            id="deliveryDeadline"
            label="Deadline Pengiriman"
            type="date"
            value={deliveryDeadline}
            onChange={(e) => setDeliveryDeadline(e.target.value)}
            error={formErrors.deliveryDeadline}
            required
            disabled={!canEdit}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                id="recipientName"
                label="Nama Penerima"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                error={formErrors.recipientName}
                required
                disabled={!canEdit}
            />
            <FormField
                id="recipientContact"
                label="Kontak Penerima"
                value={recipientContact}
                onChange={(e) => setRecipientContact(e.target.value)}
                error={formErrors.recipientContact}
                required
                disabled={!canEdit}
            />
        </div>
        <FormField
            id="deliveryAddress"
            label="Alamat Pengiriman Lengkap"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            rows={3}
            error={formErrors.deliveryAddress}
            required
            disabled={!canEdit}
        />

        <hr className="my-6"/>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Daftar Barang yang Diminta</h2>
        <div className="space-y-4">
          {frbItems.map((item, index) => (
            <div key={item.id || index} className="p-4 border border-gray-200 rounded-md bg-gray-50 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-5">
                <FormField
                  id={`item_${index}_itemId`}
                  label={`Barang #${index + 1}`}
                  value={item.itemId || ''}
                  onChange={(e) => handleItemChange(index, 'itemId', e.target.value)}
                  options={[{value: '', label: 'Pilih Barang'}, ...masterItems.map(mi => ({ value: mi.id, label: `${mi.itemName} (Stok: ${mi.currentStock}, Unit: ${mi.unit})` }))]}
                  error={formErrors[`item_${index}_itemId`]}
                  required
                  disabled={!canEdit}
                  className="mb-0"
                />
              </div>
              <div className="md:col-span-2">
                 <FormField
                    id={`item_${index}_requestedQuantity`}
                    label="Jumlah"
                    type="number"
                    value={item.requestedQuantity}
                    onChange={(e) => handleItemChange(index, 'requestedQuantity', parseInt(e.target.value) || 1)}
                    error={formErrors[`item_${index}_requestedQuantity`]}
                    required
                    disabled={!canEdit}
                    className="mb-0"
                    inputClassName="text-center"
                  />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700">Est. Harga Satuan</label>
                <p className="mt-1 text-sm text-gray-800 p-2 border border-gray-300 rounded-md bg-white h-[38px] flex items-center">
                    Rp {(item.estimatedUnitPrice || 0).toLocaleString('id-ID')}
                </p>
              </div>
              <div className="md:col-span-2 flex items-center">
                {canEdit && frbItems.length > 1 && (
                  <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 font-medium py-2 px-3 rounded-md border border-red-300 hover:bg-red-50 transition">
                    Hapus
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {canEdit && (
            <button type="button" onClick={addItem} className="mt-2 px-4 py-2 text-sm border border-blue-500 text-blue-600 font-semibold rounded-md hover:bg-blue-50 transition">
            + Tambah Barang
            </button>
        )}

        <div className="mt-6 pt-6 border-t">
            <p className="text-lg font-semibold text-gray-800">Total Estimasi Keseluruhan: 
                <span className="ml-2 text-blue-600">
                    Rp {frbItems.reduce((total, item) => total + (item.requestedQuantity * (item.estimatedUnitPrice || 0)), 0).toLocaleString('id-ID')}
                </span>
            </p>
        </div>

        {canEdit && (
          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 mt-8">
            {(isEditMode ? currentFRB?.status === FRBStatus.DRAFT || currentFRB?.status === FRBStatus.REJECTED_BY_DIRECTOR : true) && ( 
                 <button
                    type="button"
                    onClick={(e) => handleSubmit(e, true)}
                    disabled={isLoading}
                    className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition disabled:opacity-50"
                >
                    Simpan Draft
                </button>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition shadow disabled:opacity-50"
            >
              {isLoading ? <Spinner size="sm" color="text-white"/> : (isEditMode ? 'Simpan Perubahan' : 'Ajukan Permintaan')}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default FRBFormPage;
