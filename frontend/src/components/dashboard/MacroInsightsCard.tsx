import React, { useEffect, useState } from 'react';
import { getApiBaseUrl } from '@/utils/api';
import { Loader2, BarChart3, GraduationCap, Wallet, UserCheck, Sparkles, Building } from 'lucide-react';

interface PilarData {
  jumlah: number;
  persen: number;
}

interface GlobalFaktor {
  feature: string;
  label: string;
  pilar: string;
  jumlah_terdampak: number;
  persen: number;
}

interface MacroInsightsData {
  filter: { fakultas: string | null; semester: number | null };
  total_mahasiswa: number;
  total_berisiko: number;
  distribusi_pilar_pemicu: Record<string, PilarData>;
  top_3_faktor_global: GlobalFaktor[];
}

interface MacroInsightsCardProps {
  selectedFakultas?: string;
}

const PILAR_CONFIG: Record<string, { 
  icon: React.ReactNode; 
  iconBg: string; 
  bar: string; 
  badge: string; 
  text: string;
  bgLight: string;
  borderLight: string;
  authority: string;
}> = {
  'Akademik': {
    icon: <GraduationCap className="w-5 h-5 text-white" />,
    iconBg: 'bg-blue-700 dark:bg-blue-600',
    bar: 'bg-blue-600 dark:bg-blue-500',
    badge: 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
    text: 'text-blue-800 dark:text-blue-300',
    bgLight: 'bg-blue-50/40 dark:bg-blue-950/20',
    borderLight: 'border-blue-200/60 dark:border-blue-800/50',
    authority: 'WR I (Bidang Akademik) & Dekanat',
  },
  'Finansial & Wilayah': {
    icon: <Wallet className="w-5 h-5 text-white" />,
    iconBg: 'bg-amber-600 dark:bg-amber-500',
    bar: 'bg-amber-500 dark:bg-amber-400',
    badge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
    text: 'text-amber-900 dark:text-amber-300',
    bgLight: 'bg-amber-50/40 dark:bg-amber-950/20',
    borderLight: 'border-amber-200/60 dark:border-amber-800/50',
    authority: 'WR II (Keuangan) & BAAK',
  },
  'Kedisiplinan & Keaktifan': {
    icon: <UserCheck className="w-5 h-5 text-white" />,
    iconBg: 'bg-teal-700 dark:bg-teal-600',
    bar: 'bg-teal-600 dark:bg-teal-500',
    badge: 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800/60',
    text: 'text-teal-800 dark:text-teal-300',
    bgLight: 'bg-teal-50/40 dark:bg-teal-950/20',
    borderLight: 'border-teal-200/60 dark:border-teal-800/50',
    authority: 'WR III (Kemahasiswaan) & DPA',
  },
};

export default function MacroInsightsCard({ selectedFakultas = '' }: MacroInsightsCardProps) {
  const [data, setData] = useState<MacroInsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (selectedFakultas) params.set('fakultas', selectedFakultas);
        const url = `${getApiBaseUrl()}/api/v1/analytics/macro-insights${params.toString() ? '?' + params.toString() : ''}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch macro insights');
        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error('Error fetching macro insights:', err);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [selectedFakultas]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-8 mb-8">
        <div className="flex flex-col items-center justify-center py-6 space-y-3">
          <Loader2 className="w-7 h-7 text-blue-600 dark:text-blue-400 animate-spin" />
          <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Mengkalkulasi agregat pemicu risiko makro...</span>
        </div>
      </div>
    );
  }

  if (!data || data.total_mahasiswa === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-6 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-800/60">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Analisis Pemicu Risiko Makro</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Tidak ada data mahasiswa berisiko ditemukan untuk filter saat ini.</p>
      </div>
    );
  }

  const pilarEntries = Object.entries(data.distribusi_pilar_pemicu)
    .sort(([, a], [, b]) => b.persen - a.persen);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-6 mb-8 transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-800 dark:bg-blue-600 text-white shadow-xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Analisis Strategis Pemicu Risiko Makro</h3>
              <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 px-2 py-0.5 rounded-full uppercase tracking-wider">
                XAI Aggregation
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Rata-rata kontribusi pemicu risiko dari <strong className="text-slate-800 dark:text-slate-200">{data.total_mahasiswa}</strong> mahasiswa
              {selectedFakultas ? (
                <span className="font-semibold text-blue-700 dark:text-blue-400"> di {selectedFakultas}</span>
              ) : (
                <span> se-universitas</span>
              )}
              {data.total_berisiko > 0 && (
                <> · <span className="font-bold text-rose-600 dark:text-rose-400">{data.total_berisiko} mahasiswa dalam kategori berisiko</span></>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Pemetaan Wewenang Rektorat
          </span>
        </div>
      </div>

      {/* 3 Pillar Strategic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {pilarEntries.map(([pilar, pilarData]) => {
          const config = PILAR_CONFIG[pilar] || PILAR_CONFIG['Akademik'];
          return (
            <div 
              key={pilar} 
              className={`relative overflow-hidden rounded-xl border ${config.borderLight} ${config.bgLight} p-4.5 flex flex-col justify-between transition-all duration-200 hover:shadow-xs`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${config.iconBg} text-white shadow-xs`}>
                      {config.icon}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight block">{pilar}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{config.authority}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-baseline justify-between mt-2 mb-1">
                  <span className={`text-2xl sm:text-3xl font-black ${config.text} tabular-nums tracking-tight`}>
                    {pilarData.persen}%
                  </span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {pilarData.jumlah} mahasiswa
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="h-2 bg-slate-200/60 dark:bg-slate-800/80 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${config.bar} rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: `${Math.max(3, pilarData.persen)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Top 3 Global University / Faculty Factors */}
      {data.top_3_faktor_global.length > 0 && (
        <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              Top 3 Faktor Pemicu Risiko Terbesar ({selectedFakultas ? selectedFakultas : 'Tingkat Universitas'})
            </h4>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Beban Bobot Relatif</span>
          </div>

          <div className="space-y-2.5">
            {data.top_3_faktor_global.map((faktor, idx) => {
              const config = PILAR_CONFIG[faktor.pilar] || PILAR_CONFIG['Akademik'];
              return (
                <div 
                  key={idx} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${config.iconBg} text-white shrink-0`}>
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{faktor.label}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${config.badge}`}>
                          {faktor.pilar}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                        Sasaran: {config.authority}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:w-48 shrink-0">
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${config.bar} rounded-full transition-all duration-1000`}
                        style={{ width: `${Math.max(3, faktor.persen)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-16 text-right tabular-nums">
                      {faktor.persen}% <span className="text-slate-400 dark:text-slate-500 font-normal text-[10px]">({faktor.jumlah_terdampak})</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


