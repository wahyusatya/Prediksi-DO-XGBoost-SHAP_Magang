import React, { useEffect, useState, useCallback } from 'react';
import { 
  X, 
  Loader2, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  GraduationCap, 
  MapPin, 
  Calendar, 
  BookOpen, 
  ClipboardCopy, 
  Check, 
  Wallet, 
  UserCheck, 
  ShieldAlert, 
  Award,
  AlertTriangle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { getApiBaseUrl } from '@/utils/api';
import { getRiskBadge } from './KPICards';

interface Rekomendasi {
  pilar: string;
  otoritas: string;
  tindakan: string;
  prioritas: string;
}

interface ShapValue {
  feature: string;
  label: string;
  shap_value: number;
  raw_value: number;
  deskripsi: string;
  kontribusi: string;
  bobot_persen?: number;
  level_dampak?: string;
  pilar?: string;
  otoritas_pilar?: string;
}

interface StudentDetail {
  mahasiswa: {
    nim: string;
    nama: string;
    fakultas_prodi: string;
    semester: number;
    ips_smt1?: number;
    ips_smt2?: number;
    ipk?: number;
    delta_ips?: number;
    golongan_ukt?: number;
    status_cuti?: number;
    kode_wilayah?: number;
    asal_daerah?: string;
    wilayah?: string;
    persen_kehadiran_smt2?: number;
    mk_cekal_uas_smt2?: number;
  };
  prediksi: {
    skor_prediksi_model: number;
    status_risiko: string;
  };
  shap_explanation: {
    base_value?: number;
    top_3_faktor: ShapValue[];
    semua_faktor?: ShapValue[];
    rekomendasi_intervensi?: Rekomendasi[];
  };
}

interface StudentDetailModalProps {
  nim: string;
  onClose: () => void;
}

/* ── Badge styling per pilar ──────────────────────────── */
function getPilarBadge(pilar?: string): { bg: string; text: string; border: string; icon: React.ReactNode } {
  if (pilar === 'Akademik') return { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200/80', icon: <GraduationCap className="w-3 h-3 text-blue-800" /> };
  if (pilar === 'Finansial & Wilayah') return { bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200/80', icon: <Wallet className="w-3 h-3 text-amber-900" /> };
  if (pilar === 'Kedisiplinan & Keaktifan') return { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200/80', icon: <UserCheck className="w-3 h-3 text-teal-800" /> };
  return { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200', icon: null };
}

function getPrioritasBadge(prioritas: string): string {
  if (prioritas === 'Kritis') return 'bg-rose-50 text-rose-800 border-rose-200 ring-1 ring-rose-500/10 font-bold';
  if (prioritas === 'Penting') return 'bg-amber-50 text-amber-900 border-amber-200 ring-1 ring-amber-500/10 font-bold';
  return 'bg-blue-50 text-blue-800 border-blue-200 ring-1 ring-blue-500/10 font-bold';
}

function getRankBadgeClass(isIncreasing: boolean, isDecreasing: boolean): string {
  if (isIncreasing) return 'bg-rose-100 text-rose-800';
  if (isDecreasing) return 'bg-emerald-100 text-emerald-800';
  return 'bg-slate-100 text-slate-800';
}

function getPriorityNumClass(prioritas: string): string {
  if (prioritas === 'Kritis') return 'bg-rose-100 text-rose-800';
  if (prioritas === 'Penting') return 'bg-amber-100 text-amber-900';
  return 'bg-blue-100 text-blue-900';
}

function getLevelDampakBadge(level?: string): string {
  if (level === 'Sangat Dominan') return 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
  if (level === 'Signifikan') return 'bg-amber-50 text-amber-800 border-amber-200 font-semibold';
  return 'bg-slate-100 text-slate-700 border-slate-200 font-semibold';
}

/* ── Circular SVG Risk Gauge ─────────────────────────────── */
function RiskGauge({ score, status }: { score: number; status: string }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(score, 100) / 100;
  const offset = circumference * (1 - progress);

  const isHigh = status.toLowerCase() === 'tinggi';
  const isMed = status.toLowerCase() === 'sedang';

  const color = isHigh
    ? { stroke: '#ef4444', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50/70 dark:bg-rose-950/40', ring: 'ring-rose-200/80 dark:ring-rose-800/60' }
    : isMed
      ? { stroke: '#f59e0b', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50/70 dark:bg-amber-950/40', ring: 'ring-amber-200/80 dark:ring-amber-800/60' }
      : { stroke: '#10b981', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50/70 dark:bg-emerald-950/40', ring: 'ring-emerald-200/80 dark:ring-emerald-800/60' };

  return (
    <div className={`relative inline-flex items-center justify-center rounded-2xl ${color.bg} ring-1 ${color.ring} p-3.5 shadow-inner`}>
      <svg width="128" height="128" className="-rotate-90">
        {/* Background track */}
        <circle cx="64" cy="64" r={radius} fill="none" stroke="currentColor" strokeWidth="9" className="text-slate-200 dark:text-slate-700/80" />
        {/* Progress arc */}
        <circle
          cx="64" cy="64" r={radius} fill="none"
          stroke={color.stroke} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-black ${color.text} tabular-nums tracking-tight`}>{score}%</span>
        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">Risiko DO</span>
      </div>
    </div>
  );
}

/* ── Small stat card ─────────────────────────────────────── */
function StatCard({ 
  label, 
  value, 
  sub, 
  accent,
  isAlert = false,
}: { 
  label: string; 
  value: string | number; 
  sub?: string; 
  accent?: string;
  isAlert?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-3 flex flex-col justify-between min-w-0 transition-all ${
      isAlert 
        ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-800/60 text-rose-900 dark:text-rose-200 shadow-2xs' 
        : 'bg-white dark:bg-slate-800/80 border-slate-200/70 dark:border-slate-700/70 shadow-2xs'
    }`}>
      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">{label}</p>
      <p className={`text-lg font-black truncate tabular-nums my-0.5 ${accent || (isAlert ? 'text-rose-700 dark:text-rose-300' : 'text-slate-900 dark:text-white')}`}>
        {value}
      </p>
      {sub ? (
        <p className={`text-[10px] font-medium truncate ${isAlert ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}`}>{sub}</p>
      ) : (
        <div className="h-3" />
      )}
    </div>
  );
}

export default function StudentDetailModal({ nim, onClose }: StudentDetailModalProps) {
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Close on ESC key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${getApiBaseUrl()}/api/v1/mahasiswa/${nim}/detail`);
        if (!res.ok) throw new Error('Gagal memuat detail mahasiswa.');
        const data = await res.json();
        setDetail(data);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching detail:', err);
        setError(err.message || 'Gagal memuat detail mahasiswa.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [nim]);

  const handleCopyRecommendations = () => {
    if (!detail?.shap_explanation?.rekomendasi_intervensi?.length) return;

    const mhs = detail.mahasiswa;
    const lines = [
      `=== DETAIL INTERVENSI KEBIJAKAN DPA / WAKIL REKTOR ===`,
      `Mahasiswa     : ${mhs.nama} (${mhs.nim})`,
      `Program Studi : ${mhs.fakultas_prodi}`,
      `Semester      : ${mhs.semester}`,
      `Skor Prediksi : ${detail.prediksi.skor_prediksi_model}% [Kategori: ${detail.prediksi.status_risiko}]`,
      `IPK / IPS S2  : ${mhs.ipk ?? '-'} / ${mhs.ips_smt2 ?? '-'}`,
      `Kehadiran     : ${mhs.persen_kehadiran_smt2 ?? '-'}% | MK Cekal UAS: ${mhs.mk_cekal_uas_smt2 ?? 0}`,
      ``,
      `--- RENCANA AKSI & REKOMENDASI INTERVENSI ---`,
    ];

    detail.shap_explanation.rekomendasi_intervensi.forEach((r, i) => {
      lines.push(`${i + 1}. [PRIORITAS: ${r.prioritas.toUpperCase()}] ${r.tindakan}`);
      lines.push(`   → Pilar: ${r.pilar} | Wewenang: ${r.otoritas}`);
      lines.push('');
    });

    lines.push(`--- FAKTOR PEMICU UTAMA (XAI SHAP) ---`);
    detail.shap_explanation.top_3_faktor.forEach((f, i) => {
      lines.push(`${i + 1}. ${f.label}: ${f.deskripsi} (Bobot Kontribusi: ${f.bobot_persen ?? '-'}%)`);
    });

    lines.push('', `Digenerate secara otomatis oleh Siprido EIS pada ${new Date().toLocaleString('id-ID')}`);

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 dark:bg-black/70 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150 my-auto transition-colors duration-200">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/80 dark:to-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 dark:bg-blue-500 text-white shadow-xs">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Detail Analisis Risiko & Rekomendasi Intervensi</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Analisis kontribusi faktor risiko & rencana intervensi</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            aria-label="Tutup"
            className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Mengkalkulasi nilai atribusi SHAP dan rekomendasi kebijakan...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 p-4 rounded-xl flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-rose-800 dark:text-rose-300 font-bold text-sm">Gagal Mengambil Data Detail</h3>
                <p className="text-rose-700 dark:text-rose-400 mt-0.5 text-xs">{error}</p>
              </div>
            </div>
          ) : detail ? (
            <div className="space-y-6">

              {/* ── Hero: Profil Mahasiswa + Circular Risk Gauge ── */}
              <div className="bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/60">
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* Circular Risk Gauge */}
                  <div className="shrink-0">
                    <RiskGauge 
                      score={detail.prediksi.skor_prediksi_model} 
                      status={detail.prediksi.status_risiko} 
                    />
                  </div>

                  {/* Student Identity */}
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 flex items-center justify-center font-bold text-xs shrink-0">
                        {getInitials(detail.mahasiswa.nama)}
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                        {detail.mahasiswa.nama}
                      </h3>
                      <span className={`px-2.5 py-0.5 text-[11px] rounded-full border ${getRiskBadge(detail.prediksi.status_risiko)}`}>
                        Status: {detail.prediksi.status_risiko}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs text-slate-600 dark:text-slate-300">
                      <p className="flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>NIM: <strong className="font-mono text-slate-800 dark:text-slate-200">{detail.mahasiswa.nim}</strong></span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="truncate">{detail.mahasiswa.fakultas_prodi || '-'}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>Semester: <strong>{detail.mahasiswa.semester}</strong> (Semester 2)</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="truncate">{detail.mahasiswa.asal_daerah || '-'} ({detail.mahasiswa.wilayah || '-'})</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 8 Academic & Behavioral Metrics Grid ────────── */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    Profil Akademik & Riwayat Perkuliahan
                  </h4>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">8 Parameter Input Model</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <StatCard
                    label="IPK Kumulatif"
                    value={detail.mahasiswa.ipk?.toFixed(2) ?? '-'}
                    sub="Skala 4.00"
                    accent="text-blue-700 dark:text-blue-400"
                  />
                  <StatCard
                    label="IPS Semester 1"
                    value={detail.mahasiswa.ips_smt1?.toFixed(2) ?? '-'}
                  />
                  <StatCard
                    label="IPS Semester 2"
                    value={detail.mahasiswa.ips_smt2?.toFixed(2) ?? '-'}
                  />
                  <StatCard
                    label="Delta IPS (S1→S2)"
                    value={detail.mahasiswa.delta_ips !== undefined ? (detail.mahasiswa.delta_ips >= 0 ? '+' : '') + detail.mahasiswa.delta_ips.toFixed(2) : '-'}
                    sub={detail.mahasiswa.delta_ips !== undefined ? (detail.mahasiswa.delta_ips >= 0 ? 'Tren Positif' : 'Tren Menurun') : undefined}
                    accent={detail.mahasiswa.delta_ips !== undefined ? (detail.mahasiswa.delta_ips >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400') : undefined}
                  />
                  <StatCard
                    label="Kehadiran Smt 2"
                    value={detail.mahasiswa.persen_kehadiran_smt2 !== undefined ? `${detail.mahasiswa.persen_kehadiran_smt2}%` : '-'}
                    sub={detail.mahasiswa.persen_kehadiran_smt2 !== undefined && detail.mahasiswa.persen_kehadiran_smt2 < 75 ? 'Di bawah batas 75%' : 'Memenuhi syarat'}
                    isAlert={detail.mahasiswa.persen_kehadiran_smt2 !== undefined && detail.mahasiswa.persen_kehadiran_smt2 < 75}
                  />
                  <StatCard
                    label="MK Cekal UAS"
                    value={detail.mahasiswa.mk_cekal_uas_smt2 ?? 0}
                    sub={detail.mahasiswa.mk_cekal_uas_smt2 && detail.mahasiswa.mk_cekal_uas_smt2 > 0 ? 'Otomatis Nilai E' : 'Bebas Cekal'}
                    isAlert={Boolean(detail.mahasiswa.mk_cekal_uas_smt2 && detail.mahasiswa.mk_cekal_uas_smt2 > 0)}
                  />
                  <StatCard
                    label="Golongan UKT"
                    value={`UKT ${detail.mahasiswa.golongan_ukt ?? '-'}`}
                    sub="Kategori Finansial"
                  />
                  <StatCard
                    label="Status Cuti"
                    value={detail.mahasiswa.status_cuti === 1 ? 'Ada Riwayat' : 'Aktif Penuh'}
                    sub={detail.mahasiswa.status_cuti === 1 ? 'Cuti Akademik' : 'Tanpa Cuti'}
                    accent={detail.mahasiswa.status_cuti === 1 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}
                  />
                </div>
              </div>

              {/* ── SHAP Feature Contribution (Top 3 Kausalitas) ── */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Top 3 Faktor Pemicu Risiko
                  </h4>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">Kontribusi Relatif</span>
                </div>
                
                <div className="space-y-2.5">
                  {!detail.shap_explanation?.top_3_faktor?.length ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">Data penjelasan SHAP tidak tersedia.</p>
                  ) : (
                    detail.shap_explanation.top_3_faktor.map((factor, idx) => {
                      const isIncreasing = factor.kontribusi?.toLowerCase().includes('meningkatkan') || factor.shap_value > 0;
                      const isDecreasing = factor.kontribusi?.toLowerCase().includes('menurunkan') || factor.shap_value < 0;
                      const bobotPersen = factor.bobot_persen ?? 0;
                      const pilarBadge = getPilarBadge(factor.pilar);
                      const levelBadge = getLevelDampakBadge(factor.level_dampak);

                      return (
                        <div 
                          key={idx} 
                          className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3.5 shadow-2xs flex items-start gap-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                        >
                          {/* Rank indicator */}
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${getRankBadgeClass(isIncreasing, isDecreasing)}`}>
                            #{idx + 1}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                              {isIncreasing ? (
                                <TrendingUp className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              ) : isDecreasing ? (
                                <TrendingDown className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              ) : (
                                <Minus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              )}
                              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{factor.label}</span>
                              
                              {/* Pilar Badge */}
                              {factor.pilar && (
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded border ${pilarBadge.bg} ${pilarBadge.text} ${pilarBadge.border}`}>
                                  {pilarBadge.icon}
                                  {factor.pilar}
                                </span>
                              )}

                              {/* Level Dampak Badge */}
                              {factor.level_dampak && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${levelBadge}`}>
                                  {factor.level_dampak}
                                </span>
                              )}
                            </div>
                            
                            {/* Visual Percentage Bar */}
                            <div className="flex items-center gap-2 mb-1">
                              <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-1000 ${
                                    isIncreasing ? 'bg-rose-500' : isDecreasing ? 'bg-emerald-500' : 'bg-slate-400'
                                  }`}
                                  style={{ width: `${Math.max(3, bobotPersen)}%` }}
                                />
                              </div>
                              <span className={`text-xs font-bold w-14 text-right tabular-nums ${
                                isIncreasing ? 'text-rose-600 dark:text-rose-400' : isDecreasing ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                              }`}>
                                {bobotPersen.toFixed(1)}%
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {factor.deskripsi}. <strong className={isIncreasing ? 'text-rose-600 dark:text-rose-400' : isDecreasing ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}>{factor.kontribusi}.</strong>
                              {factor.otoritas_pilar && (
                                <span className="text-slate-400 dark:text-slate-500 ml-1.5">→ Wewenang: {factor.otoritas_pilar}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ── Prescriptive Policy Interventions (Rekomendasi) ── */}
              {detail.shap_explanation?.rekomendasi_intervensi && detail.shap_explanation.rekomendasi_intervensi.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      Rencana Aksi & Rekomendasi Kebijakan
                    </h4>
                    <button
                      onClick={handleCopyRecommendations}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-xl border transition-all duration-200 shadow-2xs ${
                        copied
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Tersalin ke Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <ClipboardCopy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                          <span>Salin Catatan DPA</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="bg-gradient-to-br from-slate-50/80 to-white dark:from-slate-800/40 dark:to-slate-900 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4 space-y-3">
                    {detail.shap_explanation.rekomendasi_intervensi.map((rec, idx) => {
                      const pilarBadge = getPilarBadge(rec.pilar);
                      const prioritasClass = getPrioritasBadge(rec.prioritas);
                      return (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-700/70 shadow-2xs">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 ${getPriorityNumClass(rec.prioritas)}`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              <span className={`text-[10px] px-1.5 py-0.2 rounded border ${prioritasClass}`}>
                                Prioritas: {rec.prioritas}
                              </span>
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded border ${pilarBadge.bg} ${pilarBadge.text} ${pilarBadge.border}`}>
                                {pilarBadge.icon}
                                {rec.pilar}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 ml-auto">
                                Penanggung Jawab: <strong className="text-slate-700 dark:text-slate-200">{rec.otoritas}</strong>
                              </span>
                            </div>
                            <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium mt-1">
                              {rec.tindakan}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 flex items-center justify-between transition-colors duration-200">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium hidden sm:block">
            Tekan <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono text-slate-700 dark:text-slate-300">ESC</kbd> untuk menutup
          </p>
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-700 focus:ring-offset-1 w-full sm:w-auto border dark:border-slate-700"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}


