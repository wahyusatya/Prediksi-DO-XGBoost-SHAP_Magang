'use client';

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Header from '@/components/layout/Header';
import KPICards, { Student } from '@/components/dashboard/KPICards';
import StudentTable, { extractFakultas } from '@/components/dashboard/StudentTable';
import StudentDetailModal from '@/components/dashboard/StudentDetailModal';
import { Loader2, AlertCircle } from 'lucide-react';
import { getApiBaseUrl } from '@/utils/api';

export default function DashboardPage() {
  const [data, setData] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNim, setSelectedNim] = useState<string | null>(null);
  const [selectedFakultas, setSelectedFakultas] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const baseUrl = getApiBaseUrl();
        const response = await axios.get(`${baseUrl}/api/v1/mahasiswa?t=${Date.now()}`, {
          headers: { 'Cache-Control': 'no-cache, no-store' }
        });
        const students = Array.isArray(response.data) ? response.data : response.data?.data || [];
        setData(students);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.response?.data?.detail || err.message || 'Gagal memuat data dari server.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fakultasOptions = useMemo(() => {
    const set = new Set<string>();
    data.forEach((s) => {
      const fak = extractFakultas(s.fakultas_prodi || s.prodi);
      if (fak) set.add(fak);
    });
    return Array.from(set).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    if (!selectedFakultas) return data;
    return data.filter(
      (s) => extractFakultas(s.fakultas_prodi || s.prodi) === selectedFakultas
    );
  }, [data, selectedFakultas]);

  const handleDetailClick = (nim: string) => {
    setSelectedNim(nim);
  };

  const handleCloseModal = () => {
    setSelectedNim(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Ringkasan Eksekutif</h2>
          <p className="mt-1 text-sm text-gray-500">
            Overview data mahasiswa semester 2 berdasarkan skor prediksi drop out.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-gray-500 font-medium animate-pulse">Memuat data dari server...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg flex items-start space-x-4">
            <AlertCircle className="w-6 h-6 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-red-800 font-medium text-lg">Gagal Memuat Data</h3>
              <p className="text-red-700 mt-1">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 font-medium rounded-lg transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <KPICards data={filteredData} />
            <StudentTable
              data={filteredData}
              onDetailClick={handleDetailClick}
              fakultasOptions={fakultasOptions}
              selectedFakultas={selectedFakultas}
              onFakultasChange={setSelectedFakultas}
            />
          </div>
        )}

        {/* Modal Pop-up SHAP */}
        {selectedNim && (
          <StudentDetailModal 
            nim={selectedNim} 
            onClose={handleCloseModal} 
          />
        )}
      </main>
    </div>
  );
}
