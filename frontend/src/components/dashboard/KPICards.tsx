import React from 'react';

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
  rendah: '#22c55e',
  sedang: '#eab308',
  tinggi: '#ef4444',
};

export function getRiskBadge(status?: string): string {
  const s = status?.toLowerCase();
  if (s === 'tinggi') return 'bg-red-100 text-red-800 border-red-200';
  if (s === 'sedang') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (s === 'rendah') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  return 'bg-gray-100 text-gray-800 border-gray-200';
}

export default function KPICards({ data }: KPICardsProps) {
  const totalStudents = data.length;
  const highRisk = data.filter((s) => s.status_risiko.toLowerCase() === 'tinggi').length;
  const mediumRisk = data.filter((s) => s.status_risiko.toLowerCase() === 'sedang').length;
  const lowRisk = data.filter((s) => s.status_risiko.toLowerCase() === 'rendah').length;

  const lowPct = totalStudents ? (lowRisk / totalStudents) * 100 : 0;
  const medPct = totalStudents ? (mediumRisk / totalStudents) * 100 : 0;

  const gradient = totalStudents === 0
    ? '#f3f4f6'
    : `conic-gradient(${RISK_COLORS.rendah} 0% ${lowPct}%, ${RISK_COLORS.sedang} ${lowPct}% ${lowPct + medPct}%, ${RISK_COLORS.tinggi} ${lowPct + medPct}% 100%)`;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
      <div className="flex flex-col md:flex-row items-center gap-8">
        <div className="relative flex-shrink-0">
          <div
            className="w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500"
            style={{ background: gradient }}
          >
            <div className="w-32 h-32 bg-white rounded-full flex flex-col items-center justify-center shadow-xs">
              <span className="text-3xl font-bold text-gray-900">{totalStudents}</span>
              <span className="text-[11px] font-medium text-gray-500">Total Mahasiswa</span>
            </div>
          </div>
        </div>

        <div className="flex-1 w-full">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribusi Risiko Drop Out</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Risiko Rendah', count: lowRisk, color: RISK_COLORS.rendah, pct: totalStudents > 0 ? ((lowRisk / totalStudents) * 100).toFixed(0) : '0' },
              { label: 'Risiko Sedang', count: mediumRisk, color: RISK_COLORS.sedang, pct: totalStudents > 0 ? ((mediumRisk / totalStudents) * 100).toFixed(0) : '0' },
              { label: 'Risiko Tinggi', count: highRisk, color: RISK_COLORS.tinggi, pct: totalStudents > 0 ? ((highRisk / totalStudents) * 100).toFixed(0) : '0' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div>
                  <p className="text-sm font-medium text-gray-600">{item.label}</p>
                  <p className="text-xl font-bold text-gray-900">
                    {item.count}
                    <span className="text-sm font-normal text-gray-400 ml-1">({item.pct}%)</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
