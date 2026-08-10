import React, { useEffect, useState } from 'react';
import { useEvent } from '@/lib/event-context';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import ViewerButton from '@/components/ViewerButton';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, ExternalLink, Lightbulb } from 'lucide-react';

export default function Recommendations() {
  const { currentEvent, user, canEdit } = useEvent();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.Recommendation.filter({ event_id: currentEvent.id });
      setItems(list);
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentEvent.id]);

  const add = async (e) => {
    e.preventDefault();
    if (!productName.trim()) return;
    await base44.entities.Recommendation.create({
      event_id: currentEvent.id,
      product_name: productName.trim(),
      description: description.trim(),
      link: link.trim()
    });
    setProductName(''); setDescription(''); setLink('');
    load();
  };

  const remove = async (item) => {
    await base44.entities.Recommendation.delete(item.id);
    load();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">המלצות קנייה</h1>
        <p className="text-sm text-stone-400">מוצרים מומלצים עם קישורים חיצוניים</p>
      </div>

      <form onSubmit={add} className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
        <fieldset disabled={!canEdit} className="space-y-3 border-0 p-0 m-0">
          <Input placeholder="שם המוצר" value={productName} onChange={e => setProductName(e.target.value)} />
          <Input placeholder="תיאור קצר (לא חובה)" value={description} onChange={e => setDescription(e.target.value)} />
          <Input placeholder="קישור (https://...)" value={link} onChange={e => setLink(e.target.value)} dir="ltr" />
          <ViewerButton canEdit={canEdit} type="submit" className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 ml-1" /> הוסף המלצה
          </ViewerButton>
        </fieldset>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {loading ? (
          <div className="col-span-full p-6 text-center text-stone-400 text-sm">טוען...</div>
        ) : items.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl p-8 border border-stone-100 shadow-sm text-center text-stone-400 text-sm">
            <Lightbulb className="w-7 h-7 mx-auto mb-2 text-stone-300" />
            אין המלצות עדיין.
          </div>
        ) : items.map(item => (
          <div key={item.id} className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm group">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-stone-800 text-sm">{item.product_name}</h3>
              {canEdit && (
                <button onClick={() => remove(item)} className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-500 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {item.description && <p className="text-sm text-stone-500 mt-1">{item.description}</p>}
            {item.link && (
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-emerald-600 hover:text-emerald-700">
                קישור למוצר <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}