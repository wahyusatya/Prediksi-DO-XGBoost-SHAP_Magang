'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from '@/components/layout/Header';
import KPICards, { Student } from '@/components/dashboard/KPICards';
import MacroInsightsCard from '@/components/dashboard/MacroInsightsCard';
import StudentTable, { extractFakultas } from '@/components/dashboard/StudentTable';
import StudentDetailModal from '@/components/dashboard/StudentDetailModal';
import { Loader2, AlertCircle, RefreshCw, Sparkles, Shield, Building2 } from 'lucide-react';
import { getApiBaseUrl } from '@/utils/api';

export default function DashboardPage() {
  const [data, setData] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNim, setSelectedNim] = useState<string | null>(null);
  const [selectedFakultas, setSelectedFakultas] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchData = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setIsRefreshing(true);
      else setLoading(true);

      const res = await fetch(`${getApiBaseUrl()}/api/v1/mahasiswa?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Gagal memuat data dari server.');
      const result = await res.json();
      setData(result.data || []);
      setError(null);
      setLastUpdated(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Gagal memuat data dari server.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fakultasOptions = useMemo(() => {
    const set = new Set<string>();
    data.forEach((s) => {
      const fak = extractFakultas(s.fakultas_prodi);
      if (fak) set.add(fak);
    });
    return Array.from(set).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    if (!selectedFakultas) return data;
    return data.filter(
      (s) => extractFakultas(s.fakultas_prodi) === selectedFakultas
    );
  }, [data, selectedFakultas]);

  const handleDetailClick = (nim: string) => {
    setSelectedNim(nim);
  };

  const handleCloseModal = () => {
    setSelectedNim(null);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col selection:bg-blue-100 selection:text-blue-900">
      <Header />
      
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative flex-1">
        {/* Executive Hero Context Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/70 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                Executive Information System
              </span>
              {lastUpdated && (
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                  • Terakhir diperbarui: {lastUpdated} WITA
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Ringkasan Eksekutif & Intelijen Drop Out
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
              Monitoring dini probabilitas drop out mahasiswa semester 2 berbasis Explainable AI (XGBoost + SHAP) terintegrasi pada 3 pilar: Akademik, Finansial & Wilayah, serta Kedisiplinan & Keaktifan.
            </p>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
            <button
              onClick={() => fetchData(true)}
              disabled={loading || isRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-all shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              title="Perbarui data terbaru dari backend"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
              <span>{isRefreshing ? 'Sinkronisasi...' : 'Segarkan Data'}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Content View */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-16 shadow-xs flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-800">Menghubungkan ke Server Siprido EIS...</p>
              <p className="text-xs text-slate-500 mt-1">Mengunduh data inferensi prediksi probabilitas DO dan bobot SHAP</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-rose-50/80 border border-rose-200 p-6 sm:p-8 rounded-2xl flex flex-col sm:flex-row items-start gap-4 shadow-xs">
            <div className="p-3 rounded-xl bg-rose-100 text-rose-700 shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-rose-900 font-bold text-base">Gagal Memuat Data Server</h3>
              <p className="text-rose-700 text-xs sm:text-sm mt-1 leading-relaxed">{error}</p>
              <p className="text-rose-600 text-xs mt-2">Pastikan kontainer backend FastAPI berjalan di port 8000 dan database PostgreSQL aktif.</p>
              <button 
                onClick={() => fetchData(true)}
                className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
              >
                Coba Sinkronisasi Ulang
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-300 space-y-2">
            {/* 1. KPI Risk Overview Matrix */}
            <KPICards data={filteredData} />

            {/* 2. Macro Strategic Insights Card */}
            <MacroInsightsCard selectedFakultas={selectedFakultas} />

            {/* 3. Student Predict Table with Multi-Triage */}
            <StudentTable
              data={filteredData}
              onDetailClick={handleDetailClick}
              fakultasOptions={fakultasOptions}
              selectedFakultas={selectedFakultas}
              onFakultasChange={setSelectedFakultas}
            />
          </div>
        )}

        {/* Modal Pop-up SHAP & Prescriptive Intervention */}
        {selectedNim && (
          <StudentDetailModal 
            nim={selectedNim} 
            onClose={handleCloseModal} 
          />
        )}
      </main>

      {/* Institutional Executive Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-slate-900 flex items-center justify-center text-white text-[10px] font-bold">
              S
            </div>
            <span className="font-semibold text-slate-700">Siprido Executive Information System (EIS)</span>
            <span className="text-slate-300 hidden md:inline">|</span>
            <span className="hidden md:inline">Prescriptive ML & XAI Decision Support</span>
          </div>
          <p className="text-center sm:text-right text-[11px] text-slate-400">
            Sistem Informasi Eksekutif Universitas • Machine Learning XGBoost & SHAP Explainability Engine
          </p>
        </div>
      </footer>
    </div>
  );
}

