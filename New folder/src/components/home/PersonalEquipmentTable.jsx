import React, { useEffect, useMemo, useState } from 'react';
import { useEvent } from '@/lib/event-context';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, Check, Package } from 'lucide-react';

export default function PersonalEquipmentTable() {
  const { currentEvent, currentMembers, canEdit, user } = useEvent();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({});
  const [mineDraft, setMineDraft] = useState('');
  const [filter, setFilter] = useState('untagged');
  const seenKey = `seen_mine_${currentEvent.id}`;
  const [seenIds, setSeenIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(seenKey) || '[]')); } catch { return new Set(); }
  });

  const FILTERS = [
    { key: 'untagged', label: 'לא מתויג' },
    { key: 'all', label: 'מתויג' },
    { key: 'mine', label: 'הפריטים שלי' }
  ];

  const visibleMembers = filter === 'mine' && user
    ? currentMembers.filter(m => m.user_id === user.id)
    : currentMembers;
  const untaggedItems = items
    .filter(i => !i.responsible_id && i.category !== 'personal')
    .sort((a, b) => a.is_checked ? 1 : -1);

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.EquipmentItem.filter({ event_id: currentEvent.id });
      setItems(list);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentEvent.id]);

  useEffect(() => {
    try { setSeenIds(new Set(JSON.parse(localStorage.getItem(seenKey) || '[]'))); } catch { setSeenIds(new Set()); }
  }, [seenKey]);

  const mineItems = useMemo(
    () => items.filter(i => user && i.responsible_id === user.id && i.category !== 'personal'),
    [items, user]
  );
  const newMineCount = mineItems.filter(i => !seenIds.has(i.id)).length;

  useEffect(() => {
    if (filter === 'mine' && !loading && mineItems.length) {
      const allIds = mineItems.map(i => i.id);
      setSeenIds(new Set(allIds));
      try { localStorage.setItem(seenKey, JSON.stringify(allIds)); } catch { /* ignore */ }
    }
  }, [filter, loading, mineItems, seenKey]);

  const addItem = async (member, name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    try {
      await base44.entities.EquipmentItem.create({
        event_id: currentEvent.id,
        name: trimmed,
        category: 'group',
        responsible_id: member.user_id,
        responsible_name: member.user_name || ''
      });
      setDrafts(d => ({ ...d, [member.user_id]: '' }));
      load();
      toast({ title: 'הפריט נוסף למשתתף' });
    } catch {
      toast({ title: 'שגיאה בהוספה', variant: 'destructive' });
    }
  };

  const toggleItem = async (item) => {
    try {
      await base44.entities.EquipmentItem.update(item.id, { is_checked: !item.is_checked });
      load();
    } catch {
      toast({ title: 'שגיאה בעדכון', variant: 'destructive' });
    }
  };

  const removeItem = async (item) => {
    try {
      await base44.entities.EquipmentItem.delete(item.id);
      load();
      toast({ title: 'הפריט הוסר' });
    } catch {
      toast({ title: 'שגיאה במחיקה', variant: 'destructive' });
    }
  };

  const assignItem = async (item, memberId) => {
    if (!memberId) return;
    const member = currentMembers.find(m => m.user_id === memberId);
    try {
      await base44.entities.EquipmentItem.update(item.id, {
        responsible_id: memberId,
        responsible_name: member?.user_name || ''
      });
      load();
      toast({ title: 'הפריט שויך למשתתף' });
    } catch {
      toast({ title: 'שגיאה בשיוך', variant: 'destructive' });
    }
  };

  const roleLabel = (role) => role === 'event_manager' ? 'מנהל אירוע' : role === 'viewer' ? 'צופה' : 'כוח חלוץ';
  const itemsFor = (member) => {
    const memberItems = items.filter(i => i.responsible_id === member.user_id && i.category !== 'personal');
    return [...memberItems].sort((a, b) => a.is_checked ? 1 : -1);
  };
  const sortedMembers = [...visibleMembers].sort((a, b) => itemsFor(b).length - itemsFor(a).length);

  return (
    <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <Package className="w-4 h-4" />
        </div>
        <h2 className="font-bold text-stone-800">ציוד קבוצתי לפי משתתף</h2>
        <span className="text-xs text-stone-400">פריטים קבוצתיים שמתויגים לכל משתתף</span>
        <div className="flex gap-1 bg-stone-50 border border-stone-200 rounded-lg p-0.5 mr-auto">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`relative px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                filter === f.key ? 'bg-emerald-600 text-white' : 'text-stone-500 hover:bg-stone-100'
              }`}
            >
              {f.label}
              {f.key === 'mine' && newMineCount > 0 && (
                <span className="absolute -top-1 -left-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none border-2 border-white">
                  {newMineCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-center text-stone-400 text-sm">טוען...</div>
      ) : filter === 'untagged' ? (
        untaggedItems.length === 0 ? (
          <div className="p-8 text-center text-stone-400 text-sm">אין פריטים לא מתויגים.</div>
        ) : (
          <div className="divide-y divide-stone-100 rounded-xl border border-stone-100 overflow-hidden">
            {untaggedItems.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3.5 group">
                {canEdit ? (
                  <button
                    onClick={() => toggleItem(item)}
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
                {canEdit && currentMembers.length > 0 && (
                  <select
                    defaultValue=""
                    onChange={(e) => { assignItem(item, e.target.value); e.target.value = ""; }}
                    className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-stone-500"
                  >
                    <option value="" disabled>שייך ל...</option>
                    {currentMembers.map(m => (
                      <option key={m.user_id} value={m.user_id}>{m.user_name || 'משתמש'}</option>
                    ))}
                  </select>
                )}
                {canEdit && (
                  <button onClick={() => removeItem(item)} className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      ) : filter === 'mine' ? (
        (() => {
          const mine = items
            .filter(i => user && i.responsible_id === user.id && i.category !== 'personal')
            .sort((a, b) => a.is_checked ? 1 : -1);
          if (mine.length === 0 && !canEdit) {
            return <div className="p-8 text-center text-stone-400 text-sm">אין פריטים המשויכים אליך.</div>;
          }
          return (
            <div className="divide-y divide-stone-100 rounded-xl border border-stone-100 overflow-hidden">
              {mine.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3.5 group">
                  {canEdit ? (
                    <button
                      onClick={() => toggleItem(item)}
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
                    <button onClick={() => removeItem(item)} className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {canEdit && (
                <form
                  onSubmit={(e) => { e.preventDefault(); const me = currentMembers.find(m => m.user_id === user?.id); if (me) addItem(me, mineDraft); setMineDraft(''); }}
                  className="flex items-center gap-2 p-3"
                >
                  <input
                    value={mineDraft}
                    onChange={(e) => setMineDraft(e.target.value)}
                    placeholder="הוסף פריט לעצמי..."
                    className="flex-1 text-sm bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-stone-300"
                  />
                  <button
                    type="submit"
                    className="shrink-0 inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg px-3 py-2"
                  >
                    <Plus className="w-4 h-4" /> הוסף
                  </button>
                </form>
              )}
            </div>
          );
        })()
      ) : visibleMembers.length === 0 ? (
        <div className="p-8 text-center text-stone-400 text-sm">אין משתתפים עדיין.</div>
      ) : (
        <div className="space-y-4">
          {sortedMembers.map(member => {
            const memberItems = itemsFor(member);
            return (
              <div key={member.user_id} className="rounded-xl border border-stone-100 overflow-hidden">
                <div className="px-4 py-2.5 flex items-center justify-between bg-stone-50/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold shrink-0">
                      {(member.user_name || '?').trim().charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-stone-700">{member.user_name || 'משתמש'}</p>
                      <p className="text-[11px] text-stone-400">{roleLabel(member.role)}</p>
                    </div>
                  </div>
                  <span className="text-xs text-stone-400">{memberItems.length}</span>
                </div>

                <div className="divide-y divide-stone-100">
                  {memberItems.length === 0 && !canEdit && (
                    <div className="p-4 text-center text-stone-400 text-sm">אין פריטים אישיים.</div>
                  )}
                  {memberItems.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3.5 group">
                      {canEdit ? (
                        <button
                          onClick={() => toggleItem(item)}
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
                        <button onClick={() => removeItem(item)} className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {canEdit && (
                    <form
                      onSubmit={(e) => { e.preventDefault(); addItem(member, drafts[member.user_id]); }}
                      className="flex items-center gap-2 p-3"
                    >
                      <input
                        value={drafts[member.user_id] || ''}
                        onChange={(e) => setDrafts(d => ({ ...d, [member.user_id]: e.target.value }))}
                        placeholder="הוסף פריט..."
                        className="flex-1 text-sm bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-stone-300"
                      />
                      <button
                        type="submit"
                        className="shrink-0 inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg px-3 py-2"
                      >
                        <Plus className="w-4 h-4" /> הוסף
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}