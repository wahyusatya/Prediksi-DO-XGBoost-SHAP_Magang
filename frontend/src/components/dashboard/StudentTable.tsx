import React, { useState, useMemo } from 'react';
import { Student } from './KPICards';
import { ChevronRight, ChevronLeft, Search, Filter } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

interface StudentTableProps {
  data: Student[];
  onDetailClick?: (nim: string) => void;
  fakultasOptions?: string[];
  selectedFakultas?: string;
  onFakultasChange?: (fakultas: string) => void;
}

export function extractFakultas(fakultasProdi?: string): string {
  if (!fakultasProdi) return '';
  return fakultasProdi.split('/')[0].trim();
}

export default function StudentTable({
  data,
  onDetailClick,
  fakultasOptions = [],
  selectedFakultas = '',
  onFakultasChange,
}: StudentTableProps) {
  const [searchNim, setSearchNim] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  const getRiskBadge = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-800 border-gray-200';
    const s = status.toLowerCase();
    if (s === 'tinggi') return 'bg-red-100 text-red-800 border-red-200';
    if (s === 'sedang') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (s === 'rendah') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const filteredData = useMemo(() => {
    return data.filter((student) => {
      const matchesNim = student.nim.toLowerCase().includes(searchNim.toLowerCase());
      const matchesFakultas =
        !selectedFakultas ||
        extractFakultas(student.fakultas_prodi || student.prodi) === selectedFakultas;
      return matchesNim && matchesFakultas;
    });
  }, [data, searchNim, selectedFakultas]);

  // Reset to page 1 when filters change
  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  
  // Get current page data
  const startIdx = (safePage - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const pageData = filteredData.slice(startIdx, endIdx);

  const handleSearchChange = (value: string) => {
    setSearchNim(value);
    setCurrentPage(1);
  };

  const handleFakultasChange = (value: string) => {
    onFakultasChange?.(value);
    setCurrentPage(1);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Data Prediksi Mahasiswa</h3>
          <p className="mt-1 text-sm text-gray-500">Daftar lengkap hasil prediksi risiko Drop Out mahasiswa aktif.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {fakultasOptions.length > 0 && (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 text-gray-400" />
              </div>
              <select
                value={selectedFakultas}
                onChange={(e) => handleFakultasChange(e.target.value)}
                className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-48 appearance-none cursor-pointer"
              >
                <option value="">Semua Fakultas</option>
                {fakultasOptions.map((fak) => (
                  <option key={fak} value={fak}>{fak}</option>
                ))}
              </select>
            </div>
          )}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Cari berdasarkan NIM..."
              value={searchNim}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
            />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">NIM</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fakultas / Prodi</th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">SMT</th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Skor Prediksi</th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status Risiko</th>
              <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500 text-sm">
                  {data.length === 0 ? 'Tidak ada data mahasiswa yang ditemukan.' : 'Tidak ada hasil pencarian yang cocok.'}
                </td>
              </tr>
            ) : (
              pageData.map((student) => (
                <tr key={student.nim} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.nim}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{student.nama}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.fakultas_prodi || student.prodi || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {student.smt || (student as any).semester || '2'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm font-medium text-gray-900">
                      {student.skor_prediksi ?? 0}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getRiskBadge(student.status_risiko)}`}>
                      {student.status_risiko}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => onDetailClick?.(student.nim)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                    >
                      Detail
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredData.length > ITEMS_PER_PAGE && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Menampilkan {startIdx + 1}–{Math.min(endIdx, filteredData.length)} dari {filteredData.length} mahasiswa
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Sebelumnya
            </button>
            <span className="px-3 py-2 text-sm font-medium text-gray-700">
              {safePage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Selanjutnya
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
