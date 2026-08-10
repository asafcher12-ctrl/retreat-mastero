import React, { useEffect, useState } from 'react';
import { useEvent } from '@/lib/event-context';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import ViewerButton from '@/components/ViewerButton';
import { Input } from '@/components/ui/input';
import { CalendarCheck, Check, Users, Moon } from 'lucide-react';

export default function Arrival() {
  const { currentEvent, currentMembership, user, canEdit, reload } = useEvent();
  const [members, setMembers] = useState([]);
  const [arrivalDate, setArrivalDate] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [hasDeparture, setHasDeparture] = useState(false);
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('10:00');
  const [nights, setNights] = useState(1);
  const [name, setName] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // sync form fields with the user's membership (links a freshly-registered user)
  useEffect(() => {
    if (currentMembership) {
      setArrivalDate(currentMembership.arrival_date || currentEvent?.start_date || '');
      setArrivalTime(currentMembership.arrival_time || '');
      setHasDeparture(!!currentMembership.departure_date);
      setDepartureDate(currentMembership.departure_date || currentEvent?.end_date || currentEvent?.start_date || '');
      setDepartureTime(currentMembership.departure_time || '10:00');
      setNights(Number(currentMembership.nights) || 1);
      setName(currentMembership.user_name || '');
      setAdults(Number(currentMembership.adults) ?? 1);
      setChildren(Number(currentMembership.children) ?? 0);
    }
  }, [currentMembership?.id, currentEvent?.start_date]);

  // load all participants for this event (names + count)
  const loadMembers = () => {
    if (!currentEvent?.id) return;
    base44.entities.EventMember.filter({ event_id: currentEvent.id })
      .then(setMembers)
      .catch(() => {});
  };

  useEffect(() => { loadMembers(); }, [currentEvent?.id]);

  const save = async (e) => {
    e.preventDefault();
    if (!currentMembership) return;
    setSaving(true);
    await base44.entities.EventMember.update(currentMembership.id, {
      user_name: name,
      arrival_date: arrivalDate,
      arrival_time: arrivalTime,
      departure_date: hasDeparture ? (departureDate || null) : null,
      departure_time: hasDeparture ? (departureTime || null) : null,
      nights: nights,
      adults: adults,
      children: children
    });
    setSaving(false);
    setSaved(true);
    reload();
    loadMembers();
    setTimeout(() => setSaved(false), 2500);
  };

  const arriving = members.filter(m => !!m.arrival_date);
  const memberNights = members.reduce((s, m) => s + (Number(m.nights) || 1), 0);

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">אישור הגעה</h1>
        <p className="text-sm text-stone-400">{currentEvent.name} — עדכנו את פרטי ההגעה שלכם</p>
      </div>

      <form onSubmit={save} className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
        <fieldset disabled={!canEdit} className="space-y-4 border-0 p-0 m-0">
        <div>
          <label className="text-sm font-medium text-stone-600 block mb-1.5">שם הנרשם</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="שם מלא" required />
        </div>
        <div>
          <label className="text-sm font-medium text-stone-600 block mb-1.5">תאריך הגעה</label>
          <Input type="date" value={arrivalDate} onChange={e => setArrivalDate(e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium text-stone-600 block mb-1.5">שעת הגעה משוערת</label>
          <Input type="time" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} required />
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-stone-600 cursor-pointer">
            <input
              type="checkbox"
              checked={hasDeparture}
              onChange={e => {
                setHasDeparture(e.target.checked);
                if (e.target.checked && !departureDate) setDepartureDate(currentEvent?.end_date || currentEvent?.start_date || '');
              }}
              className="w-4 h-4 accent-emerald-600"
            />
            תאריך עזיבה
          </label>
          {hasDeparture && (
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <Input type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)} />
              <Input type="time" value={departureTime} onChange={e => setDepartureTime(e.target.value)} />
            </div>
          )}
        </div>
        <div>
          <label className="text-sm font-medium text-stone-600 block mb-2">מספר לילות</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setNights(1)}
              className={`rounded-xl border-2 py-3 text-sm font-medium transition-all ${
                nights === 1 ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-stone-200 text-stone-500'
              }`}
            >
              לילה אחד
            </button>
            <button
              type="button"
              onClick={() => setNights(2)}
              className={`rounded-xl border-2 py-3 text-sm font-medium transition-all ${
                nights === 2 ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-stone-200 text-stone-500'
              }`}
            >
              שני לילות
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-stone-600 block mb-1.5">מספר מבוגרים</label>
            <Input type="number" min="0" value={adults} onChange={e => setAdults(Number(e.target.value) || 0)} />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-600 block mb-1.5">מספר ילדים</label>
            <Input type="number" min="0" value={children} onChange={e => setChildren(Number(e.target.value) || 0)} />
          </div>
        </div>
        <ViewerButton canEdit={canEdit} type="submit" disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700">
          {saving ? 'שומר...' : saved ? (
            <span className="flex items-center gap-1"><Check className="w-4 h-4" /> נשמר</span>
          ) : (
            <span className="flex items-center gap-1"><CalendarCheck className="w-4 h-4" /> אישור הגעה</span>
          )}
        </ViewerButton>
        </fieldset>
      </form>

      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-stone-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" /> משתתפים
          </h2>
          <span className="text-xs text-stone-400">{arriving.length}/{members.length} אישרו הגעה · {memberNights} לילות-אדם</span>
        </div>
        {members.length === 0 ? (
          <p className="text-sm text-stone-400">אין משתתפים עדיין.</p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {members.map(m => {
              const isArriving = !!m.arrival_date;
              return (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span className={`${isArriving ? 'text-stone-700' : 'text-stone-400'}`}>
                    {m.user_name || 'משתמש'}
                    {m.user_id === user?.id && <span className="text-stone-400"> (את/ה)</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    {isArriving && Number(m.nights) > 0 && (
                      <span className="flex items-center gap-0.5 text-[11px] text-stone-400">
                        <Moon className="w-3 h-3" /> {Number(m.nights)}
                      </span>
                    )}
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      isArriving ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'
                    }`}>
                      {isArriving ? 'מגיע' : 'ממתין'}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}