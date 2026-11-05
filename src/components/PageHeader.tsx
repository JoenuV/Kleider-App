import type { ReactNode } from 'react';

export function PageHeader({ eyebrow, title, actions }: { eyebrow?: ReactNode; title: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div className="titles">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="display">{title}</h1>
      </div>
      {actions && <div className="header-actions">{actions}</div>}
    </header>
  );
}
