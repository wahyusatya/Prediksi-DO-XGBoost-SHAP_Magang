import React, { useState, useMemo } from 'react';
import { Student, getRiskBadge } from './KPICards';
import { 
  ChevronRight, 
  ChevronLeft, 
  Search, 
  Filter, 
  SlidersHorizontal,
  X,
  User,
  GraduationCap,
  Sparkles,
  Layers
} from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRiskTab, setSelectedRiskTab] = useState<'semua' | 'tinggi' | 'sedang' | 'rendah'>('semua');
  const [currentPage, setCurrentPage] = useState(1);

  // Counts for triage tabs
  const tabCounts = useMemo(() => {
    const base = selectedFakultas
      ? data.filter((s) => extractFakultas(s.fakultas_prodi) === selectedFakultas)
      : data;
    return {
      semua: base.length,
      tinggi: base.filter((s) => s.status_risiko?.toLowerCase() === 'tinggi').length,
      sedang: base.filter((s) => s.status_risiko?.toLowerCase() === 'sedang').length,
      rendah: base.filter((s) => s.status_risiko?.toLowerCase() === 'rendah').length,
    };
  }, [data, selectedFakultas]);

  const filteredData = useMemo(() => {
    return data.filter((student) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        student.nim.toLowerCase().includes(q) ||
        student.nama.toLowerCase().includes(q) ||
        (student.fakultas_prodi && student.fakultas_prodi.toLowerCase().includes(q));

      const matchesFakultas =
        !selectedFakultas ||
        extractFakultas(student.fakultas_prodi) === selectedFakultas;

      const matchesRiskTab =
        selectedRiskTab === 'semua' ||
        student.status_risiko?.toLowerCase() === selectedRiskTab;

      return matchesSearch && matchesFakultas && matchesRiskTab;
    });
  }, [data, searchQuery, selectedFakultas, selectedRiskTab]);

  // Reset to page 1 when filters change
  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  
  // Get current page data
  const startIdx = (safePage - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const pageData = filteredData.slice(startIdx, endIdx);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleFakultasChange = (value: string) => {
    onFakultasChange?.(value);
    setCurrentPage(1);
  };

  const handleRiskTabChange = (tab: 'semua' | 'tinggi' | 'sedang' | 'rendah') => {
    setSelectedRiskTab(tab);
    setCurrentPage(1);
  };

  // Helper for student initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden transition-all">
      {/* Table Header & Quick Triage Section */}
      <div className="p-6 border-b border-slate-100 bg-gradient-to-b from-slate-50/70 to-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Daftar Hasil Prediksi Risiko Mahasiswa</h3>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {filteredData.length} Mahasiswa
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik <strong>Analisis XAI & Intervensi</strong> pada setiap baris untuk membedah akar kausalitas & rekomendasi DPA.
            </p>
          </div>

          {/* Search & Faculty Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Faculty Selector */}
            {fakultasOptions.length > 0 && (
              <div className="relative min-w-[200px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Filter className="h-4 w-4" />
                </div>
                <select
                  value={selectedFakultas}
                  onChange={(e) => handleFakultasChange(e.target.value)}
                  className="pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 w-full appearance-none cursor-pointer shadow-xs transition-colors"
                >
                  <option value="">Semua Fakultas</option>
                  {fakultasOptions.map((fak) => (
                    <option key={fak} value={fak}>{fak}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                  <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                </div>
              </div>
            )}

            {/* Search Input (NIM / Nama / Prodi) */}
            <div className="relative min-w-[240px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                placeholder="Cari NIM, Nama, atau Prodi..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 bg-white placeholder:text-slate-400 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 w-full shadow-xs transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Executive Risk Triage Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 mt-5 pt-4 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3" />
            Triage Cepat:
          </span>

          <button
            onClick={() => handleRiskTabChange('semua')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedRiskTab === 'semua'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            Semua ({tabCounts.semua})
          </button>

          <button
            onClick={() => handleRiskTabChange('tinggi')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedRiskTab === 'tinggi'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50/70 text-rose-700 border border-rose-200/80 hover:bg-rose-100/70'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Risiko Tinggi ({tabCounts.tinggi})
          </button>

          <button
            onClick={() => handleRiskTabChange('sedang')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedRiskTab === 'sedang'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50/70 text-amber-800 border border-amber-200/80 hover:bg-amber-100/70'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Risiko Sedang ({tabCounts.sedang})
          </button>

          <button
            onClick={() => handleRiskTabChange('rendah')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedRiskTab === 'rendah'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50/70 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100/70'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Risiko Rendah ({tabCounts.rendah})
          </button>
        </div>
      </div>

      {/* Table Data Matrix */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <tr>
              <th scope="col" className="px-6 py-3.5 text-left">Mahasiswa</th>
              <th scope="col" className="px-6 py-3.5 text-left">Fakultas / Program Studi</th>
              <th scope="col" className="px-6 py-3.5 text-center">Semester</th>
              <th scope="col" className="px-6 py-3.5 text-left min-w-[160px]">Skor Probabilitas DO</th>
              <th scope="col" className="px-6 py-3.5 text-center">Status Risiko</th>
              <th scope="col" className="px-6 py-3.5 text-right">Tindakan Eksekutif</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100 text-xs">
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <User className="w-8 h-8 text-slate-300" />
                    <p className="font-semibold text-slate-700">Tidak ada data mahasiswa yang cocok dengan kriteria filter.</p>
                    <p className="text-xs text-slate-400">Silakan ubah kata kunci pencarian atau reset tab filter risiko.</p>
                    {(searchQuery || selectedRiskTab !== 'semua' || selectedFakultas) && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedRiskTab('semua');
                          onFakultasChange?.('');
                        }}
                        className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-800 underline"
                      >
                        Reset Semua Filter
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              pageData.map((student) => {
                const score = student.skor_prediksi ?? 0;
                const isHigh = student.status_risiko?.toLowerCase() === 'tinggi';
                const isMed = student.status_risiko?.toLowerCase() === 'sedang';

                return (
                  <tr 
                    key={student.nim} 
                    className="hover:bg-blue-50/30 transition-colors group"
                  >
                    {/* Mahasiswa Info & Avatar */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                          {getInitials(student.nama)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-xs leading-tight group-hover:text-blue-700 transition-colors">
                            {student.nama}
                          </p>
                          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                            {student.nim}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Fakultas & Prodi */}
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-700">{student.fakultas_prodi || '-'}</span>
                      </div>
                    </td>

                    {/* SMT */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-200/60">
                        Smt {student.smt ?? 2}
                      </span>
                    </td>

                    {/* Skor Probabilitas DO with mini progress bar */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[90px]">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              isHigh ? 'bg-rose-500' : isMed ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.max(4, score)}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-800 tabular-nums text-xs">
                          {score}%
                        </span>
                      </div>
                    </td>

                    {/* Status Risiko */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2.5 py-1 inline-flex items-center gap-1 text-[11px] rounded-full border ${getRiskBadge(student.status_risiko)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isHigh ? 'bg-rose-500' : isMed ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        {student.status_risiko}
                      </span>
                    </td>

                    {/* Action button */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button 
                        onClick={() => onDetailClick?.(student.nim)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200/90 rounded-xl text-blue-700 font-bold hover:bg-blue-50 hover:border-blue-300 transition-all shadow-2xs hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600/30 text-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        Analisis XAI & Intervensi
                        <ChevronRight className="w-3.5 h-3.5 text-blue-500" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {filteredData.length > 0 && (
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p className="text-slate-500 font-medium">
            Menampilkan <strong className="text-slate-800">{startIdx + 1}–{Math.min(endIdx, filteredData.length)}</strong> dari <strong className="text-slate-800">{filteredData.length}</strong> mahasiswa
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Sebelumnya
            </button>

            <span className="px-3 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-2xs">
              Halaman {safePage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
            >
              Selanjutnya
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

