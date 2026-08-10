import React, { useEffect, useState, useMemo } from 'react';
import { useEvent } from '@/lib/event-context';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import ViewerButton from '@/components/ViewerButton';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Check, Sparkles, ChevronDown, ClipboardList, ListPlus } from 'lucide-react';

export default function Shopping() {
  const { currentEvent, currentMembers, isEventManager, canEdit } = useEvent();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [responsibleId, setResponsibleId] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.ShoppingItem.filter({ event_id: currentEvent.id });
      setItems(list);
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentEvent.id]);

  const categories = useMemo(() => {
    const set = new Set();
    items.forEach(i => { if (i.category) set.add(i.category); });
    return Array.from(set);
  }, [items]);

  const addItem = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const resp = responsibleId ? (currentMembers.find(m => m.user_id === responsibleId)) : null;
    await base44.entities.ShoppingItem.create({
      event_id: currentEvent.id,
      name: name.trim(),
      category: category.trim(),
      responsible_id: responsibleId || '',
      responsible_name: resp?.user_name || ''
    });
    setName(''); setCategory(''); setResponsibleId('');
    load();
  };

  const addBulk = async (e) => {
    e.preventDefault();
    const lines = bulkText
      .split(/[\n\r]+/)
      .map(l => l.trim())
      .filter(l => l.length > 0);
    if (lines.length === 0) return;
    setBulkBusy(true);
    try {
      await base44.entities.ShoppingItem.bulkCreate(
        lines.map(name => ({ event_id: currentEvent.id, name }))
      );
      setBulkText('');
      setBulkMode(false);
      load();
    } catch (e) {} finally { setBulkBusy(false); }
  };

  const toggle = async (item) => {
    await base44.entities.ShoppingItem.update(item.id, { is_checked: !item.is_checked });
    load();
  };

  const remove = async (item) => {
    await base44.entities.ShoppingItem.delete(item.id);
    load();
  };

  const setResponsible = async (item, userId) => {
    const m = currentMembers.find(m => m.user_id === userId);
    await base44.entities.ShoppingItem.update(item.id, {
      responsible_id: userId,
      responsible_name: m?.user_name || ''
    });
    load();
  };

  const dedupe = async () => {
    const seen = {};
    const dupes = [];
    items.forEach(i => {
      const key = i.name.trim().toLowerCase();
      if (seen[key]) dupes.push(i.id); else seen[key] = i.id;
    });
    if (dupes.length === 0) return;
    for (const id of dupes) { await base44.entities.ShoppingItem.delete(id); }
    load();
  };

  const filtered = items.filter(i => filterCat === 'all' || i.category === filterCat);
  const sorted = [...filtered].sort((a, b) => {
    if (a.is_checked !== b.is_checked) return a.is_checked ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">רשימת קניות</h1>
          <p className="text-sm text-stone-400">סמנו פריטים שנקנו ותייגו אחראים</p>
        </div>
        {items.length > 0 && (
          <ViewerButton canEdit={canEdit} variant="outline" size="sm" onClick={dedupe} className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
            <Sparkles className="w-4 h-4 ml-1" /> הסר כפילויות
          </ViewerButton>
        )}
      </div>

      <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => { setBulkMode(false); setBulkText(''); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!bulkMode ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-500'}`}
          >
            <Plus className="w-3.5 h-3.5" /> פריט אחד
          </button>
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => setBulkMode(true)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${bulkMode ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-500'}`}
          >
            <ListPlus className="w-3.5 h-3.5" /> הוספה מרובה
          </button>
        </div>

        {bulkMode ? (
          <form onSubmit={addBulk} className="space-y-3">
            <fieldset disabled={!canEdit || bulkBusy} className="space-y-3 border-0 p-0 m-0">
              <div className="flex items-start gap-2 text-xs text-stone-400">
                <ClipboardList className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
                <p>הדביקו רשימת פריטים — כל שורה תיווסף כפריט נפרד, ללא קטגוריה. מתאים להעתקה מטבלת אקסל.</p>
              </div>
              <textarea
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                placeholder={'לחם\nחלב\nעגבניות\n...'}
                rows={6}
                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-y font-mono"
                autoFocus
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-stone-400">
                  {bulkText.split(/[\n\r]+/).filter(l => l.trim()).length} פריטים מוכנים
                </span>
                <div className="flex items-center gap-2">
                  <ViewerButton canEdit={canEdit} type="button" variant="outline" size="sm" onClick={() => { setBulkText(''); setBulkMode(false); }}>
                    ביטול
                  </ViewerButton>
                  <ViewerButton canEdit={canEdit} type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={bulkBusy}>
                    <ListPlus className="w-4 h-4 ml-1" /> {bulkBusy ? 'מוסיף...' : 'הוסף פריטים'}
                  </ViewerButton>
                </div>
              </div>
            </fieldset>
          </form>
        ) : (
          <form onSubmit={addItem} className="space-y-3">
            <fieldset disabled={!canEdit} className="space-y-3 border-0 p-0 m-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input placeholder="שם הפריט" value={name} onChange={e => setName(e.target.value)} />
                <Input placeholder="קטגוריה (לא חובה)" value={category} onChange={e => setCategory(e.target.value)} list="cats" />
                <select value={responsibleId} onChange={e => setResponsibleId(e.target.value)} className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                  <option value="">אחראי (לא חובה)</option>
                  {currentMembers.map(m => (
                    <option key={m.user_id} value={m.user_id}>{m.user_name || 'משתמש'}</option>
                  ))}
                </select>
              </div>
              <datalist id="cats">
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
              <ViewerButton canEdit={canEdit} type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 ml-1" /> הוסף פריט
              </ViewerButton>
            </fieldset>
          </form>
        )}
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={() => setFilterCat('all')} className={`px-3 py-1.5 rounded-full text-xs font-medium ${filterCat === 'all' ? 'bg-emerald-600 text-white' : 'bg-white text-stone-500 border border-stone-200'}`}>הכל</button>
          {categories.map(c => (
            <button key={c} onClick={() => setFilterCat(c)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${filterCat === c ? 'bg-emerald-600 text-white' : 'bg-white text-stone-500 border border-stone-200'}`}>{c}</button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm divide-y divide-stone-100">
        {loading ? (
          <div className="p-6 text-center text-stone-400 text-sm">טוען...</div>
        ) : sorted.length === 0 ? (
          <div className="p-8 text-center text-stone-400 text-sm">הרשימה ריקה.{canEdit ? ' הוסיפו פריט ראשון.' : ''}</div>
        ) : sorted.map(item => (
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
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${item.is_checked ? 'line-through text-stone-300' : 'text-stone-700'}`}>{item.name}</p>
              {item.category && <span className="text-[11px] text-stone-400 ml-1">· {item.category}</span>}
            </div>
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
              <button onClick={() => remove(item)} className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-500 transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}