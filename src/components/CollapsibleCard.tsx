import { useState, type ReactNode } from 'react';

type Props = {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
};

export function CollapsibleCard({
  title,
  actions,
  children,
  defaultOpen = true,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`card${open ? '' : ' is-collapsed'}`}>
      <header className="card-header">
        <button
          className="card-toggle"
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <span aria-hidden="true">{open ? '▾' : '▸'}</span>
          <h2>{title}</h2>
        </button>
        {actions && <div className="card-actions">{actions}</div>}
      </header>
      {open && children}
    </section>
  );
}
