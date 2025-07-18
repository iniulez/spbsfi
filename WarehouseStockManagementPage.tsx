
import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { Item } from '../../types';
import DataTable, { Column } from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/forms/FormField';
import Spinner from '../../components/Spinner';
import { useNotifications } from '../../hooks/useNotifications';

const WarehouseStockManagementPage: React.FC = () => {
  const { user: whUser } = useAuth();
  const { items, updateItemStock, getItemById, logActivity, loading: dataLoading } = useData();
  const { addNotification } = useNotifications();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');


  const openModal = (item: Item) => {
    setSelectedItem(item);
    setAdjustmentType('add');
    setAdjustmentQuantity(0);
    setAdjustmentReason('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const handleStockUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !whUser || adjustmentQuantity <= 0 || !adjustmentReason.trim()) {
      addNotification('Kuantitas harus lebih dari 0 dan alasan wajib diisi.', whUser.id, 'error');
      return;
    }
    
    if (adjustmentType === 'subtract' && selectedItem.currentStock < adjustmentQuantity) {
        addNotification(`Tidak bisa mengurangi stok ${selectedItem.itemName} sebanyak ${adjustmentQuantity}. Stok saat ini hanya ${selectedItem.currentStock}.`, whUser.id, 'error');
        return;
    }

    setProcessing(true);
    try {
      await updateItemStock(selectedItem.id, adjustmentQuantity, adjustmentType);
      const newStock = adjustmentType === 'add' 
        ? selectedItem.currentStock + adjustmentQuantity 
        : selectedItem.currentStock - adjustmentQuantity;
      
      logActivity(
        `${whUser.role} ${whUser.name} melakukan penyesuaian stok manual untuk ${selectedItem.itemName}: ${adjustmentType === 'add' ? '+' : '-'}${adjustmentQuantity}. Stok baru: ${newStock}. Alasan: ${adjustmentReason}`,
        selectedItem.id
      );
      addNotification(`Stok ${selectedItem.itemName} berhasil disesuaikan. Stok baru: ${newStock}.`, whUser.id);
      closeModal();
    } catch (error) {
      console.error("Error updating stock:", error);
      addNotification('Gagal melakukan penyesuaian stok. Silakan coba lagi.', whUser.id, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const filteredItems = items.filter(item => 
    item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.id.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => a.itemName.localeCompare(b.itemName));


  const columns: Column<Item>[] = [
    { header: 'ID Barang', accessor: 'id', className: "w-1/12" },
    { header: 'Nama Barang', accessor: 'itemName', className: "w-5/12" },
    { header: 'Unit', accessor: 'unit', className: "w-1/12" },
    { header: 'Stok Saat Ini', accessor: 'currentStock', className: "w-2/12 text-center font-semibold" },
    {
      header: 'Aksi',
      accessor: (item: Item) => item.id, // Dummy accessor
      render: (item: Item) => (
        <button onClick={() => openModal(item)} className="px-3 py-1 text-xs font-medium text-white bg-orange-500 rounded hover:bg-orange-600">
          Sesuaikan Stok
        </button>
      ),
      className: "w-2/12"
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Manajemen Stok Barang Gudang</h1>
      <p className="text-gray-600">Halaman ini digunakan untuk melakukan penyesuaian stok manual (misalnya karena hasil stock opname, barang ditemukan, atau penghapusan barang rusak non-transaksional).</p>
      
      <div className="my-4">
        <FormField
            id="searchTerm"
            label="Cari Barang (Nama atau ID)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ketik nama atau ID barang..."
            className="mb-0"
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredItems}
        keyExtractor={(item) => item.id}
        isLoading={dataLoading || processing}
        emptyMessage={searchTerm ? "Tidak ada barang yang cocok dengan pencarian." : "Tidak ada data barang."}
      />

      {selectedItem && (
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={`Sesuaikan Stok: ${selectedItem.itemName}`}
          footer={
            <>
              <button type="button" onClick={closeModal} disabled={processing} className="btn-secondary">Batal</button>
              <button type="submit" form="stockAdjustmentForm" disabled={processing} className="btn-primary ml-3">
                {processing ? <Spinner size="sm"/> : 'Simpan Penyesuaian'}
              </button>
            </>
          }
        >
          <form id="stockAdjustmentForm" onSubmit={handleStockUpdate} className="space-y-4">
            <p className="text-sm">Stok saat ini: <span className="font-bold">{selectedItem.currentStock} {selectedItem.unit}</span></p>
            <FormField
              id="adjustmentType"
              label="Jenis Penyesuaian"
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as 'add' | 'subtract')}
              options={[
                { value: 'add', label: 'Tambah Stok' },
                { value: 'subtract', label: 'Kurangi Stok' },
              ]}
              required
            />
            <FormField
              id="adjustmentQuantity"
              label="Jumlah Penyesuaian"
              type="number"
              value={adjustmentQuantity}
              onChange={(e) => setAdjustmentQuantity(Math.max(0, parseInt(e.target.value)))} // Ensure non-negative
              error={adjustmentQuantity <= 0 ? 'Jumlah harus lebih dari 0' : undefined}
              required
            />
            <FormField
              id="adjustmentReason"
              label="Alasan Penyesuaian"
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              rows={3}
              placeholder="Contoh: Hasil stock opname, barang ditemukan, penghapusan barang rusak, dll."
              required
              error={!adjustmentReason.trim() ? 'Alasan wajib diisi' : undefined}
            />
          </form>
        </Modal>
      )}
    </div>
  );
};

export default WarehouseStockManagementPage;