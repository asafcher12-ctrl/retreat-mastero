import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEvent } from '@/lib/event-context';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  Home as HomeIcon,
  ShoppingCart,
  Wallet,
  CalendarDays,
  Package,
  Lightbulb,
  CalendarCheck,
  Users,
  LogOut,
  Settings,
  Menu,
  X,
  UserPlus,
  LogIn
} from 'lucide-react';
import Logo from '@/components/Logo';
import { useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';

const navItems = [
  { to: '/participants', label: 'משתתפים', icon: Users },
  { to: '/', label: 'דף הבית', icon: HomeIcon },
  { to: '/shopping', label: 'רשימת קניות', icon: ShoppingCart },
  { to: '/expenses', label: 'הוצאות', icon: Wallet },
  { to: '/program', label: 'לוח זמנים', icon: CalendarDays },
  { to: '/equipment', label: 'רשימת ציוד', icon: Package },
  { to: '/recommendations', label: 'המלצות קנייה', icon: Lightbulb },
  { to: '/arrival', label: 'אישור הגעה', icon: CalendarCheck }
];

export default function Layout() {
  const { user, currentEvent, events, selectEvent, isSuperAdmin, isEventManager, isAnonymousViewer, anonymous, canEdit, loading } = useEvent();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const ctaLink = anonymous
    ? `/register${currentEvent?.invite_code ? `?next=${encodeURIComponent('/join/' + currentEvent.invite_code)}` : ''}`
    : (currentEvent?.invite_code ? `/join/${currentEvent.invite_code}` : '/events');

  const handleLogout = async () => {
    await base44.auth.logout('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-emerald-900/20">
        <Logo size="md" />
      </div>

      <div className="px-4 py-3 border-b border-emerald-900/20">
        <label className="text-[11px] font-medium text-stone-400 mb-1 block">אירוע נוכחי</label>
        {events.length > 0 ? (
          <select
            value={selectedEventIdSafe()}
            onChange={(e) => selectEvent(e.target.value)}
            className="w-full text-sm bg-white border border-stone-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-stone-400">אין אירועים</p>
        )}
      </div>

      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const active = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-emerald-900/20 space-y-1">
        {isAnonymousViewer ? (
          <>
            <Link
              to={`/register${currentEvent?.invite_code ? `?next=${encodeURIComponent('/join/' + currentEvent.invite_code)}` : ''}`}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
            >
              <UserPlus className="w-[18px] h-[18px]" />
              הרשמה כמנהל
            </Link>
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-500 hover:bg-stone-50 hover:text-stone-700"
            >
              <LogIn className="w-[18px] h-[18px]" />
              התחברות
            </Link>
          </>
        ) : (
          <>
            <Link
              to="/events"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-500 hover:bg-stone-50 hover:text-stone-700"
            >
              <Settings className="w-[18px] h-[18px]" />
              ניהול אירועים
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-500 hover:bg-stone-50 hover:text-stone-700 w-full"
            >
              <LogOut className="w-[18px] h-[18px]" />
              התנתקות
            </button>
            {user && (
              <div className="px-3 pt-2">
                <p className="text-xs text-stone-400 truncate">{user.email}</p>
                {isSuperAdmin && <span className="text-[10px] text-amber-600 font-medium">מנהל גדול</span>}
                {isEventManager && !isSuperAdmin && <span className="text-[10px] text-emerald-600 font-medium">מנהל אירוע</span>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  function selectedEventIdSafe() {
    return currentEvent?.id || (events[0]?.id ?? '');
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-stone-50">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentEvent) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center bg-white rounded-3xl p-8 shadow-sm border border-stone-100">
          <div className="flex justify-center mb-4">
            <Logo size="lg" withText={false} />
          </div>
          {anonymous ? (
            <>
              <h2 className="text-xl font-bold text-stone-800 mb-2">ברוכים הבאים</h2>
              <p className="text-stone-500 text-sm mb-5">לצפייה באירוע יש להשתמש בקישור ההזמנה שקיבלתם ממנהל האירוע.</p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-stone-800 mb-2">אינך רשום לאירוע עדיין</h2>
              <p className="text-stone-500 text-sm mb-5">בקש קישור הזמנה ממנהל האירוע, או צור אירוע חדש אם הינך מנהל אירוע.</p>
              <Link to="/events">
                <Button className="bg-emerald-600 hover:bg-emerald-700">צור אירוע חדש</Button>
              </Link>
              <p className="text-xs text-stone-400 mt-3">או המתינו לקישור הזמנה ממנהל אירוע.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-stone-50" dir="rtl">
      {!canEdit && (
        <div className="bg-blue-600 text-white mt-14 lg:mt-0">
          <div className="px-4 py-2.5 text-sm flex items-center justify-center gap-3 flex-wrap text-center max-w-5xl mx-auto">
            <span>רוצה לערוך או לשנות את האירוע? {anonymous ? 'הירשמו לאפליקציה' : 'הצטרפו כמנהלי אירוע'}</span>
            <Link to={ctaLink} className="inline-flex items-center gap-1 bg-white text-blue-700 font-bold rounded-lg px-3 py-1.5 hover:bg-blue-50 shadow-sm">
              <UserPlus className="w-4 h-4" /> {anonymous ? 'להרשמה' : 'הצטרף כמנהל'}
            </Link>
          </div>
        </div>
      )}
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-72 shrink-0 bg-white border-l border-stone-200 h-screen sticky top-0">
          <SidebarContent />
        </aside>

        {/* Mobile header */}
        <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-white border-b border-stone-200 px-4 h-14 flex items-center justify-between">
          <Logo size="sm" subtitle={false} />
          <button onClick={() => setMobileOpen(true)} className="p-3 -mr-2 text-stone-600 rounded-lg hover:bg-stone-100 active:bg-stone-200 transition-colors" aria-label="פתח תפריט">
            <Menu className="w-7 h-7" />
          </button>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
            <div className="relative w-72 max-w-[80%] bg-white h-full shadow-xl">
              <button onClick={() => setMobileOpen(false)} className="absolute top-3 left-3 p-2 text-stone-400 rounded-lg hover:bg-stone-100 active:bg-stone-200 transition-colors" aria-label="סגור תפריט">
                <X className="w-7 h-7" />
              </button>
              <SidebarContent />
            </div>
          </div>
        )}

        <main className="flex-1 min-w-0 lg:pt-0 pt-14">
          <div className="p-5 lg:p-8 max-w-5xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
    </TooltipProvider>
  );
}