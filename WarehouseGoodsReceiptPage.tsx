import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { useNotifications } from '../../hooks/useNotifications';
import { PurchaseOrder, POStatus, GoodsReceipt, GRNItem, ItemConditionAtReceipt, ActionTaken, GRNCondition, Item as MasterItem } from '../../types';
import DataTable, { Column } from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/forms/FormField';
import { formatDate, generateId } from '../../utils/helpers';
import Spinner from '../../components/Spinner';

const WarehouseGoodsReceiptPage: React.FC = () => {
  const { user } = useAuth();
  const { purchaseOrders, getPRById, getItemById, getSupplierById, addGRN, logActivity, loading: dataLoading } = useData();
  const { addNotification } = useNotifications();

  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [grnItems, setGrnItems] = useState<Omit<GRNItem, 'id' | 'photoDamaged'>[]>([]);
  const [overallCondition, setOverallCondition] = useState<GRNCondition>(GRNCondition.GOOD);
  const [grnNotes, setGrnNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  if (!user) return null;

  const posAwaitingReceipt = purchaseOrders
    .filter(po => po.status === POStatus.ORDERED || po.status === POStatus.SHIPPED)
    .sort((a,b) => new Date(a.expectedDeliveryDate).getTime() - new Date(b.expectedDeliveryDate).getTime());

  const openReceiptModal = (po: PurchaseOrder) => {
    setSelectedPO(po);
    const relatedPR = getPRById(po.prId);
    if (relatedPR) {
      const initialGrnItems = relatedPR.items.map(prItem => ({
        itemId: prItem.itemId,
        receivedQuantity: prItem.quantityToPurchase, // Default to expected quantity
        conditionAtReceipt: ItemConditionAtReceipt.GOOD,
        quantityDamaged: 0,
        actionTaken: ActionTaken.ACCEPTED,
      }));
      setGrnItems(initialGrnItems);
    } else {
      setGrnItems([]); // Should not happen if data is consistent
    }
    setOverallCondition(GRNCondition.GOOD);
    setGrnNotes('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedPO(null);
    setIsModalOpen(false);
  };

  const handleGrnItemChange = (index: number, field: keyof Omit<GRNItem, 'id' | 'photoDamaged'>, value: string | number) => {
    const newItems = [...grnItems];
    const currentItem = { ...newItems[index] };
  
    // @ts-ignore
    currentItem[field] = value;
  
    if (field === 'conditionAtReceipt') {
      if (value !== ItemConditionAtReceipt.GOOD) {
        currentItem.actionTaken = ActionTaken.RETURNED_TO_SUPPLIER; // Sensible default if damaged
      } else {
        currentItem.actionTaken = ActionTaken.ACCEPTED;
        currentItem.quantityDamaged = 0;
      }
    }
    
    if (field === 'receivedQuantity') {
        const receivedQty = Number(value);
        if (currentItem.quantityDamaged > receivedQty) {
            currentItem.quantityDamaged = receivedQty; // Damaged cannot exceed received
        }
    }

    if (field === 'quantityDamaged') {
        const damagedQty = Number(value);
        if (damagedQty > currentItem.receivedQuantity) {
             // @ts-ignore
            currentItem.quantityDamaged = currentItem.receivedQuantity; // Damaged cannot exceed received
        }
    }


    newItems[index] = currentItem;
    setGrnItems(newItems);
  };

  const handleSubmitGRN = async () => {
    if (!selectedPO || !user) return;
    setProcessing(true);

    const finalGrnItems: GRNItem[] = grnItems.map(item => ({...item, id: generateId()}));

    const grnData: Omit<GoodsReceipt, 'id' | 'receiptDate'> = {
      poId: selectedPO.id,
      warehouseId: user.id,
      overallCondition,
      notes: grnNotes,
      items: finalGrnItems,
    };

    try {
      const newGRN = await addGRN(grnData);
      logActivity(`Warehouse ${user.name} recorded GRN ${newGRN.id} for PO ${selectedPO.id}`, newGRN.id);
      addNotification(`GRN ${newGRN.id} untuk PO ${selectedPO.id} berhasil dicatat. Stok diperbarui.`, user.id);
      closeModal();
    } catch (error) {
      console.error("Error submitting GRN:", error);
      addNotification('Gagal mencatat GRN. Coba lagi.', user.id, 'error');
    } finally {
        setProcessing(false);
    }
  };
  
  const poColumns: Column<PurchaseOrder>[] = [
    { header: 'ID PO', accessor: 'id', className: "w-1/12" },
    { header: 'Supplier', accessor: (item: PurchaseOrder) => getSupplierById(item.supplierId)?.supplierName || 'N/A', className: "w-3/12" },
    { header: 'Tgl. Order', accessor: (item: PurchaseOrder) => formatDate(item.orderDate), className: "w-2/12" },
    { header: 'Exp. Delivery', accessor: (item: PurchaseOrder) => formatDate(item.expectedDeliveryDate), className: "w-2/12" },
    { header: 'Status', accessor: 'status', className: "w-2/12" },
    { 
      header: 'Aksi', 
      accessor: (item: PurchaseOrder) => item.id, // Dummy accessor
      render: (item: PurchaseOrder) => (
        <button onClick={() => openReceiptModal(item)} className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700">
          Terima Barang
        </button>
      ), className: "w-2/12"
    },
  ];

  const inputBaseClasses = "w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
  const numberInputClasses = "w-20 text-center px-2 py-1 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm";


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Penerimaan Barang dari Supplier (GRN)</h1>
      
      <DataTable
        columns={poColumns}
        data={posAwaitingReceipt}
        keyExtractor={(item) => item.id}
        isLoading={dataLoading}
        emptyMessage="Tidak ada PO yang menunggu penerimaan barang saat ini."
      />

      {selectedPO && (
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={`Catat Penerimaan Barang untuk PO: ${selectedPO.id}`}
          size="xl"
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
                type="button" 
                onClick={handleSubmitGRN} 
                disabled={processing} 
                className="ml-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {processing ? <Spinner size="sm" /> : 'Simpan Penerimaan (GRN)'}
              </button>
            </>
          }
        >
          <div className="space-y-4 text-sm text-gray-700">
            <p className="text-gray-900"><strong>Supplier:</strong> {getSupplierById(selectedPO.supplierId)?.supplierName}</p>
            <FormField
                id="overallCondition"
                label="Kondisi Keseluruhan Barang Diterima"
                value={overallCondition}
                onChange={(e) => setOverallCondition(e.target.value as GRNCondition)}
                options={Object.values(GRNCondition).map(c => ({value: c, label: c}))}
                required
            />
            <FormField
                id="grnNotes"
                label="Catatan Penerimaan Tambahan"
                value={grnNotes}
                onChange={(e) => setGrnNotes(e.target.value)}
                rows={2}
                placeholder="Misalnya: kemasan rusak ringan, segel terbuka, dll."
            />
            <h4 className="font-semibold mt-3 text-gray-900">Detail Item Diterima:</h4>
            <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barang</th>
                            <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty Diterima</th>
                            <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Kondisi</th>
                            <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty Rusak</th>
                            <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tindakan</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {grnItems.map((item, index) => {
                            const masterItem = getItemById(item.itemId);
                            return (
                                <tr key={item.itemId}>
                                    <td className="px-2 py-2 whitespace-nowrap text-gray-900">{masterItem?.itemName}</td>
                                    <td className="px-2 py-2">
                                        <input type="number" value={item.receivedQuantity} onChange={e => handleGrnItemChange(index, 'receivedQuantity', parseInt(e.target.value))} className={numberInputClasses}/>
                                    </td>
                                    <td className="px-2 py-2">
                                        <select value={item.conditionAtReceipt} onChange={e => handleGrnItemChange(index, 'conditionAtReceipt', e.target.value as ItemConditionAtReceipt)} className={inputBaseClasses}>
                                            {Object.values(ItemConditionAtReceipt).map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-2 py-2">
                                        <input type="number" value={item.quantityDamaged} onChange={e => handleGrnItemChange(index, 'quantityDamaged', parseInt(e.target.value))} className={numberInputClasses} disabled={item.conditionAtReceipt === ItemConditionAtReceipt.GOOD}/>
                                    </td>
                                    <td className="px-2 py-2">
                                         <select value={item.actionTaken} onChange={e => handleGrnItemChange(index, 'actionTaken', e.target.value as ActionTaken)} className={inputBaseClasses} disabled={item.conditionAtReceipt === ItemConditionAtReceipt.GOOD}>
                                            {Object.values(ActionTaken).map(a => <option key={a} value={a}>{a}</option>)}
                                        </select>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default WarehouseGoodsReceiptPage;