import Navbar from './Navbar'
import Footer from './Footer'

export default function PageShell({
  children,
  title,
  subtitle,
  action,
  maxWidth = 'max-w-[1400px]',
  showFooter = true,
  className = '',
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--color-surface-secondary)] text-[var(--color-content-primary)]">
      <Navbar />
      <main className="flex-1">
        {(title || action) && (
          <div className="border-b border-zinc-200/60 bg-white/60 backdrop-blur-sm">
            <div className={`mx-auto ${maxWidth} px-4 py-6 sm:px-6 lg:px-8`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-content-primary)]">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="mt-1 text-xs sm:text-sm text-[var(--color-content-secondary)] max-w-[70ch]">
                      {subtitle}
                    </p>
                  )}
                </div>
                {action && <div className="flex items-center gap-2 pt-2 sm:pt-0">{action}</div>}
              </div>
            </div>
          </div>
        )}
        <div className={`mx-auto ${maxWidth} px-4 py-8 sm:px-6 lg:px-8 ${className}`}>
          {children}
        </div>
      </main>
      {showFooter && <Footer />}
    </div>
  )
}
