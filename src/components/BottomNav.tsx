import { CalendarDays, Shirt, SlidersHorizontal, Sun } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const items = [
  { to: '/', label: 'Heute', Icon: Sun, end: true },
  { to: '/maker', label: 'Maker', Icon: SlidersHorizontal, end: false },
  { to: '/kleider', label: 'Kleider', Icon: Shirt, end: false },
  { to: '/verlauf', label: 'Verlauf', Icon: CalendarDays, end: false },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Hauptnavigation">
      <ul>
        {items.map(({ to, label, Icon, end }) => (
          <li key={to}>
            <NavLink to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="pill">
                <Icon size={22} strokeWidth={1.9} />
              </span>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
