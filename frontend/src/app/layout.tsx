import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Siprido EIS — Executive Information System Prediksi DO Mahasiswa",
  description: "Platform Intelijen Analitik Prediktif & Preskriptif XGBoost-SHAP untuk Pimpinan Universitas",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const saved = localStorage.getItem('siprido_theme_preference');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (saved === 'dark' || (!saved && prefersDark) || (saved === 'system' && prefersDark)) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.style.colorScheme = 'dark';
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.style.colorScheme = 'light';
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
        {/* <!--
          THESIS: Institutional executive intelligence command interface for university leaders refusing generic flat SaaS cards in favor of authoritative academic rigor and actionable policy clarity.
          OWN-WORLD: Oxford Navy, Slate neutrals, Emerald, Amber, and Crimson semantic risk indicators with multi-pillar governance mapping (WR I, WR II, WR III).
          STORY: University executives instantly grasp macro dropout risk distribution, identify systemic triggers across 3 pillars, and dispatch targeted prescriptive interventions per student.
          FIRST VIEWPORT: Executive Command Header, Executive Risk Distribution Matrix with interactive SVG Donut, Macro Governance Pillars, and Instant Student Triage Table.
          FORM: Executive Command Intelligence Matrix, seed f52431d5.
          FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
        --> */}
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}


