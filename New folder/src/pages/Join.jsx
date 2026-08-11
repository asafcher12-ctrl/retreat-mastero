import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Tent, Loader2, Check, LogIn, UserPlus } from 'lucide-react';

export default function Join() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState('loading'); // loading | joined | already | viewer | notfound | error
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await base44.auth.me();
        setIsLoggedIn(true);
      } catch {
        setIsLoggedIn(false);
      }

      // find the event by invite code (works for anonymous viewers on a public app)
      let ev;
      try {
        const matches = await base44.entities.Event.filter({ invite_code: code });
        ev = matches?.[0];
      } catch (e) {
        setStatus('error');
        return;
      }
      if (!ev) { setStatus('notfound'); return; }

      // try authenticated path — registered users become managers of the event
      try {
        const me = await base44.auth.me();
        const existing = await base44.entities.EventMember.filter({ event_id: ev.id, user_id: me.id });
        if (existing.length > 0) {
          localStorage.setItem('selectedEventId', ev.id);
          localStorage.removeItem('viewingEventId');
          setStatus('already');
          setTimeout(() => navigate('/'), 1500);
          return;
        }
        await base44.entities.EventMember.create({
          event_id: ev.id,
          user_id: me.id,
          user_name: me.full_name || me.email,
          role: 'event_manager',
          nights: 1
        });
        localStorage.setItem('selectedEventId', ev.id);
        localStorage.removeItem('viewingEventId');
        setStatus('joined');
        toast({ title: 'נרשמת כמנהל האירוע!' });
        setTimeout(() => navigate('/'), 1800);
      } catch (e) {
        // anonymous viewer — set as the viewing event (read-only) and enter the app
        localStorage.setItem('viewingEventId', ev.id);
        localStorage.setItem('selectedEventId', ev.id);
        setStatus('viewer');
        setTimeout(() => navigate('/'), 1200);
      }
    })();
  }, [code]);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6" dir="rtl">
      <div className="max-w-md text-center bg-white rounded-3xl p-8 shadow-sm border border-stone-100">
        {!isLoggedIn && (
          <div className="mb-5 flex gap-2 justify-center">
            <Link
              to={`/login?next=${encodeURIComponent(window.location.pathname)}`}
              className="inline-flex items-center gap-1 rounded-xl bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-800"
            >
              <LogIn className="w-4 h-4" />
              התחברות
            </Link>
            <Link
              to={`/register?next=${encodeURIComponent(window.location.pathname)}`}
              className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
            >
              <UserPlus className="w-4 h-4" />
              הרשמה
            </Link>
          </div>
        )}

        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          {status === 'loading' ? (
            <Loader2 className="w-7 h-7 text-emerald-600 animate-spin" />
          ) : status === 'notfound' ? (
            <Tent className="w-7 h-7 text-stone-400" />
          ) : (
            <Check className="w-7 h-7 text-emerald-600" />
          )}
        </div>
        {status === 'loading' && <p className="text-stone-500 text-sm">מצטרף לאירוע...</p>}
        {status === 'joined' && <><h2 className="text-xl font-bold text-stone-800 mb-1">נרשמת כמנהל!</h2><p className="text-stone-500 text-sm">מעביר לדף הבית...</p></>}
        {status === 'already' && <><h2 className="text-xl font-bold text-stone-800 mb-1">כבר רשום/ה</h2><p className="text-stone-500 text-sm">מעביר לאירוע...</p></>}
        {status === 'viewer' && <><h2 className="text-xl font-bold text-stone-800 mb-1">צופה באירוע</h2><p className="text-stone-500 text-sm">מעביר לתצוגה...</p></>}
        {status === 'notfound' && <><h2 className="text-xl font-bold text-stone-800 mb-1">קוד הזמנה לא תקין</h2><p className="text-stone-500 text-sm">בדקו את הקישור עם מנהל האירוע.</p></>}
        {status === 'error' && <><h2 className="text-xl font-bold text-stone-800 mb-1">שגיאה</h2><p className="text-stone-500 text-sm">אירעה שגיאה. נסו שוב מאוחר יותר.</p></>}
      </div>
    </div>
  );
}