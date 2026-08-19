import React from 'react';
import { ShieldCheck, Sparkles, Building2 } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-17 items-center">
          {/* Brand & System Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 flex items-center justify-center text-white shadow-md shadow-blue-900/15 ring-1 ring-white/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-slate-900">
                  SIPRIDO <span className="text-blue-700">EIS</span>
                </span>
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  Executive Intelligence
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Sistem Informasi Eksekutif Prediksi & Intervensi Drop Out Mahasiswa
              </p>
            </div>
          </div>

          {/* Right Meta & Profile */}
          <div className="flex items-center gap-3 sm:gap-5">
            {/* System Status Pill */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-semibold text-slate-700">XGBoost & SHAP Engine</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">Real-time Inference</span>
            </div>

            {/* Executive User Badge */}
            <div className="flex items-center gap-2.5 pl-2 sm:pl-3 sm:border-l sm:border-slate-200">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white font-bold text-xs shadow-sm ring-2 ring-slate-100">
                <ShieldCheck className="w-4.5 h-4.5 text-blue-400" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-800 leading-tight">Pimpinan Universitas</p>
                <p className="text-[10px] font-medium text-slate-500">Rektorat & Dekanat</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

