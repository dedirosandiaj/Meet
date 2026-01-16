
import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, X, ExternalLink } from 'lucide-react';

export interface ToastEventDetail {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  duration?: number;
}

const GlobalToast: React.FC = () => {
  const [show, setShow] = useState(false);
  const [data, setData] = useState<ToastEventDetail | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastEventDetail>).detail;
      setData(detail);
      setShow(true);
      setIsExiting(false);

      // Auto hide
      const duration = detail.duration || 5000;
      setTimeout(() => {
        handleClose();
      }, duration);
    };

    window.addEventListener('zoomclone-toast', handleToast);
    return () => window.removeEventListener('zoomclone-toast', handleToast);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setShow(false);
      setData(null);
    }, 300); // Match animation duration
  };

  if (!show || !data) return null;

  const isSuccess = data.type === 'success';

  return (
    <div className={`fixed top-4 right-4 z-[100] w-full max-w-sm transform transition-all duration-300 ease-out ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
      <div className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl shadow-2xl p-4 flex gap-4 ${
        isSuccess 
          ? 'bg-slate-900/90 border-green-500/50 shadow-green-500/20' 
          : 'bg-slate-900/90 border-red-500/50 shadow-red-500/20'
      }`}>
        
        {/* Decorative Glow */}
        <div className={`absolute -top-10 -left-10 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none ${isSuccess ? 'bg-green-500' : 'bg-red-500'}`}></div>

        {/* Icon */}
        <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border ${
          isSuccess 
            ? 'bg-green-500/10 border-green-500/20 text-green-400' 
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {isSuccess ? <CheckCircle2 className="w-6 h-6 animate-[bounce_1s_ease-in-out_1]" /> : <XCircle className="w-6 h-6" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          <h3 className={`font-bold text-sm mb-1 ${isSuccess ? 'text-green-400' : 'text-red-400'}`}>
            {data.title}
          </h3>
          <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-line">
            {data.message}
          </p>
        </div>

        {/* Close Button */}
        <button 
          onClick={handleClose}
          className="shrink-0 text-slate-500 hover:text-white transition-colors self-start"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default GlobalToast;
