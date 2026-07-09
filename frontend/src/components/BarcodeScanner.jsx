import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X } from 'lucide-react';

export default function BarcodeScanner({ onScan, onClose }) {
  const qrRegionId = "html5-qr-reader";
  const scannerRef = useRef(null);

  useEffect(() => {
    // Start scanner on mount
    const html5QrScanner = new Html5Qrcode(qrRegionId);
    scannerRef.current = html5QrScanner;

    const config = { fps: 10, qrbox: { width: 250, height: 150 } };

    html5QrScanner.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        // Success callback
        onScan(decodedText);
        handleStop();
      },
      (errorMessage) => {
        // Silent logging during frame parsing
      }
    ).catch(err => {
      console.error("Lỗi khởi động camera: ", err);
      alert("Không tìm thấy camera hoặc bị chặn quyền truy cập!");
      onClose();
    });

    return () => {
      handleStop();
    };
  }, []);

  const handleStop = () => {
    if (scannerRef.current) {
      scannerRef.current.stop()
        .then(() => {
          scannerRef.current = null;
        })
        .catch(err => {
          console.error("Lỗi dừng camera:", err);
          scannerRef.current = null;
        });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <h3 className="font-extrabold text-sm flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <Camera size={16} className="text-emerald-600 animate-pulse" /> Quét mã vạch sản phẩm
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center justify-center text-center space-y-4">
          <div 
            id={qrRegionId} 
            className="w-full aspect-[4/3] bg-black rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800"
          />
          <p className="text-xs text-slate-400 font-semibold leading-relaxed">
            Đưa mã vạch hoặc mã QR của nguyên vật liệu vào chính giữa khung camera để quét.
          </p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-center">
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all"
          >
            Đóng camera
          </button>
        </div>

      </div>
    </div>
  );
}
