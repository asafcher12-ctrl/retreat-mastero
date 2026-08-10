import React, { useEffect, useState } from 'react';
import { useEvent } from '@/lib/event-context';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import ViewerButton from '@/components/ViewerButton';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Check, ChevronDown } from 'lucide-react';

export default function Equipment() {
  const { currentEvent, currentMembers, canEdit } = useEvent();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('group');

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.EquipmentItem.filter({ event_id: currentEvent.id });
      setItems(list);
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentEvent.id]);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await base44.entities.EquipmentItem.create({ event_id: currentEvent.id, name: name.trim(), category });
    setName('');
    setCategory('group');
    load();
  };

  const toggle = async (item) => {
    await base44.entities.EquipmentItem.update(item.id, { is_checked: !item.is_checked });
    load();
  };

  const remove = async (item) => {
    await base44.entities.EquipmentItem.delete(item.id);
    load();
  };

  const setResponsible = async (item, userId) => {
    const m = currentMembers.find(m => m.user_id === userId);
    await base44.entities.EquipmentItem.update(item.id, { responsible_id: userId, responsible_name: m?.user_name || '' });
    load();
  };

  const sorted = [...items].sort((a, b) => a.is_checked ? 1 : -1);
  const groupItems = sorted.filter(i => i.category !== 'personal');
  const personalItems = sorted.filter(i => i.category === 'personal');

  const renderSection = (title, list, emptyText) => (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm divide-y divide-stone-100">
      <div className="px-4 py-2.5 flex items-center justify-between">
        <h2 className="text-sm font-bold text-stone-700">{title}</h2>
        <span className="text-xs text-stone-400">{list.length}</span>
      </div>
      {loading ? (
        <div className="p-6 text-center text-stone-400 text-sm">טוען...</div>
      ) : list.length === 0 ? (
        <div className="p-8 text-center text-stone-400 text-sm">{emptyText}</div>
      ) : list.map(item => (
        <div key={item.id} className="flex items-center gap-3 p-3.5 group">
          {canEdit ? (
            <button
              onClick={() => toggle(item)}
              className={`shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                item.is_checked ? 'bg-emerald-600 border-emerald-600' : 'border-stone-300 hover:border-emerald-400'
              }`}
            >
              {item.is_checked && <Check className="w-4 h-4 text-white" />}
            </button>
          ) : (
            <div className={`shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center ${item.is_checked ? 'bg-emerald-600 border-emerald-600' : 'border-stone-200'}`}>
              {item.is_checked && <Check className="w-4 h-4 text-white" />}
            </div>
          )}
          <p className={`flex-1 text-sm font-medium ${item.is_checked ? 'line-through text-stone-300' : 'text-stone-700'}`}>{item.name}</p>
          {canEdit && (
            <div className="relative">
              <select
                value={item.responsible_id || ''}
                onChange={e => setResponsible(item, e.target.value)}
                className={`appearance-none text-xs bg-stone-50 border border-stone-200 rounded-lg pr-2 pl-6 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 ${item.responsible_name ? 'text-emerald-700 font-medium' : 'text-stone-400'}`}
              >
                <option value="">ללא אחראי</option>
                {currentMembers.map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.user_name || 'משתמש'}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute left-1.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            </div>
          )}
          {canEdit && (
            <button onClick={() => remove(item)} className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-500">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">רשימת ציוד</h1>
        <p className="text-sm text-stone-400">סמנו ציוד שהוכן ותייגו אחראים</p>
      </div>

      <form onSubmit={add} className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
        <fieldset disabled={!canEdit} className="space-y-3 border-0 p-0 m-0">
          <Input placeholder="שם הפריט" value={name} onChange={e => setName(e.target.value)} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCategory('group')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                category === 'group' ? 'bg-emerald-600 text-white' : 'bg-stone-50 text-stone-500'
              }`}
            >
              ציוד קבוצתי
            </button>
            <button
              type="button"
              onClick={() => setCategory('personal')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                category === 'personal' ? 'bg-emerald-600 text-white' : 'bg-stone-50 text-stone-500'
              }`}
            >
              ציוד אישי
            </button>
            <ViewerButton canEdit={canEdit} type="submit" className="bg-emerald-600 hover:bg-emerald-700 shrink-0">
              <Plus className="w-4 h-4 ml-1" /> הוסף
            </ViewerButton>
          </div>
        </fieldset>
      </form>

      {renderSection('ציוד קבוצתי', groupItems, 'אין פריטים קבוצתיים.')}
      {renderSection('ציוד אישי', personalItems, 'אין פריטים אישיים.')}
    </div>
  );
}