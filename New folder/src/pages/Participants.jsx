import React, { useEffect, useMemo, useState } from 'react';
import { useEvent } from '@/lib/event-context';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import ViewerButton from '@/components/ViewerButton';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Search, Moon, Clock, CalendarDays, CalendarPlus, Plus, Trash2, Users, ShieldCheck } from 'lucide-react';
import ArrivalsDashboard from '@/components/participants/ArrivalsDashboard';

const FILTERS = [
  { key: 'all', label: 'הכל' },
  { key: 'arriving', label: 'מגיעים' },
  { key: 'invited', label: 'מוזמנים' }
];

export default function Participants() {
  const { currentEvent, user, isEventManager } = useEvent();
  const { toast } = useToast();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('pioneer');
  const [newArrivalDate, setNewArrivalDate] = useState(currentEvent?.start_date || '');
  const [newArrivalTime, setNewArrivalTime] = useState('');
  const [newHasDeparture, setNewHasDeparture] = useState(false);
  const [newDepartureDate, setNewDepartureDate] = useState(currentEvent?.start_date || '');
  const [newDepartureTime, setNewDepartureTime] = useState('10:00');
  const [newNights, setNewNights] = useState(1);
  const [newAdults, setNewAdults] = useState(1);
  const [newChildren, setNewChildren] = useState(0);
  const [adding, setAdding] = useState(false);

  const load = () => {
    setLoading(true);
    base44.entities.EventMember.filter({ event_id: currentEvent.id })
      .then(m => setMembers(m))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [currentEvent.id]);

  useEffect(() => {
    if (currentEvent?.start_date) {
      if (!newArrivalDate) setNewArrivalDate(currentEvent.start_date);
      if (!newDepartureDate) setNewDepartureDate(currentEvent.start_date);
    }
  }, [currentEvent?.start_date]);

  const addParticipant = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await base44.entities.EventMember.create({
        event_id: currentEvent.id,
        user_id: `manual_${Date.now()}`,
        user_name: newName.trim(),
        role: newRole,
        arrival_date: newArrivalDate || undefined,
        arrival_time: newArrivalTime || undefined,
        departure_date: newHasDeparture ? (newDepartureDate || undefined) : undefined,
        departure_time: newHasDeparture ? (newDepartureTime || undefined) : undefined,
        nights: newNights,
        adults: newAdults,
        children: newChildren
      });
      setNewName('');
      setNewRole('pioneer');
      setNewArrivalDate(currentEvent?.start_date || '');
      setNewArrivalTime('');
      setNewHasDeparture(false);
      setNewDepartureDate(currentEvent?.start_date || '');
      setNewDepartureTime('10:00');
      setNewNights(1);
      setNewAdults(1);
      setNewChildren(0);
      load();
      toast({ title: 'המשתתף נוסף' });
    } catch {
      toast({ title: 'שגיאה בהוספה', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const changeRole = async (member, role) => {
    try {
      await base44.entities.EventMember.update(member.id, { role });
      load();
      toast({ title: 'התפקיד עודכן' });
    } catch {
      toast({ title: 'שגיאה בעדכון', variant: 'destructive' });
    }
  };

  const deleteMember = async (member) => {
    if (!window.confirm(`למחוק את ${member.user_name || 'המשתתף'} מהאירוע?`)) return;
    try {
      await base44.entities.EventMember.delete(member.id);
      load();
      toast({ title: 'המשתתף נמחק' });
    } catch {
      toast({ title: 'שגיאה במחיקה', variant: 'destructive' });
    }
  };

  const isArriving = (m) => !!m.arrival_date;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter(m => {
      if (filter === 'arriving' && !isArriving(m)) return false;
      if (filter === 'invited' && isArriving(m)) return false;
      if (q && !(m.user_name || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [members, filter, query]);

  const roleLabel = (role) => role === 'event_manager' ? 'מנהל אירוע' : role === 'viewer' ? 'צופה' : 'כוח חלוץ';

  const regulars = filtered.filter(m => m.role !== 'event_manager');
  const managers = filtered.filter(m => m.role === 'event_manager');

  const renderMember = (m) => {
    const arrivingFlag = isArriving(m);
    return (
      <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold shrink-0">
            {(m.user_name || '?').trim().charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-800">
              {m.user_name || 'משתמש'}
              {m.user_id === user?.id && <span className="text-stone-400 font-normal"> (את/ה)</span>}
            </p>
            <p className="text-[11px] text-stone-400 flex items-center gap-1.5 flex-wrap">
              <span>{roleLabel(m.role)}</span>
              {m.created_date && (
                <span className="flex items-center gap-1 text-stone-300">
                  <span>·</span>
                  <CalendarPlus className="w-3 h-3" />
                  נרשם {new Date(m.created_date).toLocaleDateString('he-IL')}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isEventManager && (
            <select
              value={m.role}
              onChange={e => changeRole(m, e.target.value)}
              className="text-[11px] bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="pioneer">כוח חלוץ</option>
              <option value="event_manager">מנהל אירוע</option>
              <option value="viewer">צופה</option>
            </select>
          )}
          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
            arrivingFlag ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'
          }`}>
            {arrivingFlag ? 'מגיע' : 'מוזמן'}
          </span>

          {isEventManager && (
            <button
              onClick={() => deleteMember(m)}
              className="text-stone-300 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
              title="מחיקת משתתף"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {arrivingFlag && (
            <div className="flex items-center gap-3 text-xs text-stone-500 flex-wrap">
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5 text-stone-400" />
                {m.arrival_date}
              </span>
              {m.arrival_time && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  {m.arrival_time}
                </span>
              )}
              {Number(m.nights) > 0 && (
                <span className="flex items-center gap-1">
                  <Moon className="w-3.5 h-3.5 text-stone-400" />
                  {Number(m.nights)} {Number(m.nights) === 1 ? 'לילה' : 'לילות'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderList = (list, emptyMsg) => list.length === 0 ? (
    <div className="p-10 text-center text-stone-400 text-sm">{emptyMsg}</div>
  ) : (
    <div className="divide-y divide-stone-100">{list.map(renderMember)}</div>
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">משתתפים</h1>
        <p className="text-sm text-stone-400">רשימת המשתתפים באירוע וסטטוס ההגעה שלהם</p>
      </div>

      <form onSubmit={addParticipant} className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Plus className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-bold text-stone-800">הוספת משתתף לאירוע</h2>
        </div>
        <p className="text-xs text-stone-400 -mt-1">הוסף משתתפים ידנית לאירוע — הם יופיעו ברשימה ובגרף ההגעות למטה</p>
        <fieldset disabled={!isEventManager} className="border-0 p-0 m-0 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input placeholder="שם המשתתף" value={newName} onChange={e => setNewName(e.target.value)} />
            <select value={newRole} onChange={e => setNewRole(e.target.value)} className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
              <option value="pioneer">כוח חלוץ</option>
              <option value="event_manager">מנהל אירוע</option>
              <option value="viewer">צופה</option>
            </select>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="text-[11px] text-stone-500 block mb-1">תאריך הגעה</label>
              <Input type="date" value={newArrivalDate} onChange={e => setNewArrivalDate(e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] text-stone-500 block mb-1">שעת הגעה</label>
              <Input type="time" value={newArrivalTime} onChange={e => setNewArrivalTime(e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] text-stone-500 block mb-1">מבוגרים</label>
              <Input type="number" min="0" value={newAdults} onChange={e => setNewAdults(Number(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-[11px] text-stone-500 block mb-1">ילדים</label>
              <Input type="number" min="0" value={newChildren} onChange={e => setNewChildren(Number(e.target.value) || 0)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-stone-600 cursor-pointer">
            <input
              type="checkbox"
              checked={newHasDeparture}
              onChange={e => {
                setNewHasDeparture(e.target.checked);
                if (e.target.checked && !newDepartureDate) setNewDepartureDate(currentEvent?.start_date || '');
              }}
              className="w-4 h-4 accent-emerald-600"
            />
            תאריך עזיבה
            {newHasDeparture && (
              <>
                <Input type="date" value={newDepartureDate} onChange={e => setNewDepartureDate(e.target.value)} className="w-auto ml-2" />
                <Input type="time" value={newDepartureTime} onChange={e => setNewDepartureTime(e.target.value)} className="w-auto" />
              </>
            )}
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex rounded-xl border border-stone-200 overflow-hidden">
              {[1, 2].map(n => (
                <button key={n} type="button" onClick={() => setNewNights(n)}
                  className={`px-4 py-2 text-sm font-medium ${newNights === n ? 'bg-emerald-500 text-white' : 'bg-white text-stone-500 hover:bg-stone-50'}`}>
                  {n} {n === 1 ? 'לילה' : 'לילות'}
                </button>
              ))}
            </div>
            <ViewerButton canEdit={isEventManager} type="submit" disabled={adding} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 ml-1" /> הוסף משתתף
            </ViewerButton>
          </div>
        </fieldset>
      </form>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="חיפוש לפי שם..."
            className="w-full bg-white border border-stone-200 rounded-xl pr-10 pl-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <div className="flex gap-1 bg-white border border-stone-200 rounded-xl p-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f.key ? 'bg-emerald-600 text-white' : 'text-stone-500 hover:bg-stone-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-stone-50 border-b border-stone-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-600" />
          <h2 className="font-bold text-stone-800 text-sm">משתתפים</h2>
          <span className="text-[11px] text-stone-400">({regulars.length})</span>
        </div>
        {loading ? (
          <div className="p-10 text-center text-stone-400 text-sm">טוען משתתפים...</div>
        ) : renderList(regulars, 'אין משתתפים בסינון זה.')}
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <h2 className="font-bold text-stone-800 text-sm">מנהלי אירוע</h2>
          <span className="text-[11px] text-stone-400">({managers.length}) · יכולים לערוך את האירוע</span>
        </div>
        {renderList(managers, 'אין מנהלי אירוע.')}
      </div>

      <ArrivalsDashboard members={members} event={currentEvent} />
    </div>
  );
}