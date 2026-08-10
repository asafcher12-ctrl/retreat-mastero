import React, { useEffect, useState } from 'react';
import { useEvent } from '@/lib/event-context';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import ViewerButton from '@/components/ViewerButton';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Clock, Utensils } from 'lucide-react';
import Meals from '@/components/program/Meals';

export default function Program() {
  const { currentEvent, currentMembers, isEventManager, canEdit } = useEvent();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [responsibleId, setResponsibleId] = useState('');
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.ProgramItem.filter({ event_id: currentEvent.id });
      setItems(list.sort((a, b) => (a.order || 0) - (b.order || 0) || String(a.time || '').localeCompare(String(b.time || ''))));
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentEvent.id]);

  const resetForm = () => { setTitle(''); setTime(''); setDescription(''); setResponsibleId(''); setEditingId(null); };

  const save = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const m = responsibleId ? currentMembers.find(m => m.user_id === responsibleId) : null;
    const payload = {
      title: title.trim(),
      time: time,
      description: description.trim(),
      responsible_id: responsibleId || '',
      responsible_name: m?.user_name || ''
    };
    if (editingId) {
      await base44.entities.ProgramItem.update(editingId, payload);
    } else {
      await base44.entities.ProgramItem.create({ event_id: currentEvent.id, order: items.length, ...payload });
    }
    resetForm();
    load();
  };

  const edit = (item) => {
    setEditingId(item.id);
    setTitle(item.title); setTime(item.time || ''); setDescription(item.description || '');
    setResponsibleId(item.responsible_id || '');
  };

  const remove = async (id) => {
    await base44.entities.ProgramItem.delete(id);
    if (editingId === id) resetForm();
    load();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">לוח זמנים</h1>
        <p className="text-sm text-stone-400">{canEdit ? 'כל חברי האירוע יכולים לערוך את התוכנית' : 'תוכנית האירוע (קריאה בלבד)'}</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Utensils className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-stone-800">ארוחות</h2>
        </div>
        <p className="text-sm text-stone-400 -mt-1">3 ארוחות ביום עם תיאור ומצרכים — המצרכים יתווספו אוטומטית לרשימת הקניות</p>
        <Meals />
      </div>

      <form onSubmit={save} className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
        <fieldset disabled={!canEdit} className="space-y-3 border-0 p-0 m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Input placeholder="כותרת הסעיף" value={title} onChange={e => setTitle(e.target.value)} />
            <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
          <Input placeholder="תיאור (לא חובה)" value={description} onChange={e => setDescription(e.target.value)} />
          <div className="flex flex-wrap items-center gap-2">
            <select value={responsibleId} onChange={e => setResponsibleId(e.target.value)} className="flex-1 min-w-[140px] bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
              <option value="">אחראי (לא חובה)</option>
              {currentMembers.map(m => (
                <option key={m.user_id} value={m.user_id}>{m.user_name || 'משתמש'}</option>
              ))}
            </select>
            <ViewerButton canEdit={canEdit} type="submit" className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 ml-1" /> {editingId ? 'עדכן' : 'הוסף'}
            </ViewerButton>
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>ביטול</Button>
            )}
          </div>
        </fieldset>
      </form>

      <div className="space-y-2.5">
        {loading ? (
          <div className="p-6 text-center text-stone-400 text-sm">טוען...</div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-stone-100 shadow-sm text-center text-stone-400 text-sm">
            התוכנית ריקה.{canEdit ? ' הוסיפו את הסעיף הראשון.' : ''}
          </div>
        ) : items.map(item => (
          <div key={item.id} className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm flex items-start gap-3 group">
            {item.time && (
              <div className="shrink-0 bg-emerald-50 text-emerald-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3" />{item.time}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-stone-800 text-sm">{item.title}</p>
              {item.description && <p className="text-sm text-stone-500 mt-0.5">{item.description}</p>}
              {item.responsible_name && (
                <span className="inline-block mt-1.5 text-[11px] bg-stone-100 text-stone-500 rounded-full px-2 py-0.5">אחראי: {item.responsible_name}</span>
              )}
            </div>
            {canEdit && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                <button onClick={() => edit(item)} className="text-stone-400 hover:text-emerald-600 text-xs">עריכה</button>
                <button onClick={() => remove(item.id)} className="text-stone-300 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}