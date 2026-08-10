import React, { useState, useEffect } from 'react';
import { useEvent } from '@/lib/event-context';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Link as LinkIcon, Copy, Plus, Tent, Users, Crown, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { seedEventDemo } from '@/lib/demoTemplate';

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function Events() {
  const { events, currentEvent, selectEvent, isSuperAdmin, isEventManager, user, memberships, anonymous, reload } = useEvent();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  const createEvent = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const code = genCode();
    const ev = await base44.entities.Event.create({
      name: name.trim(),
      location: location.trim(),
      start_date: startDate,
      end_date: endDate,
      description: description.trim(),
      invite_code: code
    });
    await base44.entities.EventMember.create({
      event_id: ev.id,
      user_id: user.id,
      user_name: user.full_name || user.email,
      role: 'event_manager'
    });
    await seedEventDemo(ev.id);
    setName(''); setLocation(''); setStartDate(''); setEndDate(''); setDescription('');
    setShowForm(false);
    await reload();
    selectEvent(ev.id);
    toast({ title: 'האירוע נוצר' });
  };

  const copyInvite = (ev) => {
    const url = `${window.location.origin}/join/${ev.invite_code}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'קישור ההזמנה הועתק', description: 'שתפו אותו עם המוזמנים' });
  };

  const startEdit = (ev) => {
    setEditId(ev.id);
    setEditName(ev.name || '');
    setEditLocation(ev.location || '');
    setEditStart(ev.start_date || '');
    setEditEnd(ev.end_date || '');
  };

  const cancelEdit = () => { setEditId(null); };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    await base44.entities.Event.update(editId, {
      name: editName.trim(),
      location: editLocation.trim(),
      start_date: editStart,
      end_date: editEnd
    });
    setEditId(null);
    await reload();
    toast({ title: 'האירוע עודכן' });
  };

  const deleteEvent = async (ev) => {
    if (!window.confirm(`למחוק את האירוע "${ev.name}"? פעולה זו תמחק את כל הנתונים הקשורים (משתתפים, ציוד, תוכנית, רשימת קניות, הוצאות) ואינה הפיכה.`)) return;
    await base44.entities.EquipmentItem.deleteMany({ event_id: ev.id });
    await base44.entities.ProgramItem.deleteMany({ event_id: ev.id });
    await base44.entities.ShoppingItem.deleteMany({ event_id: ev.id });
    await base44.entities.Expense.deleteMany({ event_id: ev.id });
    await base44.entities.Recommendation.deleteMany({ event_id: ev.id });
    await base44.entities.Meal.deleteMany({ event_id: ev.id });
    await base44.entities.EventMember.deleteMany({ event_id: ev.id });
    await base44.entities.Event.delete(ev.id);
    if (currentEvent?.id === ev.id) {
      const remaining = events.filter(e => e.id !== ev.id);
      selectEvent(remaining[0]?.id || '');
    }
    await reload();
    toast({ title: 'האירוע נמחק' });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">ניהול אירועים</h1>
          <p className="text-sm text-stone-400">צרו אירוע ושתפו קישור הזמנה</p>
        </div>
        {!anonymous && (
          <Button onClick={() => setShowForm(s => !s)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 ml-1" /> אירוע חדש
          </Button>
        )}
      </div>

      {!anonymous && showForm && (
        <form onSubmit={createEvent} className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm space-y-3">
          <Input placeholder="שם האירוע" value={name} onChange={e => setName(e.target.value)} required />
          <Input placeholder="מיקום" value={location} onChange={e => setLocation(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" placeholder="תאריך התחלה" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <Input type="date" placeholder="תאריך סיום" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <Input placeholder="תיאור (לא חובה)" value={description} onChange={e => setDescription(e.target.value)} />
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">צור אירוע</Button>
        </form>
      )}

      <div className="space-y-3">
        {events.map(ev => {
          const mem = memberships.find(m => m.event_id === ev.id);
          const isManager = mem?.role === 'event_manager';
          return (
            <div key={ev.id} className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-stone-800">{ev.name}</h3>
                    {isManager && <span className="text-[10px] bg-amber-50 text-amber-600 rounded-full px-2 py-0.5 font-medium flex items-center gap-1"><Crown className="w-2.5 h-2.5" />מנהל</span>}
                  </div>
                  {ev.location && <p className="text-xs text-stone-400 mt-0.5">{ev.location}</p>}
                  {ev.start_date && <p className="text-xs text-stone-400">{ev.start_date}{ev.end_date ? ` – ${ev.end_date}` : ''}</p>}
                </div>
                {ev.id === currentEvent?.id && <span className="text-[10px] bg-emerald-50 text-emerald-600 rounded-full px-2 py-0.5 font-medium">נוכחי</span>}
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {ev.id !== currentEvent?.id && (
                  <Button variant="outline" size="sm" onClick={() => selectEvent(ev.id)}>עבור לאירוע</Button>
                )}
                {isManager && (
                  <Button variant="outline" size="sm" onClick={() => copyInvite(ev)} className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                    <Copy className="w-3.5 h-3.5 ml-1" /> קישור הזמנה
                  </Button>
                )}
                {isManager && editId !== ev.id && (
                  <Button variant="outline" size="sm" onClick={() => startEdit(ev)}>
                    <Pencil className="w-3.5 h-3.5 ml-1" /> עריכה
                  </Button>
                )}
                {ev.created_by_id === user?.id && editId !== ev.id && (
                  <Button variant="outline" size="sm" onClick={() => deleteEvent(ev)} className="text-red-600 border-red-200 hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5 ml-1" /> מחיקה
                  </Button>
                )}
              </div>

              {isManager && editId === ev.id && (
                <form onSubmit={saveEdit} className="mt-3 border-t border-stone-100 pt-3 space-y-2">
                  <Input placeholder="שם האירוע" value={editName} onChange={e => setEditName(e.target.value)} required />
                  <Input placeholder="מיקום" value={editLocation} onChange={e => setEditLocation(e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="date" value={editStart} onChange={e => setEditStart(e.target.value)} />
                    <Input type="date" value={editEnd} onChange={e => setEditEnd(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700">שמור</Button>
                    <Button type="button" size="sm" variant="outline" onClick={cancelEdit}>ביטול</Button>
                  </div>
                </form>
              )}

              {isManager && (
                <div className="mt-3 bg-stone-50 rounded-lg p-2.5 flex items-center gap-2">
                  <LinkIcon className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <code className="text-[11px] text-stone-500 truncate flex-1" dir="ltr">{window.location.origin}/join/{ev.invite_code}</code>
                </div>
              )}
            </div>
          );
        })}
        {events.length === 0 && (
          <div className="bg-white rounded-2xl p-8 border border-stone-100 shadow-sm text-center text-stone-400 text-sm">
            <Tent className="w-8 h-8 mx-auto mb-2 text-stone-300" />
            אין אירועים. צרו אירוע ראשון ושתפו קישור הזמנה עם החברים.
          </div>
        )}
      </div>
    </div>
  );
}