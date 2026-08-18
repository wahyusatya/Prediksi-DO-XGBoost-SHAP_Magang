import React, { useEffect, useState } from 'react';
import { getApiBaseUrl } from '@/utils/api';
import { Loader2, BarChart3, GraduationCap, Wallet, UserCheck, TrendingUp } from 'lucide-react';

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

const PILAR_CONFIG: Record<string, { icon: React.ReactNode; gradient: string; bar: string; badge: string; text: string }> = {
  'Akademik': {
    icon: <GraduationCap className="w-5 h-5" />,
    gradient: 'from-blue-500 to-blue-600',
    bar: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    text: 'text-blue-700',
  },
  'Finansial & Wilayah': {
    icon: <Wallet className="w-5 h-5" />,
    gradient: 'from-amber-500 to-amber-600',
    bar: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    text: 'text-amber-700',
  },
  'Kedisiplinan & Keaktifan': {
    icon: <UserCheck className="w-5 h-5" />,
    gradient: 'from-purple-500 to-purple-600',
    bar: 'bg-purple-500',
    badge: 'bg-purple-100 text-purple-700 border-purple-200',
    text: 'text-purple-700',
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin mr-3" />
          <span className="text-sm text-gray-500 font-medium">Menganalisis pola risiko makro...</span>
        </div>
      </div>
    );
  }

  if (!data || data.total_mahasiswa === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Analisis Pemicu Risiko Makro</h3>
        </div>
        <p className="text-sm text-gray-500 mt-2">Tidak ada mahasiswa berisiko ditemukan untuk filter saat ini.</p>
      </div>
    );
  }

  const pilarEntries = Object.entries(data.distribusi_pilar_pemicu)
    .sort(([, a], [, b]) => b.persen - a.persen);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Analisis Pemicu Risiko Makro</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Rata-rata kontribusi faktor risiko dari <span className="font-bold text-gray-700">{data.total_mahasiswa}</span> mahasiswa
              {selectedFakultas ? ` di ${selectedFakultas}` : ' se-universitas'}
              {data.total_berisiko > 0 && <> · <span className="font-bold text-red-600">{data.total_berisiko}</span> berisiko</>}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full">
          <TrendingUp className="w-3.5 h-3.5" />
          Executive Insight
        </span>
      </div>

      {/* Pilar Distribution Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {pilarEntries.map(([pilar, pilarData]) => {
          const config = PILAR_CONFIG[pilar] || PILAR_CONFIG['Akademik'];
          return (
            <div key={pilar} className="relative overflow-hidden rounded-xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className={`p-1.5 rounded-lg bg-gradient-to-br ${config.gradient} text-white`}>
                  {config.icon}
                </div>
                <span className="text-sm font-semibold text-gray-800">{pilar}</span>
              </div>
              <div className="flex items-end justify-between mb-2">
                <div>
                  <span className={`text-3xl font-black ${config.text}`}>{pilarData.persen}%</span>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">{pilarData.jumlah} mahasiswa terdampak</p>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${config.bar} rounded-full transition-all duration-1000 ease-out`}
                  style={{ width: `${Math.max(3, pilarData.persen)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Top 3 Global Factors */}
      {data.top_3_faktor_global.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Top 3 Faktor Pemicu Risiko {selectedFakultas ? selectedFakultas : 'Se-Universitas'}
          </h4>
          <div className="space-y-2">
            {data.top_3_faktor_global.map((faktor, idx) => {
              const config = PILAR_CONFIG[faktor.pilar] || PILAR_CONFIG['Akademik'];
              return (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black bg-gradient-to-br ${config.gradient} text-white`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-800 truncate">{faktor.label}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${config.badge}`}>{faktor.pilar}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${config.bar} rounded-full transition-all duration-1000`}
                          style={{ width: `${Math.max(3, faktor.persen)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-600 w-16 text-right">{faktor.persen}% <span className="text-gray-400 font-normal">({faktor.jumlah_terdampak})</span></span>
                    </div>
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
