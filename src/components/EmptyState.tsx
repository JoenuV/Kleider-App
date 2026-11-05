import type { ReactNode } from 'react';

export function EmptyState({
  art,
  title,
  children,
  actions,
}: {
  art?: ReactNode;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="empty">
      {art && <div className="art">{art}</div>}
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

/** Simple line illustration: a hanger with an empty rail. */
export function HangerArt() {
  return (
    <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="60" cy="60" r="56" fill="currentColor" opacity="0.08" stroke="none" />
      <path d="M60 34c0-5 4-8 8-8s8 3 8 8-4 7-8 9l-8 6" />
      <path d="M60 49 24 74c-4 3-2 8 3 8h66c5 0 7-5 3-8L60 49Z" />
      <path d="M34 92h52" opacity="0.4" />
    </svg>
  );
}

export function SunArt() {
  return (
    <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="60" cy="60" r="56" fill="currentColor" opacity="0.08" stroke="none" />
      <circle cx="60" cy="60" r="16" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return (
          <line
            key={i}
            x1={60 + Math.cos(a) * 26}
            y1={60 + Math.sin(a) * 26}
            x2={60 + Math.cos(a) * 34}
            y2={60 + Math.sin(a) * 34}
          />
        );
      })}
    </svg>
  );
}

export function CalendarArt() {
  return (
    <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="60" cy="60" r="56" fill="currentColor" opacity="0.08" stroke="none" />
      <rect x="32" y="36" width="56" height="50" rx="8" />
      <path d="M32 50h56M46 30v12M74 30v12" />
      <path d="M48 66l8 8 16-16" />
    </svg>
  );
}
