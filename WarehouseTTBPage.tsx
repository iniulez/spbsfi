
import React, { useState, useEffect, ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { useNotifications } from '../../hooks/useNotifications';
import { DeliveryOrder, DOStatus, TandaTerimaBarang, TTBItem, TTBStatus, RejectionReport, RejectionReason, ItemConditionStatus, Item as MasterItem } from '../../types';
import FormField from '../../components/forms/FormField';
import Spinner from '../../components/Spinner';
import { generateId, formatDate } from '../../utils/helpers';

// Basic Signature Pad Placeholder
const SignaturePad: React.FC<{ onEnd: (dataUrl: string) => void, onClear: () => void, disabled?: boolean }> = ({ onEnd, onClear, disabled }) => {
  const [drawing, setDrawing] = useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
      }
    }
  }, []);

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(event.nativeEvent.offsetX, event.nativeEvent.offsetY);
        setDrawing(true);
      }
    }
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    if (!drawing || disabled) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineTo(event.nativeEvent.offsetX, event.nativeEvent.offsetY);
        ctx.stroke();
      }
    }
  };

  const endDrawing = () => {
    if (disabled) return;
    setDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onEnd(canvas.toDataURL('image/png'));
    }
  };
  
  const clearPad = () => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if(canvas){
        const ctx = canvas.getContext('2d');
        if(ctx) {
            ctx.clearRect(0,0, canvas.width, canvas.height);
            onClear();
        }
    }
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={300}
        height={150}
        className={`border border-gray-400 rounded-md ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing} // End drawing if mouse leaves canvas
      />
      {!disabled && <button type="button" onClick={clearPad} className="mt-2 text-xs text-blue-600 hover:underline">Bersihkan Tanda Tangan</button>}
    </div>
  );
};


const WarehouseTTBPage: React.FC = () => {
  const { doId } = useParams<{ doId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getDOById, getFRBById, getItemById, addTTB, addRejectionReport, updateItemStock, logActivity, loading: dataLoading } = useData();
  const { addNotification } = useNotifications();

  const [deliveryOrder, setDeliveryOrder] = useState<DeliveryOrder | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [recipientContact, setRecipientContact] = useState('');
  const [recipientSignature, setRecipientSignature] = useState<string | null>(null); // Data URL or file name
  const [photoOfDelivery, setPhotoOfDelivery] = useState<File[]>([]);
  const [ttbItems, setTtbItems] = useState<Omit<TTBItem, 'id'>[]>([]);
  const [isAccepted, setIsAccepted] = useState(true);
  
  // Rejection fields
  const [rejectionReasonState, setRejectionReasonState] = useState<RejectionReason>(RejectionReason.DAMAGED);
  const [detailedRejectionReason, setDetailedRejectionReason] = useState('');
  const [photosOfDamage, setPhotosOfDamage] = useState<File[]>([]);
  
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (doId) {
      const fetchedDO = getDOById(doId);
      setDeliveryOrder(fetchedDO);
      if (fetchedDO) {
        const frb = getFRBById(fetchedDO.frbId);
        setRecipientName(frb?.recipientName || '');
        setRecipientContact(frb?.recipientContact || '');
        setTtbItems(fetchedDO.items.map(item => ({
          itemId: item.itemId,
          deliveredQuantity: item.deliveredQuantity,
          conditionAtAcceptance: ItemConditionStatus.GOOD,
        })));
      } else {
        addNotification(`Delivery Order dengan ID ${doId} tidak ditemukan.`, user?.id || '', 'error');
        navigate('/warehouse/do-preparation');
      }
    }
  }, [doId, getDOById, getFRBById, user, addNotification, navigate]);

  const handleTTBItemConditionChange = (index: number, condition: ItemConditionStatus) => {
    const newItems = [...ttbItems];
    newItems[index].conditionAtAcceptance = condition;
    setTtbItems(newItems);
  };
  
  const handleSignatureEnd = (dataUrl: string) => {
    setRecipientSignature(dataUrl); // For now, store as data URL. In real app, upload this.
  };
  const handleSignatureClear = () => {
    setRecipientSignature(null);
  }

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, type: 'delivery' | 'damage') => {
    const target = e.target as HTMLInputElement;
    if (target.files) {
      const filesArray = Array.from(target.files);
      if (type === 'delivery') setPhotoOfDelivery(prev => [...prev, ...filesArray]);
      else if (type === 'damage') setPhotosOfDamage(prev => [...prev, ...filesArray]);
    }
  };


  const handleSubmitTTB = async () => {
    if (!deliveryOrder || !user) return;
    if (!isAccepted && !detailedRejectionReason.trim()){
        addNotification("Alasan detail penolakan wajib diisi jika barang ditolak.", user.id, 'error');
        return;
    }
    if (isAccepted && !recipientSignature){
        addNotification("Tanda tangan penerima wajib ada jika barang diterima.", user.id, 'error');
        return;
    }

    setProcessing(true);

    const ttbData: Omit<TandaTerimaBarang, 'id' | 'acceptanceDate'> = {
      doId: deliveryOrder.id,
      warehouseId: user.id,
      recipientName,
      recipientContact,
      deliveryAddress: getFRBById(deliveryOrder.frbId)?.deliveryAddress || '',
      recipientSignature: recipientSignature ? `signature_${Date.now()}.png` : undefined, // Placeholder filename
      photoOfDelivery: photoOfDelivery.map(f => f.name), // Placeholder filenames
      recipientStatement: isAccepted ? "Seluruh barang telah diterima dalam kondisi baik." : "Barang ditolak/diterima dengan catatan.",
      status: isAccepted ? TTBStatus.ACCEPTED : TTBStatus.REJECTED,
      items: ttbItems.map(item => ({...item, id: generateId()})),
    };

    try {
      const newTTB = await addTTB(ttbData);
      logActivity(`Warehouse ${user.name} created TTB ${newTTB.id} for DO ${deliveryOrder.id}, Status: ${newTTB.status}`, newTTB.id);
      addNotification(`TTB ${newTTB.id} berhasil dicatat.`, user.id);

      if (newTTB.status === TTBStatus.REJECTED) {
        const rejectionReportData: Omit<RejectionReport, 'id' | 'reportingDate' | 'reconciliationStatus'> = {
          ttbId: newTTB.id,
          warehouseId: user.id,
          reasonForRejection: rejectionReasonState, // Corrected from shorthand
          detailedReason: detailedRejectionReason,
          photosOfDamage: photosOfDamage.map(f => f.name), // Placeholder filenames
        };
        const newRejection = await addRejectionReport(rejectionReportData);
        logActivity(`Rejection Report ${newRejection.id} created for TTB ${newTTB.id}`, newRejection.id);
        
        // Return rejected items to stock (simplified)
        newTTB.items.forEach(ttbItem => {
            // Assume all items on a rejected TTB are returned to stock. More complex logic may be needed.
            updateItemStock(ttbItem.itemId, ttbItem.deliveredQuantity, 'add');
        });
        addNotification(`Laporan penolakan ${newRejection.id} dibuat. Stok barang yang ditolak telah dikembalikan.`, user.id);

      }
      navigate('/warehouse/do-preparation'); // Or to a TTB list page
    } catch (error) {
      console.error("Error submitting TTB:", error);
      addNotification('Gagal mencatat TTB. Coba lagi.', user.id, 'error');
    } finally {
        setProcessing(false);
    }
  };

  if (dataLoading && !deliveryOrder) return <div className="flex justify-center items-center h-64"><Spinner message="Memuat data Delivery Order..." /></div>;
  if (!deliveryOrder) return <p className="text-center text-red-500">Delivery Order tidak ditemukan.</p>;
  
  const frbDetails = getFRBById(deliveryOrder.frbId);

  return (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow-xl max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Tanda Terima Barang (TTB)</h1>
      <p className="text-sm text-gray-600 mb-6">Untuk Delivery Order ID: <span className="font-semibold">{deliveryOrder.id}</span> (FRB: {deliveryOrder.frbId})</p>

      <div className="space-y-6">
        <FormField id="recipientName" label="Nama Penerima (Sesuai FRB)" value={frbDetails?.recipientName || recipientName} onChange={e => setRecipientName(e.target.value)} required />
        <FormField id="recipientContact" label="Kontak Penerima (Sesuai FRB)" value={frbDetails?.recipientContact || recipientContact} onChange={e => setRecipientContact(e.target.value)} required />
        <FormField id="deliveryAddress" label="Alamat Pengiriman (Sesuai FRB)" value={frbDetails?.deliveryAddress || ''} onChange={() => {}} disabled rows={2}/>

        <h3 className="text-lg font-semibold text-gray-700 pt-4 border-t mt-6">Detail Barang Diserahkan:</h3>
        {ttbItems.map((item, index) => {
            const masterItem = getItemById(item.itemId);
            return (
                <div key={item.itemId} className="p-3 border rounded-md bg-gray-50 text-sm">
                    <p><strong>{masterItem?.itemName}</strong> - Jumlah: {item.deliveredQuantity} {masterItem?.unit}</p>
                    <FormField
                        id={`itemCondition_${index}`}
                        label="Kondisi Saat Diterima Penerima"
                        value={item.conditionAtAcceptance}
                        onChange={(e) => handleTTBItemConditionChange(index, e.target.value as ItemConditionStatus)}
                        options={Object.values(ItemConditionStatus).map(s => ({value: s, label: s}))}
                        className="mt-1"
                    />
                </div>
            );
        })}

        <div className="pt-4 border-t mt-6">
            <label className="block text-sm font-medium text-gray-700">Tanda Tangan Penerima:</label>
            <SignaturePad onEnd={handleSignatureEnd} onClear={handleSignatureClear} disabled={!isAccepted} />
            {recipientSignature && isAccepted && <p className="text-xs text-green-600 mt-1">Tanda tangan diterima.</p>}
        </div>
        
        <FormField 
            id="photoOfDelivery" 
            label="Upload Foto Saat Serah Terima (Opsional)" 
            type="file" 
            value="" // File inputs don't typically have a controlled value
            onChange={(e) => handlePhotoUpload(e, 'delivery')} 
            inputClassName="text-sm"
        >
            {photoOfDelivery.length > 0 && <p className="text-xs text-gray-500 mt-1">{photoOfDelivery.length} file dipilih.</p>}
        </FormField>

        <div className="pt-4 border-t mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Status Penerimaan:</label>
            <div className="flex items-center space-x-4">
                <label className="flex items-center">
                    <input type="radio" name="acceptanceStatus" checked={isAccepted} onChange={() => setIsAccepted(true)} className="form-radio h-4 w-4 text-blue-600"/>
                    <span className="ml-2 text-sm text-gray-700">Diterima dengan Baik</span>
                </label>
                <label className="flex items-center">
                    <input type="radio" name="acceptanceStatus" checked={!isAccepted} onChange={() => setIsAccepted(false)} className="form-radio h-4 w-4 text-red-600"/>
                    <span className="ml-2 text-sm text-gray-700">Ditolak / Ada Masalah</span>
                </label>
            </div>
        </div>

        {!isAccepted && (
            <div className="mt-6 p-4 border border-red-300 rounded-md bg-red-50 space-y-4">
                <h3 className="text-lg font-semibold text-red-700">Laporan Penolakan Barang</h3>
                <FormField
                    id="rejectionReason"
                    label="Alasan Penolakan Utama"
                    value={rejectionReasonState}
                    onChange={(e) => setRejectionReasonState(e.target.value as RejectionReason)}
                    options={Object.values(RejectionReason).map(r => ({value: r, label: r}))}
                    required
                />
                <FormField
                    id="detailedRejectionReason"
                    label="Detail Alasan Penolakan"
                    value={detailedRejectionReason}
                    onChange={(e) => setDetailedRejectionReason(e.target.value)}
                    rows={3}
                    placeholder="Jelaskan secara rinci mengapa barang ditolak atau masalah yang ada."
                    required
                />
                <FormField 
                    id="photosOfDamage" 
                    label="Upload Foto Kerusakan/Masalah (Jika Ada)" 
                    type="file" 
                    value="" // File inputs don't typically have a controlled value
                    onChange={(e) => handlePhotoUpload(e, 'damage')} 
                    inputClassName="text-sm"
                >
                     {photosOfDamage.length > 0 && <p className="text-xs text-gray-500 mt-1">{photosOfDamage.length} file dipilih.</p>}
                </FormField>
            </div>
        )}

        <div className="mt-8 flex justify-end">
            <button 
                type="button" 
                onClick={handleSubmitTTB}
                disabled={processing || (deliveryOrder.status !== DOStatus.PREPARED_BY_WAREHOUSE && deliveryOrder.status !== DOStatus.SENT)} // SENT might be for re-attempt
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition shadow disabled:opacity-50"
            >
                {processing ? <Spinner size="sm"/> : 'Simpan TTB & Selesaikan Pengiriman'}
            </button>
        </div>
         {(deliveryOrder.status !== DOStatus.PREPARED_BY_WAREHOUSE && deliveryOrder.status !== DOStatus.SENT) && 
            <p className="text-xs text-red-500 text-right mt-2">TTB hanya bisa dibuat untuk DO yang statusnya 'Prepared by Warehouse' atau 'Sent'. Status saat ini: {deliveryOrder.status}</p>
        }
      </div>
    </div>
  );
};

export default WarehouseTTBPage;
