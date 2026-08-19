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
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 overflow-hidden transition-colors duration-200">
      {/* Table Header & Quick Triage Section */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-b from-slate-50/70 to-white dark:from-slate-800/40 dark:to-slate-900">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Daftar Hasil Prediksi Risiko Mahasiswa</h3>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                {filteredData.length} Mahasiswa
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Klik <strong>Analisis XAI & Intervensi</strong> pada setiap baris untuk membedah akar kausalitas & rekomendasi DPA.
            </p>
          </div>

          {/* Search & Faculty Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Faculty Selector */}
            {fakultasOptions.length > 0 && (
              <div className="relative min-w-[200px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Filter className="h-4 w-4" />
                </div>
                <select
                  value={selectedFakultas}
                  onChange={(e) => handleFakultasChange(e.target.value)}
                  className="pl-9 pr-8 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 w-full appearance-none cursor-pointer shadow-xs transition-colors"
                >
                  <option value="">Semua Fakultas</option>
                  {fakultasOptions.map((fak) => (
                    <option key={fak} value={fak}>{fak}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                </div>
              </div>
            )}

            {/* Search Input (NIM / Nama / Prodi) */}
            <div className="relative min-w-[240px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                placeholder="Cari NIM, Nama, atau Prodi..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 pr-8 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 w-full shadow-xs transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Executive Risk Triage Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-2 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3" />
            Triage Cepat:
          </span>

          <button
            onClick={() => handleRiskTabChange('semua')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedRiskTab === 'semua'
                ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            Semua ({tabCounts.semua})
          </button>

          <button
            onClick={() => handleRiskTabChange('tinggi')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedRiskTab === 'tinggi'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50/70 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/70 hover:bg-rose-100/70 dark:hover:bg-rose-900/60'
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
                : 'bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/70 hover:bg-amber-100/70 dark:hover:bg-amber-900/60'
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
                : 'bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/70 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Risiko Rendah ({tabCounts.rendah})
          </button>
        </div>
      </div>

      {/* Table Data Matrix */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
          <thead className="bg-slate-50/80 dark:bg-slate-800/70 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <tr>
              <th scope="col" className="px-6 py-3.5 text-left">Mahasiswa</th>
              <th scope="col" className="px-6 py-3.5 text-left">Fakultas / Program Studi</th>
              <th scope="col" className="px-6 py-3.5 text-center">Semester</th>
              <th scope="col" className="px-6 py-3.5 text-left min-w-[160px]">Skor Probabilitas DO</th>
              <th scope="col" className="px-6 py-3.5 text-center">Status Risiko</th>
              <th scope="col" className="px-6 py-3.5 text-right">Tindakan Eksekutif</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <User className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold text-slate-700 dark:text-slate-200">Tidak ada data mahasiswa yang cocok dengan kriteria filter.</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Silakan ubah kata kunci pencarian atau reset tab filter risiko.</p>
                    {(searchQuery || selectedRiskTab !== 'semua' || selectedFakultas) && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedRiskTab('semua');
                          onFakultasChange?.('');
                        }}
                        className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
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
                    className="hover:bg-blue-50/30 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    {/* Mahasiswa Info & Avatar */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200 dark:border-slate-700">
                          {getInitials(student.nama)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-xs leading-tight group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                            {student.nama}
                          </p>
                          <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                            {student.nim}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Fakultas & Prodi */}
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">{student.fakultas_prodi || '-'}</span>
                      </div>
                    </td>

                    {/* SMT */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] border border-slate-200/60 dark:border-slate-700/60">
                        Smt {student.smt ?? 2}
                      </span>
                    </td>

                    {/* Skor Probabilitas DO with mini progress bar */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-[90px]">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              isHigh ? 'bg-rose-500' : isMed ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.max(4, score)}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums text-xs">
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl text-blue-700 dark:text-blue-300 font-bold hover:bg-blue-50 dark:hover:bg-slate-700 hover:border-blue-300 dark:hover:border-slate-600 transition-all shadow-2xs hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600/30 text-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        Analisis XAI & Intervensi
                        <ChevronRight className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
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
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            Menampilkan <strong className="text-slate-800 dark:text-slate-200">{startIdx + 1}–{Math.min(endIdx, filteredData.length)}</strong> dari <strong className="text-slate-800 dark:text-slate-200">{filteredData.length}</strong> mahasiswa
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Sebelumnya
            </button>

            <span className="px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs">
              Halaman {safePage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
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

