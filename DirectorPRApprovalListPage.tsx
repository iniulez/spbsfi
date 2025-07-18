
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { useNotifications } from '../../hooks/useNotifications';
import { PurchaseRequest, PRStatus, Item as MasterItem } from '../../types';
import DataTable, { Column } from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/forms/FormField';
import { formatDate, truncateText } from '../../utils/helpers';
import Spinner from '../../components/Spinner';


const DirectorPRApprovalListPage: React.FC = () => {
  const { user } = useAuth();
  const { purchaseRequests, getUserById, getItemById, approvePRByDirector, rejectPRByDirector, logActivity, loading: dataLoading } = useData();
  const { addNotification } = useNotifications();

  const [selectedPR, setSelectedPR] = useState<PurchaseRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | null>(null);
  const [processing, setProcessing] = useState(false);

  if (!user) return null;

  const prsForApproval = purchaseRequests
    .filter(pr => pr.status === PRStatus.AWAITING_DIRECTOR_APPROVAL)
    .sort((a,b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

  const openModal = (pr: PurchaseRequest, action: 'approve' | 'reject' | null) => {
    setSelectedPR(pr);
    setModalAction(action);
    setRejectionReason('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedPR(null);
    setIsModalOpen(false);
    setModalAction(null);
  };

  const handleAction = async () => {
    if (!selectedPR || !modalAction || !user) return;

    if (modalAction === 'reject' && !rejectionReason.trim()) {
      addNotification('Alasan penolakan wajib diisi.', user.id, 'error');
      return;
    }
    setProcessing(true);
    try {
      if (modalAction === 'approve') {
        await approvePRByDirector(selectedPR.id, user.id);
        logActivity(`Direktur ${user.name} menyetujui PR: ${selectedPR.id}`, selectedPR.id);
        addNotification(`PR ${selectedPR.id} berhasil disetujui.`, user.id);
      } else if (modalAction === 'reject') {
        await rejectPRByDirector(selectedPR.id, user.id, rejectionReason);
        logActivity(`Direktur ${user.name} menolak PR: ${selectedPR.id}. Alasan: ${rejectionReason}`, selectedPR.id);
        addNotification(`PR ${selectedPR.id} berhasil ditolak.`, user.id);
      }
      closeModal();
    } catch (error) {
      console.error(`Error ${modalAction} PR:`, error);
      addNotification(`Gagal ${modalAction} PR. Coba lagi.`, user.id, 'error');
    } finally {
        setProcessing(false);
    }
  };

  const columns: Column<PurchaseRequest>[] = [
    { header: 'ID PR', accessor: 'id', className: "w-1/12" },
    { header: 'FRB Terkait', accessor: (item: PurchaseRequest) => item.frbId || 'N/A', className: "w-1/12" },
    { header: 'Dibuat Oleh (Purchasing)', accessor: (item: PurchaseRequest) => getUserById(item.purchasingId)?.name || 'N/A', className: "w-3/12" },
    { header: 'Tgl. Permintaan', accessor: (item: PurchaseRequest) => formatDate(item.requestDate), className: "w-2/12" },
    { header: 'Jml. Item', accessor: (item: PurchaseRequest) => item.items.length, className: "w-1/12 text-center" },
    { 
      header: 'Aksi', 
      accessor: (item: PurchaseRequest) => item.id, // Dummy accessor
      render: (item: PurchaseRequest) => (
        <div className="space-x-2">
          <button onClick={() => openModal(item, 'approve')} className="px-3 py-1 text-xs font-medium text-white bg-green-500 rounded hover:bg-green-600">Setujui</button>
          <button onClick={() => openModal(item, 'reject')} className="px-3 py-1 text-xs font-medium text-white bg-red-500 rounded hover:bg-red-600">Tolak</button>
          <button onClick={() => openModal(item, null)} className="px-3 py-1 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600">Detail</button>
        </div>
      ), className: "w-3/12"
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Persetujuan Purchase Request (PR)</h1>
      
      <DataTable
        columns={columns}
        data={prsForApproval}
        keyExtractor={(item) => item.id}
        isLoading={dataLoading}
        emptyMessage="Tidak ada PR yang menunggu persetujuan Anda saat ini."
      />

      {selectedPR && (
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={modalAction ? `Konfirmasi ${modalAction === 'approve' ? 'Persetujuan' : 'Penolakan'} PR: ${selectedPR.id}` : `Detail PR: ${selectedPR.id}`}
          size="lg"
          footer={ modalAction && (
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
                onClick={handleAction}
                disabled={processing}
                className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 ${
                  modalAction === 'approve' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                }`}
              >
                 {processing ? <Spinner size="sm" /> : (modalAction === 'approve' ? 'Ya, Setujui' : 'Ya, Tolak')}
              </button>
            </>
          )}
        >
          <div className="space-y-3 text-gray-700">
            <p><strong>ID PR:</strong> {selectedPR.id}</p>
            {selectedPR.frbId && <p><strong>Dari FRB ID:</strong> {selectedPR.frbId}</p>}
            <p><strong>Dibuat Oleh (Purchasing):</strong> {getUserById(selectedPR.purchasingId)?.name || 'N/A'}</p>
            <p><strong>Tanggal Permintaan:</strong> {formatDate(selectedPR.requestDate, true)}</p>
            
            <h4 className="font-semibold mt-3">Detail Barang yang Akan Dibeli:</h4>
            <ul className="list-disc list-inside space-y-1 max-h-60 overflow-y-auto bg-gray-50 p-3 rounded-md text-sm">
              {selectedPR.items.map(item => {
                const masterItem = getItemById(item.itemId);
                return (
                  <li key={item.id} className="text-sm">
                    {masterItem?.itemName || 'Barang tidak dikenal'} - Jumlah: {item.quantityToPurchase} {masterItem?.unit || 'unit'}
                  </li>
                );
              })}
            </ul>
             <p className="font-semibold">Total Estimasi Pembelian: Rp {selectedPR.items.reduce((sum, prItem) => {
                const masterItem = getItemById(prItem.itemId);
                return sum + (prItem.quantityToPurchase * (masterItem?.estimatedUnitPrice || 0));
             }, 0).toLocaleString('id-ID')}</p>


            {modalAction === 'reject' && (
              <FormField
                id="rejectionReasonPR"
                label="Alasan Penolakan PR"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                required
                placeholder="Masukkan alasan penolakan PR ini..."
              />
            )}
            {modalAction === 'approve' && <p className="text-green-700 bg-green-50 p-3 rounded-md">Anda akan menyetujui Purchase Request ini. Lanjutkan?</p>}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DirectorPRApprovalListPage;
