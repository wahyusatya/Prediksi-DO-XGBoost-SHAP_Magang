import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Student, getRiskBadge } from './KPICards';
import { 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown,
  Check,
  Search, 
  Filter, 
  SlidersHorizontal,
  X, 
  User, 
  GraduationCap, 
  Sparkles, 
  Layers,
  Building2,
  AlertOctagon
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
  const [isFakultasOpen, setIsFakultasOpen] = useState(false);
  const [fakultasSearch, setFakultasSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside & Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFakultasOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFakultasOpen(false);
      }
    };
    if (isFakultasOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFakultasOpen]);

  // Statistics per faculty for intelligence badges
  const facultyStats = useMemo(() => {
    const stats: Record<string, { total: number; highRisk: number }> = {};
    data.forEach((s) => {
      const fak = extractFakultas(s.fakultas_prodi);
      if (fak) {
        if (!stats[fak]) stats[fak] = { total: 0, highRisk: 0 };
        stats[fak].total += 1;
        if (s.status_risiko?.toLowerCase() === 'tinggi') {
          stats[fak].highRisk += 1;
        }
      }
    });
    return stats;
  }, [data]);

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

  // Filtered faculties in dropdown search
  const visibleFakultasOptions = useMemo(() => {
    if (!fakultasSearch.trim()) return fakultasOptions;
    return fakultasOptions.filter((f) => 
      f.toLowerCase().includes(fakultasSearch.toLowerCase().trim())
    );
  }, [fakultasOptions, fakultasSearch]);

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
    setIsFakultasOpen(false);
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
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 overflow-visible transition-colors duration-200">
      {/* Table Header & Quick Triage Section */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-b from-slate-50/70 to-white dark:from-slate-800/40 dark:to-slate-900 rounded-t-2xl">
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

          {/* Search & Custom Executive Faculty Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Custom Executive Faculty Selector */}
            {fakultasOptions.length > 0 && (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsFakultasOpen(!isFakultasOpen)}
                  className={`inline-flex items-center justify-between gap-2.5 px-3.5 py-2 border rounded-xl text-xs font-semibold transition-all duration-150 w-full sm:w-auto sm:min-w-[230px] shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-600/30 ${
                    isFakultasOpen
                      ? 'bg-blue-50/80 dark:bg-slate-800 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-200 ring-2 ring-blue-600/20'
                      : selectedFakultas
                        ? 'bg-blue-50/60 dark:bg-blue-950/50 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-300 hover:bg-blue-100/60 dark:hover:bg-blue-900/40 hover:border-blue-400 dark:hover:border-blue-700'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                  aria-haspopup="listbox"
                  aria-expanded={isFakultasOpen}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="p-1 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 shrink-0">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">
                      {selectedFakultas || 'Semua Fakultas'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    {selectedFakultas ? (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFakultasChange('');
                        }}
                        title="Reset filter fakultas"
                        className="p-0.5 rounded-full hover:bg-blue-200/80 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {data.length}
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${isFakultasOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''}`} />
                  </div>
                </button>

                {/* Dropdown Menu Overlay */}
                {isFakultasOpen && (
                  <div className="absolute top-full right-0 sm:left-0 mt-2 z-50 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 animate-in fade-in zoom-in-95 duration-150 origin-top">
                    {/* Header inside popup */}
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          Pilih Unit Akademik / Fakultas
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Filter data tabel dan analisis makro</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {fakultasOptions.length} Fakultas
                      </span>
                    </div>

                    {/* Quick search if faculties > 3 */}
                    {fakultasOptions.length > 3 && (
                      <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Cari nama fakultas..."
                            value={fakultasSearch}
                            onChange={(e) => setFakultasSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>
                    )}

                    {/* Menu Options List */}
                    <div className="max-h-64 overflow-y-auto py-1 space-y-1">
                      {/* Option 1: Semua Fakultas (All) */}
                      <button
                        type="button"
                        onClick={() => handleFakultasChange('')}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                          !selectedFakultas
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            !selectedFakultas
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}>
                            <Layers className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs truncate font-bold">Seluruh Universitas</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">Semua Fakultas ({data.length} Mahasiswa)</p>
                          </div>
                        </div>

                        {!selectedFakultas && (
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>

                      {/* Individual Faculties */}
                      {visibleFakultasOptions.map((fak) => {
                        const isSelected = selectedFakultas === fak;
                        const stat = facultyStats[fak] || { total: 0, highRisk: 0 };
                        const initials = fak.split(/\s+/).map((w: string) => w[0]).join('').substring(0, 3).toUpperCase();

                        return (
                          <button
                            key={fak}
                            type="button"
                            onClick={() => handleFakultasChange(fak)}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                              isSelected
                                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                isSelected
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60'
                              }`}>
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs truncate font-bold">{fak}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                    {stat.total} Mahasiswa
                                  </span>
                                  {stat.highRisk > 0 && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60 flex items-center gap-0.5">
                                      <AlertOctagon className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400" />
                                      {stat.highRisk} Berisiko
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
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

