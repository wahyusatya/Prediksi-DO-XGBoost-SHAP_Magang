import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { X, Loader2, AlertCircle, TrendingUp, TrendingDown, Minus, GraduationCap, MapPin, Calendar, BookOpen } from 'lucide-react';
import { getApiBaseUrl } from '@/utils/api';

interface ShapValue {
  feature: string;
  label: string;
  shap_value: number;
  raw_value: number;
  deskripsi: string;
  kontribusi: string;
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
  };
}

interface StudentDetailModalProps {
  nim: string;
  onClose: () => void;
}

/* ── Circular gauge SVG ──────────────────────────────────── */
function RiskGauge({ score, status }: { score: number; status: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(score, 100) / 100;
  const offset = circumference * (1 - progress);

  const color =
    status.toLowerCase() === 'tinggi'
      ? { stroke: '#ef4444', text: 'text-red-600', bg: 'bg-red-50', ring: 'ring-red-100' }
      : status.toLowerCase() === 'sedang'
        ? { stroke: '#f59e0b', text: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-100' }
        : { stroke: '#10b981', text: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100' };

  return (
    <div className={`relative inline-flex items-center justify-center rounded-full ${color.bg} ring-1 ${color.ring} p-2`}>
      <svg width="136" height="136" className="-rotate-90">
        {/* Background track */}
        <circle cx="68" cy="68" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        {/* Progress arc */}
        <circle
          cx="68" cy="68" r={radius} fill="none"
          stroke={color.stroke} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-black ${color.text}`}>{score}%</span>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Risiko</span>
      </div>
    </div>
  );
}

/* ── Small stat card ─────────────────────────────────────── */
function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 flex flex-col gap-1 min-w-0">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider truncate">{label}</p>
      <p className={`text-xl font-extrabold truncate ${accent || 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 truncate">{sub}</p>}
    </div>
  );
}

export default function StudentDetailModal({ nim, onClose }: StudentDetailModalProps) {
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const baseUrl = getApiBaseUrl();
        const response = await axios.get(`${baseUrl}/api/v1/mahasiswa/${nim}/detail`);
        // Backend API returns { mahasiswa, prediksi, shap_explanation }
        setDetail(response.data);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching detail:', err);
        setError(err.response?.data?.detail || err.message || 'Gagal memuat detail mahasiswa.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [nim]);

  const getRiskBadge = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-800 border-gray-200';
    const s = status.toLowerCase();
    if (s === 'tinggi') return 'bg-red-100 text-red-800 border-red-200';
    if (s === 'sedang') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (s === 'rendah') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const computeIpk = (m: StudentDetail['mahasiswa']) => {
    if (typeof m.ipk === 'number') return m.ipk.toFixed(2);
    if (m.ips_smt1 !== undefined && m.ips_smt2 !== undefined) return ((m.ips_smt1 + m.ips_smt2) / 2).toFixed(2);
    return '-';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Analisis Detail Risiko</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-500 font-medium">Menganalisis data SHAP...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="text-red-800 font-medium">Terjadi Kesalahan</h3>
                <p className="text-red-700 mt-1 text-sm">{error}</p>
              </div>
            </div>
          ) : detail ? (
            <div className="space-y-6">

              {/* ── Hero: Profil + Risk Gauge ───────────────── */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* Risk Gauge */}
                  <div className="flex-shrink-0">
                    <RiskGauge score={detail.prediksi.skor_prediksi_model} status={detail.prediksi.status_risiko} />
                  </div>

                  {/* Identity */}
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                      <h3 className="text-lg font-bold text-gray-900 truncate">{detail.mahasiswa.nama}</h3>
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${getRiskBadge(detail.prediksi.status_risiko)}`}>
                        Risiko {detail.prediksi.status_risiko}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5 mt-2 text-sm text-gray-500">
                      <p className="flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="truncate"><span className="font-semibold text-gray-700">{detail.mahasiswa.nim}</span></span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{detail.mahasiswa.fakultas_prodi || '-'}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span>Semester {detail.mahasiswa.semester}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{detail.mahasiswa.asal_daerah || '-'} ({detail.mahasiswa.wilayah || '-'})</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Stats Grid ──────────────────────────────── */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Data Akademik</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard
                    label="IPK"
                    value={computeIpk(detail.mahasiswa)}
                    sub="Kumulatif"
                    accent="text-blue-700"
                  />
                  <StatCard
                    label="IPS Smt 1"
                    value={detail.mahasiswa.ips_smt1?.toFixed(2) ?? '-'}
                  />
                  <StatCard
                    label="IPS Smt 2"
                    value={detail.mahasiswa.ips_smt2?.toFixed(2) ?? '-'}
                  />
                  <StatCard
                    label="Delta IPS"
                    value={detail.mahasiswa.delta_ips !== undefined ? (detail.mahasiswa.delta_ips >= 0 ? '+' : '') + detail.mahasiswa.delta_ips.toFixed(2) : '-'}
                    sub={detail.mahasiswa.delta_ips !== undefined ? (detail.mahasiswa.delta_ips >= 0 ? 'Naik' : 'Turun') : undefined}
                    accent={detail.mahasiswa.delta_ips !== undefined ? (detail.mahasiswa.delta_ips >= 0 ? 'text-emerald-600' : 'text-red-600') : undefined}
                  />
                  <StatCard
                    label="Kehadiran Smt 2"
                    value={detail.mahasiswa.persen_kehadiran_smt2 !== undefined ? `${detail.mahasiswa.persen_kehadiran_smt2}%` : '-'}
                    accent={detail.mahasiswa.persen_kehadiran_smt2 !== undefined && detail.mahasiswa.persen_kehadiran_smt2 < 75 ? 'text-red-600' : undefined}
                  />
                  <StatCard
                    label="MK Cekal UAS"
                    value={detail.mahasiswa.mk_cekal_uas_smt2 ?? '-'}
                    sub="Mata kuliah"
                    accent={detail.mahasiswa.mk_cekal_uas_smt2 !== undefined && detail.mahasiswa.mk_cekal_uas_smt2 > 0 ? 'text-red-600' : undefined}
                  />
                  <StatCard
                    label="Golongan UKT"
                    value={detail.mahasiswa.golongan_ukt ?? '-'}
                    sub={`dari 8 golongan`}
                  />
                  <StatCard
                    label="Status Cuti"
                    value={detail.mahasiswa.status_cuti === 1 ? 'Ya' : 'Tidak'}
                    accent={detail.mahasiswa.status_cuti === 1 ? 'text-amber-600' : 'text-emerald-600'}
                  />
                </div>
              </div>

              {/* ── SHAP Analysis ───────────────────────────── */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Top 3 Faktor Pemicu Risiko <span className="text-gray-300 font-normal normal-case tracking-normal">(SHAP Analysis)</span>
                </h4>
                
                <div className="space-y-3">
                  {(() => {
                    const topFactors = detail.shap_explanation?.top_3_faktor || [];
                    if (topFactors.length === 0) {
                      return <p className="text-sm text-gray-500 italic">Data penjelasan SHAP tidak tersedia.</p>;
                    }

                    const maxAbsValue = Math.max(...topFactors.map(f => Math.abs(f.shap_value)));

                    return topFactors.map((factor, idx) => {
                      const isIncreasing = factor.kontribusi?.toLowerCase().includes('meningkatkan') || factor.shap_value > 0;
                      const isDecreasing = factor.kontribusi?.toLowerCase().includes('menurunkan') || factor.shap_value < 0;
                      const percentage = maxAbsValue === 0 ? 0 : Math.max(5, (Math.abs(factor.shap_value) / maxAbsValue) * 100);

                      return (
                        <div key={idx} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-start gap-3">
                          {/* Rank number */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0 ${isIncreasing ? 'bg-red-100 text-red-600' : isDecreasing ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'}`}>
                            {idx + 1}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1.5">
                              <div className="flex items-center gap-1.5">
                                {isIncreasing ? (
                                  <TrendingUp className="w-3.5 h-3.5 text-red-500" />
                                ) : isDecreasing ? (
                                  <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Minus className="w-3.5 h-3.5 text-gray-400" />
                                )}
                                <span className="font-semibold text-gray-800 text-sm">{factor.label}</span>
                              </div>
                              <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                                {typeof factor.raw_value === 'number' ? (Number.isInteger(factor.raw_value) ? factor.raw_value : Number(factor.raw_value.toFixed(2))) : factor.raw_value}
                              </span>
                            </div>
                            
                            {/* Bar */}
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-1000 ${isIncreasing ? 'bg-red-500' : isDecreasing ? 'bg-emerald-500' : 'bg-gray-400'}`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className={`text-xs font-bold w-14 text-right tabular-nums ${isIncreasing ? 'text-red-600' : isDecreasing ? 'text-emerald-600' : 'text-gray-500'}`}>
                                {factor.shap_value > 0 ? '+' : ''}{factor.shap_value.toFixed(3)}
                              </span>
                            </div>

                            <p className="text-xs text-gray-400 mt-1.5">{factor.deskripsi}. <span className={`font-medium ${isIncreasing ? 'text-red-500' : isDecreasing ? 'text-emerald-500' : 'text-gray-500'}`}>{factor.kontribusi}.</span></p>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          ) : null}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors focus:ring-2 focus:ring-offset-1 focus:ring-gray-900"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
