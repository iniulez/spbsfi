import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { useNotifications } from '../../hooks/useNotifications';
import { FormRequestBarang, FRBStatus, FRBItem, Item as MasterItem, PRItem, DOItem } from '../../types';
import DataTable, { Column } from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/forms/FormField';
import { formatDate, truncateText, generateId } from '../../utils/helpers';
import Spinner from '../../components/Spinner';

const PurchasingFRBValidationListPage: React.FC = () => {
  const { user } = useAuth();
  const { frbs, getProjectById, getUserById, getItemById, updateFRB, addPR, addDO, logActivity, items: masterItems, loading: dataLoading } = useData();
  const { addNotification } = useNotifications();

  const [selectedFRB, setSelectedFRB] = useState<FormRequestBarang | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [validationNotes, setValidationNotes] = useState('');
  const [itemModifications, setItemModifications] = useState<Array<{ frbItemId: string; itemId: string; itemName: string; requestedQuantity: number; currentStock: number; approvedQuantity: number; needsPurchase: number }>>([]);
  const [processing, setProcessing] = useState(false);

  if (!user) return null;

  const frbsForValidation = frbs
    .filter(frb => frb.status === FRBStatus.APPROVED_BY_DIRECTOR || frb.status === FRBStatus.IN_PURCHASING_VALIDATION)
    .sort((a,b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());

  const openValidationModal = (frb: FormRequestBarang) => {
    setSelectedFRB(frb);
    setValidationNotes(frb.purchasingValidationNotes || '');
    const mods = frb.items.map(item => {
      const masterItem = getItemById(item.itemId);
      const approvedQty = item.approvedQuantity ?? item.requestedQuantity;
      return {
        frbItemId: item.id,
        itemId: item.itemId,
        itemName: masterItem?.itemName || 'Unknown Item',
        requestedQuantity: item.requestedQuantity,
        currentStock: masterItem?.currentStock || 0,
        approvedQuantity: approvedQty,
        needsPurchase: Math.max(0, approvedQty - (masterItem?.currentStock || 0))
      };
    });
    setItemModifications(mods);
    setIsModalOpen(true);
  };
  
  const handleApprovedQuantityChange = (frbItemId: string, newApprovedQuantity: number) => {
    setItemModifications(prevMods => prevMods.map(mod => {
        if (mod.frbItemId === frbItemId) {
            const currentStock = mod.currentStock;
            const needsPurchase = Math.max(0, newApprovedQuantity - currentStock);
            return { ...mod, approvedQuantity: newApprovedQuantity, needsPurchase };
        }
        return mod;
    }));
  };

  const closeModal = () => {
    setSelectedFRB(null);
    setIsModalOpen(false);
  };

  const handleProcessValidation = async () => {
    if (!selectedFRB || !user) return;
    setProcessing(true);

    const itemsForPR: PRItem[] = [];
    const itemsForDO: DOItem[] = [];
    let allStockAvailable = true;
    // let someStockAvailable = false; // This variable was not used

    itemModifications.forEach(mod => {
      if (mod.approvedQuantity > 0) {
        const availableFromStock = Math.min(mod.approvedQuantity, mod.currentStock);
        if (availableFromStock > 0) {
          itemsForDO.push({ id: generateId(), itemId: mod.itemId, deliveredQuantity: availableFromStock });
          // someStockAvailable = true; // This variable was not used
        }
        if (mod.needsPurchase > 0) {
          itemsForPR.push({ id: generateId(), itemId: mod.itemId, quantityToPurchase: mod.needsPurchase });
          allStockAvailable = false;
        }
      }
    });
    
    // Update FRB with approved quantities and notes
    const updatedFRBItems: FRBItem[] = selectedFRB.items.map(frbItem => {
        const mod = itemModifications.find(m => m.frbItemId === frbItem.id);
        return mod ? { ...frbItem, approvedQuantity: mod.approvedQuantity } : frbItem;
    });

    const validatedFRBData = {
        ...selectedFRB,
        items: updatedFRBItems,
        purchasingValidationDate: new Date().toISOString(),
        purchasingValidationNotes: validationNotes,
    };


    try {
      let finalFRBStatus = FRBStatus.IN_PURCHASING_PROCESS; // Default

      if (itemsForDO.length > 0) {
        await addDO({
          frbId: selectedFRB.id,
          purchasingId: user.id,
          items: itemsForDO,
        });
        logActivity(`Purchasing created DO for FRB: ${selectedFRB.id}`, selectedFRB.id);
        addNotification(`DO created for FRB ${selectedFRB.id}.`, user.id);
        finalFRBStatus = allStockAvailable ? FRBStatus.FULLY_STOCKED : FRBStatus.PARTIALLY_STOCKED;
      }

      if (itemsForPR.length > 0) {
        await addPR({
          frbId: selectedFRB.id,
          pmId: selectedFRB.pmId, // Keep original requester for context
          purchasingId: user.id,
          items: itemsForPR,
        });
        logActivity(`Purchasing created PR for FRB: ${selectedFRB.id}`, selectedFRB.id);
        addNotification(`PR created for FRB ${selectedFRB.id} and sent for Director approval.`, user.id);
        if (finalFRBStatus !== FRBStatus.FULLY_STOCKED) { // If not already fully stocked from DO
             finalFRBStatus = FRBStatus.IN_PURCHASING_PROCESS; // Items need purchase
        }
      }
      
      // If no DO and no PR (e.g. all quantities set to 0), FRB might be considered 'processed' differently.
      // For now, if no items are for DO or PR, it remains in purchasing process or could be marked completed if appropriate.
      if (itemsForDO.length === 0 && itemsForPR.length === 0 && itemModifications.every(m => m.approvedQuantity === 0)) {
         finalFRBStatus = FRBStatus.COMPLETED; // Or a specific status like "VALIDATED_NO_ACTION"
      }


      await updateFRB({ ...validatedFRBData, status: finalFRBStatus });
      addNotification(`FRB ${selectedFRB.id} validation complete. Status: ${finalFRBStatus}.`, selectedFRB.pmId);

      closeModal();
    } catch (error) {
      console.error("Error processing FRB validation:", error);
      addNotification('Gagal memproses validasi FRB. Coba lagi.', user.id, 'error');
    } finally {
        setProcessing(false);
    }
  };

  const columns: Column<FormRequestBarang>[] = [
    { header: 'ID FRB', accessor: 'id', className: "w-1/12" },
    { header: 'Proyek', accessor: (item: FormRequestBarang) => truncateText(getProjectById(item.projectId)?.projectName, 20) || 'N/A', className: "w-3/12" },
    { header: 'PM', accessor: (item: FormRequestBarang) => getUserById(item.pmId)?.name || 'N/A', className: "w-2/12" },
    { header: 'Tgl. Disetujui Dir.', accessor: (item: FormRequestBarang) => formatDate(item.directorApprovalDate), className: "w-2/12" },
    { header: 'Status Validasi', accessor: (item: FormRequestBarang) => item.purchasingValidationDate ? `Tervalidasi (${formatDate(item.purchasingValidationDate)})` : 'Belum Divalidasi', className: "w-2/12" },
    { 
      header: 'Aksi', 
      accessor: (item: FormRequestBarang) => item.id, // Dummy accessor
      render: (item: FormRequestBarang) => (
        <button onClick={() => openValidationModal(item)} className="px-3 py-1 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600">
          {item.purchasingValidationDate ? 'Lihat/Ubah Validasi' : 'Proses Validasi'}
        </button>
      ), className: "w-2/12"
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Validasi FRB & Cek Ketersediaan Stok</h1>
      
      <DataTable
        columns={columns}
        data={frbsForValidation}
        keyExtractor={(item) => item.id}
        isLoading={dataLoading}
        emptyMessage="Tidak ada FRB yang perlu divalidasi saat ini."
      />

      {selectedFRB && (
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={`Validasi FRB: ${selectedFRB.id}`}
          size="xl"
          footer={
            <>
              <button 
                type="button" 
                onClick={closeModal} 
                disabled={processing} 
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                Batal
              </button>
              <button 
                type="button" 
                onClick={handleProcessValidation} 
                disabled={processing} 
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {processing ? <Spinner size="sm" /> : 'Simpan Validasi & Proses (Buat DO/PR)'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <FormField
              id="validationNotes"
              label="Catatan Validasi Purchasing"
              value={validationNotes}
              onChange={(e) => setValidationNotes(e.target.value)}
              rows={3}
              placeholder="Catatan mengenai validasi, perubahan kuantitas, dll."
            />
            <h4 className="font-semibold mt-3">Detail Barang & Ketersediaan:</h4>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-500 w-4/12">Barang</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-500 w-1/12">Diminta</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-500 w-2/12">Stok Saat Ini</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-500 w-2/12">Qty Disetujui</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-500 w-2/12">Perlu Beli</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {itemModifications.map((mod) => (
                            <tr key={mod.frbItemId}>
                                <td className="px-3 py-2 whitespace-nowrap text-gray-900">{mod.itemName}</td>
                                <td className="px-3 py-2 text-center text-gray-900">{mod.requestedQuantity}</td>
                                <td className="px-3 py-2 text-center text-gray-900">{mod.currentStock}</td>
                                <td className="px-3 py-2">
                                    <input 
                                        type="number" 
                                        value={mod.approvedQuantity}
                                        onChange={(e) => handleApprovedQuantityChange(mod.frbItemId, parseInt(e.target.value))}
                                        className="w-20 text-center border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white text-gray-900 placeholder-gray-500"
                                        min="0"
                                    />
                                </td>
                                <td className={`px-3 py-2 text-center font-semibold ${mod.needsPurchase > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {mod.needsPurchase}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700">
                <strong>Perhatian:</strong> Sistem akan otomatis membuat Delivery Order (DO) untuk item yang stoknya tersedia dan Purchase Request (PR) untuk item yang perlu dibeli berdasarkan 'Qty Disetujui'. PR akan memerlukan persetujuan Direktur.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PurchasingFRBValidationListPage;