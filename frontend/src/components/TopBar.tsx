import { Link, NavLink } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition-colors ${
    isActive ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
  }`;

export default function TopBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-teal-600" />
          <span className="text-base font-bold tracking-tight text-slate-900">
            NarrativeGuard
          </span>
        </Link>
        <nav className="flex items-center gap-4 sm:gap-6">
          <NavLink to="/" end className={navLinkClass}>
            Check
          </NavLink>
          <NavLink to="/examples" className={navLinkClass}>
            Examples
          </NavLink>
          <NavLink to="/about" className={navLinkClass}>
            About &amp; Limits
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
