import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { PurchaseOrder, POStatus } from '../../types';
import DataTable, { Column } from '../../components/DataTable';
import { formatDate, truncateText } from '../../utils/helpers';
import Modal from '../../components/Modal'; // For viewing PO details

const PurchasingPOPage: React.FC = () => {
  const { user } = useAuth();
  const { purchaseOrders, getPRById, getSupplierById, getItemById, loading: dataLoading } = useData();
  const [viewPO, setViewPO] = useState<PurchaseOrder | null>(null);

  if (!user) return null;

  const sortedPOs = purchaseOrders.sort((a,b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

  const columns: Column<PurchaseOrder>[] = [
    { header: 'ID PO', accessor: 'id', className: "w-1/12" },
    { header: 'PR ID', accessor: 'prId', className: "w-1/12" },
    { header: 'Supplier', accessor: (item: PurchaseOrder) => truncateText(getSupplierById(item.supplierId)?.supplierName, 20) || 'N/A', className: "w-2/12" },
    { header: 'Tgl. Order', accessor: (item: PurchaseOrder) => formatDate(item.orderDate), className: "w-2/12" },
    { header: 'Exp. Delivery', accessor: (item: PurchaseOrder) => formatDate(item.expectedDeliveryDate), className: "w-2/12" },
    { 
      header: 'Status', 
      accessor: 'status', 
      render: (item: PurchaseOrder) => (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
            item.status === POStatus.FULLY_RECEIVED ? 'bg-green-100 text-green-700' :
            item.status === POStatus.CANCELED ? 'bg-red-100 text-red-700' :
            item.status === POStatus.PARTIALLY_RECEIVED ? 'bg-yellow-100 text-yellow-700' :
            'bg-blue-100 text-blue-700' // Ordered, Shipped
        }`}>{item.status}</span>
    ), className: "w-2/12" },
    { header: 'Total Harga', accessor: (item: PurchaseOrder) => `Rp ${item.totalPrice.toLocaleString('id-ID')}`, className: "w-2/12 text-right"},
    { 
      header: 'Aksi', 
      accessor: (item: PurchaseOrder) => item.id, // Dummy accessor
      render: (item: PurchaseOrder) => (
        <button onClick={() => setViewPO(item)} className="px-3 py-1 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600">
            Lihat Detail
        </button>
      ), className: "w-1/12"
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Manajemen Purchase Order (PO)</h1>
      
      <DataTable
        columns={columns}
        data={sortedPOs}
        keyExtractor={(item) => item.id}
        isLoading={dataLoading}
        emptyMessage="Belum ada Purchase Order yang dibuat."
      />

      {viewPO && (
        <Modal
            isOpen={!!viewPO}
            onClose={() => setViewPO(null)}
            title={`Detail Purchase Order: ${viewPO.id}`}
            size="lg"
        >
            <div className="space-y-3 text-sm text-gray-700">
                <p><strong>ID PO:</strong> {viewPO.id}</p>
                <p><strong>ID PR Terkait:</strong> {viewPO.prId}</p>
                <p><strong>Supplier:</strong> {getSupplierById(viewPO.supplierId)?.supplierName || 'N/A'}</p>
                <p><strong>Tanggal Order:</strong> {formatDate(viewPO.orderDate, true)}</p>
                <p><strong>Perkiraan Tanggal Pengiriman:</strong> {formatDate(viewPO.expectedDeliveryDate)}</p>
                {viewPO.actualDeliveryDate && <p><strong>Tanggal Pengiriman Aktual:</strong> {formatDate(viewPO.actualDeliveryDate)}</p>}
                <p><strong>Status PO:</strong> <span className="font-semibold">{viewPO.status}</span></p>
                <p><strong>Total Harga PO:</strong> Rp {viewPO.totalPrice.toLocaleString('id-ID')}</p>
                
                <h4 className="font-semibold pt-2 mt-2 border-t text-gray-800">Item dalam PO (dari PR):</h4>
                { (() => {
                    const relatedPR = getPRById(viewPO.prId);
                    if (!relatedPR) return <p className="text-gray-500">Detail item PR tidak ditemukan.</p>;
                    return (
                        <ul className="list-disc list-inside space-y-1 max-h-40 overflow-y-auto bg-gray-50 p-2 rounded-md">
                        {relatedPR.items.map(prItem => {
                            const masterItem = getItemById(prItem.itemId);
                            return (
                            <li key={prItem.id} className="text-gray-700">
                                {masterItem?.itemName || 'Barang tidak dikenal'} - Jumlah: {prItem.quantityToPurchase} {masterItem?.unit || 'unit'}
                            </li>
                            );
                        })}
                        </ul>
                    );
                })()}
            </div>
        </Modal>
      )}
    </div>
  );
};

export default PurchasingPOPage;