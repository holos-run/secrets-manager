import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageLayoutProps {
  children: ReactNode
  className?: string
}

interface PageHeaderProps {
  title: string
  eyebrow?: string
  description?: string
  actions?: ReactNode
  className?: string
}

/**
 * Shared operator-page shell. The 8/6/4 gap rhythm keeps dense resource pages
 * consistent without turning the console into a card-heavy dashboard.
 */
export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <section
      data-testid="page-layout"
      data-layout="operator-page"
      className={cn('mx-auto flex w-full max-w-[90rem] flex-col gap-8', className)}
    >
      {children}
    </section>
  )
}

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      data-testid="page-header"
      className={cn(
        'flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        {eyebrow && (
          <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
