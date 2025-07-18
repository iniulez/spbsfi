
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { useNotifications } from '../../hooks/useNotifications';
import { PurchaseRequest, PRStatus, PurchaseOrder, Item as MasterItem, Supplier } from '../../types';
import DataTable, { Column } from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/forms/FormField';
import { formatDate, generateId } from '../../utils/helpers';
import Spinner from '../../components/Spinner';

const PurchasingPRManagementPage: React.FC = () => {
  const { user } = useAuth();
  const { purchaseRequests, suppliers, getItemById, addPO, updatePR, logActivity, loading: dataLoading } = useData();
  const { addNotification } = useNotifications();

  const [selectedPR, setSelectedPR] = useState<PurchaseRequest | null>(null);
  const [isPOCreationModalOpen, setIsPOCreationModalOpen] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poExpectedDeliveryDate, setPoExpectedDeliveryDate] = useState('');
  const [processing, setProcessing] = useState(false);

  if (!user) return null;

  const prsForPO = purchaseRequests
    .filter(pr => pr.status === PRStatus.APPROVED)
    .sort((a,b) => new Date(b.directorApprovalDate || b.requestDate).getTime() - new Date(a.directorApprovalDate || a.requestDate).getTime());
  
  const allPRs = purchaseRequests
    .sort((a,b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());


  const openPOCreationModal = (pr: PurchaseRequest) => {
    setSelectedPR(pr);
    setPoSupplierId('');
    setPoExpectedDeliveryDate('');
    setIsPOCreationModalOpen(true);
  };

  const closePOCreationModal = () => {
    setSelectedPR(null);
    setIsPOCreationModalOpen(false);
  };

  const handleCreatePO = async () => {
    if (!selectedPR || !poSupplierId || !poExpectedDeliveryDate || !user) {
      addNotification('Supplier dan tanggal perkiraan pengiriman wajib diisi.', user.id, 'error');
      return;
    }
    setProcessing(true);

    // Calculate total price based on PR items and master item estimated prices
    // In a real app, this might come from supplier quotes or more complex pricing logic
    const totalPrice = selectedPR.items.reduce((sum, prItem) => {
        const masterItem = getItemById(prItem.itemId);
        return sum + (prItem.quantityToPurchase * (masterItem?.estimatedUnitPrice || 0));
    }, 0);

    const poData: Omit<PurchaseOrder, 'id' | 'orderDate' | 'status'> = {
      prId: selectedPR.id,
      supplierId: poSupplierId,
      expectedDeliveryDate: poExpectedDeliveryDate,
      totalPrice: totalPrice,
      // actualDeliveryDate, status will be set by addPO and subsequent processes
    };

    try {
      const newPO = await addPO(poData);
      logActivity(`Purchasing ${user.name} created PO ${newPO.id} from PR ${selectedPR.id}`, newPO.id);
      addNotification(`PO ${newPO.id} berhasil dibuat untuk PR ${selectedPR.id}.`, user.id);
      
      // Update PR status to Processed
      await updatePR({ ...selectedPR, status: PRStatus.PROCESSED });
      
      closePOCreationModal();
    } catch (error) {
      console.error("Error creating PO:", error);
      addNotification('Gagal membuat PO. Coba lagi.', user.id, 'error');
    } finally {
        setProcessing(false);
    }
  };

  const prColumns: Column<PurchaseRequest>[] = [
    { header: 'ID PR', accessor: 'id', className: "w-1/12" },
    { header: 'FRB ID', accessor: (item: PurchaseRequest) => item.frbId || 'N/A', className: "w-1/12" },
    { header: 'Tgl. Permintaan', accessor: (item: PurchaseRequest) => formatDate(item.requestDate), className: "w-2/12" },
    { 
      header: 'Status', 
      accessor: (item: PurchaseRequest) => item.status, 
      render: (item: PurchaseRequest) => (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
            item.status === PRStatus.APPROVED ? 'bg-green-100 text-green-700' :
            item.status === PRStatus.REJECTED ? 'bg-red-100 text-red-700' :
            item.status === PRStatus.PROCESSED ? 'bg-blue-100 text-blue-700' :
            'bg-yellow-100 text-yellow-700' // Awaiting Director Approval
        }`}>{item.status}</span>
    ), className: "w-2/12" },
    { header: 'Disetujui Dir.', accessor: (item: PurchaseRequest) => item.directorApprovalDate ? formatDate(item.directorApprovalDate) : '-', className: "w-2/12" },
    { 
      header: 'Aksi', 
      accessor: (item: PurchaseRequest) => item.id, // Dummy accessor
      render: (item: PurchaseRequest) => (
        item.status === PRStatus.APPROVED ? (
          <button onClick={() => openPOCreationModal(item)} className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700">
            Buat PO
          </button>
        ) : <span className="text-xs text-gray-500">-</span>
      ), className: "w-2/12"
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Manajemen Purchase Request (PR)</h1>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">PR Siap untuk Dibuatkan PO ({prsForPO.length})</h2>
        <DataTable
            columns={prColumns}
            data={prsForPO}
            keyExtractor={(item) => item.id}
            isLoading={dataLoading}
            emptyMessage="Tidak ada PR yang disetujui dan siap dibuatkan PO."
        />
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Semua Purchase Request ({allPRs.length})</h2>
         <DataTable
            columns={prColumns} // Can reuse or make slightly different columns for all PRs view
            data={allPRs}
            keyExtractor={(item) => item.id}
            isLoading={dataLoading}
            emptyMessage="Belum ada Purchase Request yang tercatat."
        />
      </div>


      {selectedPR && (
        <Modal
          isOpen={isPOCreationModalOpen}
          onClose={closePOCreationModal}
          title={`Buat Purchase Order (PO) untuk PR: ${selectedPR.id}`}
          size="lg"
          footer={
            <>
              <button 
                type="button" 
                onClick={closePOCreationModal} 
                disabled={processing} 
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                Batal
              </button>
              <button 
                type="button" 
                onClick={handleCreatePO} 
                disabled={processing} 
                className="ml-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {processing ? <Spinner size="sm" /> : 'Buat PO'}
              </button>
            </>
          }
        >
          <div className="space-y-4 text-gray-700">
            <p>Anda akan membuat PO untuk item-item berikut dari PR <span className="font-semibold">{selectedPR.id}</span>:</p>
            <ul className="list-disc list-inside space-y-1 max-h-40 overflow-y-auto bg-gray-50 p-3 rounded-md text-sm">
              {selectedPR.items.map(item => {
                const masterItem = getItemById(item.itemId);
                return (
                  <li key={item.id} className="text-gray-700">
                    {masterItem?.itemName || 'Barang tidak dikenal'} - Jumlah: {item.quantityToPurchase} {masterItem?.unit || 'unit'}
                  </li>
                );
              })}
            </ul>
             <p className="font-semibold text-sm">Estimasi Total Harga Pembelian: Rp {selectedPR.items.reduce((sum, prItem) => {
                const masterItem = getItemById(prItem.itemId);
                return sum + (prItem.quantityToPurchase * (masterItem?.estimatedUnitPrice || 0));
             }, 0).toLocaleString('id-ID')}</p>

            <FormField
              id="poSupplierId"
              label="Supplier"
              value={poSupplierId}
              onChange={(e) => setPoSupplierId(e.target.value)}
              options={[{value: '', label: 'Pilih Supplier'}, ...suppliers.map(s => ({ value: s.id, label: s.supplierName }))]}
              required
            />
            <FormField
              id="poExpectedDeliveryDate"
              label="Tanggal Perkiraan Pengiriman dari Supplier"
              type="date"
              value={poExpectedDeliveryDate}
              onChange={(e) => setPoExpectedDeliveryDate(e.target.value)}
              required
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PurchasingPRManagementPage;
