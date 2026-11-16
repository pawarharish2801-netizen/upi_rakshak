import { Link } from 'react-router-dom'
import { ShieldCheck, ArrowSquareOut, Heart } from '@phosphor-icons/react'

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200/80 bg-white py-12 text-sm text-[var(--color-content-secondary)]">
      <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:gap-12">
          {/* Brand */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand-deep)] text-white">
                <ShieldCheck size={18} weight="bold" />
              </div>
              <span className="font-semibold tracking-tight text-[var(--color-content-primary)]">
                UPI Rakshak
              </span>
            </div>
            <p className="text-xs text-[var(--color-content-secondary)] leading-relaxed max-w-[32ch]">
              Pre-transaction behavioral risk engine and social engineering defense for India's digital payments.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-[var(--color-content-tertiary)] font-data">
              <span>National Cyber Crime: 1930</span>
            </div>
          </div>

          {/* Core Modules */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-content-primary)]">
              Assessment Tools
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/assess" className="hover:text-[var(--color-brand-accent)] transition-colors">
                  Payment Risk Evaluator
                </Link>
              </li>
              <li>
                <Link to="/scan" className="hover:text-[var(--color-brand-accent)] transition-colors">
                  Social Engineering Scanner
                </Link>
              </li>
              <li>
                <Link to="/history" className="hover:text-[var(--color-brand-accent)] transition-colors">
                  Audit History
                </Link>
              </li>
              <li>
                <Link to="/analytics" className="hover:text-[var(--color-brand-accent)] transition-colors">
                  Threat Analytics
                </Link>
              </li>
            </ul>
          </div>

          {/* Defense Knowledge */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-content-primary)]">
              Scam Intelligence
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/awareness" className="hover:text-[var(--color-brand-accent)] transition-colors">
                  Scam Taxonomy & Library
                </Link>
              </li>
              <li>
                <Link to="/report" className="hover:text-[var(--color-brand-accent)] transition-colors">
                  Report Threat Signature
                </Link>
              </li>
              <li>
                <a
                  href="https://cybercrime.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--color-brand-deep)] hover:underline"
                >
                  National Portal (I4C) <ArrowSquareOut size={12} />
                </a>
              </li>
              <li>
                <a
                  href="https://www.npci.org.in"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--color-brand-deep)] hover:underline"
                >
                  NPCI Guidelines <ArrowSquareOut size={12} />
                </a>
              </li>
            </ul>
          </div>

          {/* Compliance & Notice */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-content-primary)]">
              Integrity & Trust
            </h4>
            <p className="text-[11px] text-[var(--color-content-tertiary)] leading-relaxed">
              UPI Rakshak runs local ML telemetry and structured intent rules. No actual UPI PINs or payment tokens are ever stored or transmitted.
            </p>
            <div className="pt-2 text-[11px] text-[var(--color-content-secondary)]">
              <span className="inline-block rounded bg-zinc-100 px-2 py-0.5 text-zinc-600 font-data">
                v2.4-Production
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between border-t border-zinc-100 pt-6 text-xs text-[var(--color-content-tertiary)] md:flex-row">
          <p>© {new Date().getFullYear()} UPI Rakshak. Built for sovereign payment security in India.</p>
          <p className="mt-2 md:mt-0 flex items-center gap-1">
            Engineered with strict zero-trust standards
          </p>
        </div>
      </div>
    </footer>
  )
}
