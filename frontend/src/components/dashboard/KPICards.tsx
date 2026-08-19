import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, Users, Activity } from 'lucide-react';

export interface Student {
  nim: string;
  nama: string;
  fakultas_prodi?: string;
  smt: number;
  skor_prediksi?: number;
  status_risiko: string;
}

interface KPICardsProps {
  data: Student[];
}

export const RISK_COLORS = {
  rendah: '#10b981', // Emerald 500
  sedang: '#f59e0b', // Amber 500
  tinggi: '#ef4444', // Red 500
};

export function getRiskBadge(status?: string): string {
  const s = status?.toLowerCase();
  if (s === 'tinggi') return 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/80 ring-1 ring-rose-500/10 font-semibold';
  if (s === 'sedang') return 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80 ring-1 ring-amber-500/10 font-semibold';
  if (s === 'rendah') return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/80 ring-1 ring-emerald-500/10 font-semibold';
  return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 font-semibold';
}

export default function KPICards({ data }: KPICardsProps) {
  const totalStudents = data.length;
  const highRisk = data.filter((s) => s.status_risiko.toLowerCase() === 'tinggi').length;
  const mediumRisk = data.filter((s) => s.status_risiko.toLowerCase() === 'sedang').length;
  const lowRisk = data.filter((s) => s.status_risiko.toLowerCase() === 'rendah').length;

  const lowPct = totalStudents ? (lowRisk / totalStudents) * 100 : 0;
  const medPct = totalStudents ? (mediumRisk / totalStudents) * 100 : 0;
  const highPct = totalStudents ? (highRisk / totalStudents) * 100 : 0;

  const gradient = totalStudents === 0
    ? '#e2e8f0'
    : `conic-gradient(${RISK_COLORS.rendah} 0% ${lowPct}%, ${RISK_COLORS.sedang} ${lowPct}% ${lowPct + medPct}%, ${RISK_COLORS.tinggi} ${lowPct + medPct}% 100%)`;

  const cards = [
    {
      label: 'Risiko Rendah',
      desc: 'Jalur Normal / Aman',
      count: lowRisk,
      pct: lowPct.toFixed(1),
      color: RISK_COLORS.rendah,
      bg: 'bg-emerald-50/60 dark:bg-emerald-950/30',
      border: 'border-emerald-200/60 dark:border-emerald-800/50',
      text: 'text-emerald-800 dark:text-emerald-300',
      labelColor: 'text-emerald-900 dark:text-emerald-200',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      dotClass: 'bg-emerald-500',
      barBg: 'bg-emerald-500',
    },
    {
      label: 'Risiko Sedang',
      desc: 'Perlu Pengawasan',
      count: mediumRisk,
      pct: medPct.toFixed(1),
      color: RISK_COLORS.sedang,
      bg: 'bg-amber-50/60 dark:bg-amber-950/30',
      border: 'border-amber-200/60 dark:border-amber-800/50',
      text: 'text-amber-900 dark:text-amber-300',
      labelColor: 'text-amber-950 dark:text-amber-200',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      dotClass: 'bg-amber-500',
      barBg: 'bg-amber-500',
    },
    {
      label: 'Risiko Tinggi',
      desc: 'Intervensi Mendesak',
      count: highRisk,
      pct: highPct.toFixed(1),
      color: RISK_COLORS.tinggi,
      bg: 'bg-rose-50/60 dark:bg-rose-950/30',
      border: 'border-rose-200/60 dark:border-rose-800/50',
      text: 'text-rose-800 dark:text-rose-300',
      labelColor: 'text-rose-950 dark:text-rose-200',
      icon: <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
      dotClass: 'bg-rose-500',
      barBg: 'bg-rose-500',
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-6 mb-8 transition-colors duration-200">
      {/* Header bar of KPI matrix */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 mb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-800/60">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Distribusi Status Risiko Mahasiswa</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Agregasi probabilitas drop out berdasarkan pemodelan XGBoost & SHAP</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 self-start sm:self-auto">
          <Users className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>Total Sampel: <strong className="text-slate-900 dark:text-white">{totalStudents}</strong> Mahasiswa</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Donut Visualization with Center Counter */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-2">
          <div className="relative flex items-center justify-center">
            {/* Donut Ring with Conic Gradient */}
            <div
              className="w-48 h-48 rounded-full flex items-center justify-center transition-all duration-700 shadow-inner ring-4 ring-slate-50 dark:ring-slate-800"
              style={{ background: gradient }}
            >
              {/* Inner cutout */}
              <div className="w-34 h-34 bg-white dark:bg-slate-900 rounded-full flex flex-col items-center justify-center shadow-xs border border-slate-100/80 dark:border-slate-800">
                <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">{totalStudents}</span>
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">Mahasiswa</span>
                <span className="text-[10px] font-semibold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full mt-1 border border-blue-100 dark:border-blue-800/60">
                  Semester 2
                </span>
              </div>
            </div>
          </div>

          {/* Quick Proportion Bar Legend */}
          <div className="w-full max-w-xs mt-4 flex items-center gap-1 h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 p-0.5">
            <div style={{ width: `${lowPct}%` }} className="h-full bg-emerald-500 rounded-l-full transition-all duration-500" title={`Rendah: ${lowPct.toFixed(1)}%`} />
            <div style={{ width: `${medPct}%` }} className="h-full bg-amber-500 transition-all duration-500" title={`Sedang: ${medPct.toFixed(1)}%`} />
            <div style={{ width: `${highPct}%` }} className="h-full bg-rose-500 rounded-r-full transition-all duration-500" title={`Tinggi: ${highPct.toFixed(1)}%`} />
          </div>
        </div>

        {/* Right: 3 Refined KPI Stat Cards */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {cards.map((item) => (
            <div
              key={item.label}
              className={`rounded-xl border ${item.border} ${item.bg} p-4.5 flex flex-col justify-between transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.dotClass}`} />
                    <span className={`text-xs font-bold ${item.labelColor} tracking-tight`}>{item.label}</span>
                  </div>
                  {item.icon}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl sm:text-3xl font-black ${item.text} tabular-nums tracking-tight`}>
                    {item.count}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    ({item.pct}%)
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                  {item.desc}
                </p>
              </div>

              {/* Progress bar inside card */}
              <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/80">
                <div className="w-full h-1.5 bg-white/80 dark:bg-slate-800/80 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.barBg} rounded-full transition-all duration-1000`}
                    style={{ width: `${Math.max(2, parseFloat(item.pct))}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* High-risk executive summary callout if applicable */}
      {highRisk > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/50 rounded-xl px-4 py-3 text-rose-800 dark:text-rose-300">
          <div className="flex items-center gap-2 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span>
              <strong>Perhatian Eksekutif:</strong> Terdapat <strong>{highRisk} mahasiswa ({highPct.toFixed(1)}%)</strong> dengan skor risiko tinggi yang memerlukan intervensi prioritas.
            </span>
          </div>
          <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider bg-rose-100/80 dark:bg-rose-900/60 px-2.5 py-1 rounded-md">
            Butuh Intervensi DPA & WR
          </span>
        </div>
      )}
    </div>
  );
}


