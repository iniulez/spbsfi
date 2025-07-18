
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { useNotifications } from '../../hooks/useNotifications';
import { RejectionReport, ReconciliationStatus } from '../../types';
import DataTable, { Column } from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/forms/FormField';
import { formatDate } from '../../utils/helpers';
import Spinner from '../../components/Spinner';

const ReconciliationReportListPage: React.FC = () => {
  const { user } = useAuth();
  const { rejectionReports, getTTBById, getDOById, getFRBById, getUserById, updateRejectionReport, logActivity, loading: dataLoading } = useData();
  const { addNotification } = useNotifications();

  const [selectedReport, setSelectedReport] = useState<RejectionReport | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  if (!user) return null;

  // Users who can access this page: PM, Purchasing, Warehouse, Admin
  // Filter logic can be more complex based on specific involvement if needed.
  // For now, PMs see reports related to their FRBs, Warehouse/Purchasing/Admin see all.
  const relevantReports = rejectionReports.filter(report => {
    if (user.role === 'Admin' || user.role === 'Purchasing' || user.role === 'Warehouse') return true;
    if (user.role === 'Project Manager') {
        const ttb = getTTBById(report.ttbId); // Ensure getTTBById is available and used
        if (ttb) {
            const deliveryOrder = getDOById(ttb.doId);
            if(deliveryOrder){
                const frb = getFRBById(deliveryOrder.frbId);
                return frb?.pmId === user.id;
            }
        }
    }
    return false;
  }).sort((a,b) => new Date(b.reportingDate).getTime() - new Date(a.reportingDate).getTime());

  const openModal = (report: RejectionReport) => {
    setSelectedReport(report);
    setResolutionNotes(report.resolutionNotes || '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedReport(null);
    setIsModalOpen(false);
  };

  const handleResolveRejection = async () => {
    if (!selectedReport || !resolutionNotes.trim() || !user) {
        addNotification("Catatan resolusi wajib diisi.", user.id, 'error');
        return;
    }
    setProcessing(true);
    try {
        const updatedReportData: RejectionReport = {
            ...selectedReport,
            reconciliationStatus: ReconciliationStatus.RESOLVED,
            resolutionNotes,
            resolutionDate: new Date().toISOString(),
        };
        await updateRejectionReport(updatedReportData);
        logActivity(`${user.role} ${user.name} menyelesaikan rekonsiliasi untuk Laporan Penolakan ${selectedReport.id}`, selectedReport.id);
        addNotification(`Rekonsiliasi untuk Laporan ${selectedReport.id} telah diselesaikan.`, user.id);
        closeModal();
    } catch (error) {
        console.error("Error resolving rejection report:", error);
        addNotification('Gagal menyelesaikan rekonsiliasi. Coba lagi.', user.id, 'error');
    } finally {
        setProcessing(false);
    }
  };

  const columns: Column<RejectionReport>[] = [
    { header: 'ID Laporan', accessor: 'id', className: "w-1/12" },
    { header: 'ID TTB', accessor: 'ttbId', className: "w-1/12" },
    { header: 'Tgl. Lapor', accessor: (item: RejectionReport) => formatDate(item.reportingDate, true), className: "w-2/12" },
    { header: 'Alasan', accessor: 'reasonForRejection', className: "w-2/12" },
    { header: 'Pelapor (WH)', accessor: (item: RejectionReport) => getUserById(item.warehouseId)?.name || 'N/A', className: "w-2/12" },
    { 
      header: 'Status Rekonsiliasi', 
      accessor: 'reconciliationStatus', 
      render: (item: RejectionReport) => (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
            item.reconciliationStatus === ReconciliationStatus.RESOLVED ? 'bg-green-100 text-green-700' :
            item.reconciliationStatus === ReconciliationStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-700' :
            'bg-yellow-100 text-yellow-700' // Pending
        }`}>{item.reconciliationStatus}</span>
    ), className: "w-2/12" },
    { 
      header: 'Aksi', 
      accessor: (item: RejectionReport) => item.id, // Dummy accessor
      render: (item: RejectionReport) => (
        <button onClick={() => openModal(item)} className="px-3 py-1 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600">
          {item.reconciliationStatus === ReconciliationStatus.RESOLVED ? 'Lihat Detail' : 'Proses Rekonsiliasi'}
        </button>
      ), className: "w-2/12"
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Laporan Penolakan Barang & Rekonsiliasi</h1>
      
      <DataTable
        columns={columns}
        data={relevantReports}
        keyExtractor={(item) => item.id}
        isLoading={dataLoading}
        emptyMessage="Tidak ada laporan penolakan yang relevan untuk Anda saat ini."
      />

      {selectedReport && (
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={`Detail Laporan Penolakan: ${selectedReport.id}`}
          size="lg"
          footer={selectedReport.reconciliationStatus !== ReconciliationStatus.RESOLVED ? (
            <>
              <button type="button" onClick={closeModal} disabled={processing} className="btn-secondary">Tutup</button>
              <button type="button" onClick={handleResolveRejection} disabled={processing} className="btn-primary ml-3">
                {processing ? <Spinner size="sm" /> : 'Selesaikan Rekonsiliasi'}
              </button>
            </>
          ) : <button type="button" onClick={closeModal} className="btn-secondary">Tutup</button>}
        >
          <div className="space-y-3 text-sm">
            <p><strong>ID Laporan:</strong> {selectedReport.id}</p>
            <p><strong>ID TTB Terkait:</strong> {selectedReport.ttbId}</p>
            <p><strong>Tanggal Pelaporan:</strong> {formatDate(selectedReport.reportingDate, true)}</p>
            <p><strong>Dilaporkan Oleh (Warehouse):</strong> {getUserById(selectedReport.warehouseId)?.name || 'N/A'}</p>
            <p><strong>Alasan Penolakan:</strong> <span className="font-semibold">{selectedReport.reasonForRejection}</span></p>
            <p><strong>Detail Alasan:</strong> {selectedReport.detailedReason}</p>
            {selectedReport.photosOfDamage && selectedReport.photosOfDamage.length > 0 && (
                <p><strong>Foto Kerusakan:</strong> {selectedReport.photosOfDamage.join(', ')} (Tampilan foto tidak diimplementasikan)</p>
            )}
            <hr className="my-2"/>
            <p><strong>Status Rekonsiliasi Saat Ini:</strong> <span className="font-semibold">{selectedReport.reconciliationStatus}</span></p>
            {selectedReport.reconciliationStatus === ReconciliationStatus.RESOLVED && (
                 <>
                    <p><strong>Catatan Resolusi:</strong> {selectedReport.resolutionNotes}</p>
                    <p><strong>Tanggal Resolusi:</strong> {formatDate(selectedReport.resolutionDate, true)}</p>
                 </>
            )}
            {selectedReport.reconciliationStatus !== ReconciliationStatus.RESOLVED && (
                 <FormField
                    id="resolutionNotes"
                    label="Catatan & Tindakan Resolusi"
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    rows={4}
                    required
                    placeholder="Jelaskan tindakan yang diambil untuk menyelesaikan masalah ini (misal: barang diganti, retur ke supplier, dll.)"
                />
            )}
             <div className="mt-4 p-3 bg-gray-50 border rounded-md">
                <h5 className="font-semibold mb-1">Diskusi Rekonsiliasi (Placeholder)</h5>
                <p className="text-xs text-gray-500">Area ini dapat digunakan untuk fitur chat/komentar antar pihak terkait (PM, Purchasing, Warehouse) untuk membahas penyelesaian. Fitur ini tidak diimplementasikan.</p>
             </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ReconciliationReportListPage;
