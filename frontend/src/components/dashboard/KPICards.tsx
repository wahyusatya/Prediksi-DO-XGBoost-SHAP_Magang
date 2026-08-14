import React from 'react';

export interface Student {
  nim: string;
  nama: string;
  fakultas_prodi?: string;
  prodi?: string;
  smt: number;
  probabilitas_do?: number;
  skor_prediksi?: number;
  status_risiko: string;
}

interface KPICardsProps {
  data: Student[];
}

const RISK_COLORS = {
  rendah: '#22c55e',
  sedang: '#eab308',
  tinggi: '#ef4444',
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

export default function KPICards({ data }: KPICardsProps) {
  const totalStudents = data.length;
  const highRisk = data.filter((s) => s.status_risiko.toLowerCase() === 'tinggi').length;
  const mediumRisk = data.filter((s) => s.status_risiko.toLowerCase() === 'sedang').length;
  const lowRisk = data.filter((s) => s.status_risiko.toLowerCase() === 'rendah').length;

  const segments = [
    { label: 'Risiko Rendah', count: lowRisk, color: RISK_COLORS.rendah },
    { label: 'Risiko Sedang', count: mediumRisk, color: RISK_COLORS.sedang },
    { label: 'Risiko Tinggi', count: highRisk, color: RISK_COLORS.tinggi },
  ].filter((s) => s.count > 0);

  const cx = 100;
  const cy = 100;
  const outerR = 90;
  const innerR = 58;

  let currentAngle = 0;
  const arcs = segments.map((seg) => {
    const angle = totalStudents > 0 ? (seg.count / totalStudents) * 360 : 0;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    if (angle === 0) return null;

    const outerStart = polarToCartesian(cx, cy, outerR, endAngle);
    const outerEnd = polarToCartesian(cx, cy, outerR, startAngle);
    const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
    const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);
    const largeArc = angle > 180 ? 1 : 0;

    const path =
      angle >= 359.99
        ? [
            `M ${cx} ${cy - outerR}`,
            `A ${outerR} ${outerR} 0 1 1 ${cx - 0.01} ${cy - outerR}`,
            `L ${cx - 0.01} ${cy - innerR}`,
            `A ${innerR} ${innerR} 0 1 0 ${cx} ${cy - innerR}`,
            'Z',
          ].join(' ')
        : [
            `M ${outerStart.x} ${outerStart.y}`,
            `A ${outerR} ${outerR} 0 ${largeArc} 0 ${outerEnd.x} ${outerEnd.y}`,
            `L ${innerStart.x} ${innerStart.y}`,
            `A ${innerR} ${innerR} 0 ${largeArc} 1 ${innerEnd.x} ${innerEnd.y}`,
            'Z',
          ].join(' ');

    return { ...seg, path };
  }).filter(Boolean);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
      <div className="flex flex-col md:flex-row items-center gap-8">
        <div className="relative flex-shrink-0">
          <svg viewBox="0 0 200 200" className="w-52 h-52">
            {totalStudents === 0 ? (
              <circle cx={cx} cy={cy} r={outerR} fill="#f3f4f6" />
            ) : (
              arcs.map((arc, i) => (
                <path key={i} d={arc!.path} fill={arc!.color} stroke="white" strokeWidth="2" />
              ))
            )}
            <circle cx={cx} cy={cy} r={innerR - 2} fill="white" />
            <text
              x={cx}
              y={cy - 6}
              textAnchor="middle"
              className="fill-gray-900"
              style={{ fontSize: '28px', fontWeight: 700 }}
            >
              {totalStudents}
            </text>
            <text
              x={cx}
              y={cy + 16}
              textAnchor="middle"
              className="fill-gray-500"
              style={{ fontSize: '11px', fontWeight: 500 }}
            >
              Total Mahasiswa
            </text>
          </svg>
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
