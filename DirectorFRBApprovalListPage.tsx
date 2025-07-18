
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { useNotifications } from '../../hooks/useNotifications';
import { FormRequestBarang, FRBStatus, Item as MasterItem } from '../../types';
import DataTable, { Column } from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/forms/FormField';
import { formatDate, truncateText } from '../../utils/helpers';
import Spinner from '../../components/Spinner';

const DirectorFRBApprovalListPage: React.FC = () => {
  const { user } = useAuth();
  const { frbs, getProjectById, getUserById, getItemById, approveFRBByDirector, rejectFRBByDirector, logActivity, loading: dataLoading } = useData();
  const { addNotification } = useNotifications();

  const [selectedFRB, setSelectedFRB] = useState<FormRequestBarang | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | null>(null);
  const [processing, setProcessing] = useState(false);

  if (!user) return null;

  const frbsForApproval = frbs
    .filter(frb => frb.status === FRBStatus.SUBMITTED)
    .sort((a,b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());

  const openModal = (frb: FormRequestBarang, action: 'approve' | 'reject' | null) => {
    setSelectedFRB(frb);
    setModalAction(action);
    setRejectionReason(''); // Reset reason
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedFRB(null);
    setIsModalOpen(false);
    setModalAction(null);
  };

  const handleAction = async () => {
    if (!selectedFRB || !modalAction || !user) return;

    if (modalAction === 'reject' && !rejectionReason.trim()) {
      addNotification('Alasan penolakan wajib diisi.', user.id, 'error');
      return;
    }
    setProcessing(true);
    try {
      if (modalAction === 'approve') {
        await approveFRBByDirector(selectedFRB.id, user.id);
        logActivity(`Direktur ${user.name} menyetujui FRB: ${selectedFRB.id}`, selectedFRB.id);
        addNotification(`FRB ${selectedFRB.id} berhasil disetujui.`, user.id);
      } else if (modalAction === 'reject') {
        await rejectFRBByDirector(selectedFRB.id, user.id, rejectionReason);
        logActivity(`Direktur ${user.name} menolak FRB: ${selectedFRB.id}. Alasan: ${rejectionReason}`, selectedFRB.id);
        addNotification(`FRB ${selectedFRB.id} berhasil ditolak.`, user.id);
      }
      closeModal();
    } catch (error) {
      console.error(`Error ${modalAction} FRB:`, error);
      addNotification(`Gagal ${modalAction} FRB. Coba lagi.`, user.id, 'error');
    } finally {
        setProcessing(false);
    }
  };

  const columns: Column<FormRequestBarang>[] = [
    { header: 'ID FRB', accessor: 'id', className: "w-1/12" },
    { header: 'Proyek', accessor: (item: FormRequestBarang) => truncateText(getProjectById(item.projectId)?.projectName, 20) || 'N/A', className: "w-2/12" },
    { header: 'PM', accessor: (item: FormRequestBarang) => getUserById(item.pmId)?.name || 'N/A', className: "w-2/12" },
    { header: 'Tgl. Pengajuan', accessor: (item: FormRequestBarang) => formatDate(item.submissionDate), className: "w-2/12" },
    { header: 'Deadline', accessor: (item: FormRequestBarang) => formatDate(item.deliveryDeadline), className: "w-2/12" },
    { header: 'Total Est.', accessor: (item: FormRequestBarang) => `Rp ${item.items.reduce((sum, i) => sum + i.requestedQuantity * i.estimatedUnitPrice, 0).toLocaleString('id-ID')}`, className: "w-2/12 text-right" },
    { 
      header: 'Aksi', 
      accessor: (item: FormRequestBarang) => item.id, // Dummy accessor for type compliance
      render: (item: FormRequestBarang) => (
        <div className="space-x-2">
          <button onClick={() => openModal(item, 'approve')} className="px-3 py-1 text-xs font-medium text-white bg-green-500 rounded hover:bg-green-600">Setujui</button>
          <button onClick={() => openModal(item, 'reject')} className="px-3 py-1 text-xs font-medium text-white bg-red-500 rounded hover:bg-red-600">Tolak</button>
          <button onClick={() => openModal(item, null)} className="px-3 py-1 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600">Detail</button>
        </div>
      ), className: "w-2/12"
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Persetujuan Form Request Barang</h1>
      
      <DataTable
        columns={columns}
        data={frbsForApproval}
        keyExtractor={(item) => item.id}
        isLoading={dataLoading}
        emptyMessage="Tidak ada FRB yang menunggu persetujuan Anda saat ini."
      />

      {selectedFRB && (
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={modalAction ? `Konfirmasi ${modalAction === 'approve' ? 'Persetujuan' : 'Penolakan'} FRB: ${selectedFRB.id}` : `Detail FRB: ${selectedFRB.id}`}
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
          <div className="space-y-4 text-gray-700">
            <p><strong>ID FRB:</strong> {selectedFRB.id}</p>
            <p><strong>Proyek:</strong> {getProjectById(selectedFRB.projectId)?.projectName || 'N/A'}</p>
            <p><strong>Project Manager:</strong> {getUserById(selectedFRB.pmId)?.name || 'N/A'}</p>
            <p><strong>Tanggal Pengajuan:</strong> {formatDate(selectedFRB.submissionDate, true)}</p>
            <p><strong>Deadline Pengiriman:</strong> {formatDate(selectedFRB.deliveryDeadline)}</p>
            <p><strong>Penerima:</strong> {selectedFRB.recipientName} ({selectedFRB.recipientContact})</p>
            <p><strong>Alamat Pengiriman:</strong> {selectedFRB.deliveryAddress}</p>
            {selectedFRB.projectPOFile && <p><strong>PO Proyek Terlampir:</strong> {selectedFRB.projectPOFile}</p>}

            <h4 className="font-semibold mt-3">Detail Barang:</h4>
            <ul className="list-disc list-inside space-y-1 max-h-60 overflow-y-auto bg-gray-50 p-3 rounded-md">
              {selectedFRB.items.map(item => {
                const masterItem = getItemById(item.itemId);
                return (
                  <li key={item.id} className="text-sm">
                    {masterItem?.itemName || 'Barang tidak dikenal'} ({item.requestedQuantity} {masterItem?.unit || 'unit'})
                    - Est. Rp {(item.requestedQuantity * item.estimatedUnitPrice).toLocaleString('id-ID')}
                  </li>
                );
              })}
            </ul>
             <p className="font-semibold">Total Estimasi Harga: Rp {selectedFRB.items.reduce((sum, i) => sum + i.requestedQuantity * i.estimatedUnitPrice, 0).toLocaleString('id-ID')}</p>

            {modalAction === 'reject' && (
              <FormField
                id="rejectionReason"
                label="Alasan Penolakan"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                required
                placeholder="Masukkan alasan penolakan FRB ini..."
              />
            )}
            {modalAction === 'approve' && <p className="text-green-700 bg-green-50 p-3 rounded-md">Anda akan menyetujui Form Request Barang ini. Lanjutkan?</p>}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DirectorFRBApprovalListPage;
