'use client';

import React from 'react';
import { ShieldCheck, Building2, Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export default function Header() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-50 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-17 items-center">
          {/* Brand & System Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-800 dark:bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-900/20 ring-1 ring-white/20 shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  SIPRIDO <span className="text-blue-700 dark:text-blue-400">EIS</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                Prediksi & Intervensi Drop Out Mahasiswa
              </p>
            </div>
          </div>

          {/* Right Meta & Profile */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* System Status Pill */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">Model ML</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="text-slate-500 dark:text-slate-400">Aktif</span>
            </div>

            {/* Dark Mode Quick Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition-all flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              title={`Mode saat ini: ${resolvedTheme === 'dark' ? 'Gelap' : 'Terang'}. Klik untuk beralih mode.`}
              aria-label="Toggle Dark Mode"
            >
              {resolvedTheme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-90 duration-200" />
                  <span className="text-xs font-semibold hidden md:inline">Terang</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-slate-600 animate-in spin-in-90 duration-200" />
                  <span className="text-xs font-semibold hidden md:inline">Gelap</span>
                </>
              )}
            </button>

            {/* Executive User Badge */}
            <div className="flex items-center gap-2.5 pl-2 sm:pl-3 sm:border-l sm:border-slate-200 dark:sm:border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-slate-800 dark:bg-slate-700 flex items-center justify-center text-white font-bold text-xs shadow-xs ring-2 ring-slate-100 dark:ring-slate-800">
                <ShieldCheck className="w-4.5 h-4.5 text-blue-400" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">Pimpinan Universitas</p>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Rektorat & Dekanat</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

