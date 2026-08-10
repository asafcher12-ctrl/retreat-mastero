import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEvent } from '@/lib/event-context';
import { base44 } from '@/api/base44Client';
import { Package, ShoppingCart, ArrowLeft } from 'lucide-react';

export default function PendingItemsSummary() {
  const { currentEvent } = useEvent();
  const [pending, setPending] = useState({ equipment: 0, shopping: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentEvent?.id) return;
    let active = true;
    setLoading(true);
    Promise.all([
      base44.entities.EquipmentItem.filter({ event_id: currentEvent.id, is_checked: false }).catch(() => []),
      base44.entities.ShoppingItem.filter({ event_id: currentEvent.id, is_checked: false }).catch(() => []),
    ]).then(([eq, sh]) => {
      if (!active) return;
      setPending({ equipment: eq.length, shopping: sh.length });
      setLoading(false);
    });
    return () => { active = false; };
  }, [currentEvent?.id]);

  const total = pending.equipment + pending.shopping;
  const allDone = !loading && total === 0;

  return (
    <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-stone-800">נשאר לארגן</h2>
        {allDone ? (
          <span className="text-xs text-emerald-600 bg-emerald-50 rounded-full px-2.5 py-1 font-medium">הכל מסומן ✓</span>
        ) : (
          <span className="text-xs text-stone-400">{total} פריטים פתוחים</span>
        )}
      </div>

      {loading ? (
        <div className="flex gap-3">
          <div className="flex-1 h-16 rounded-xl bg-stone-50 animate-pulse" />
          <div className="flex-1 h-16 rounded-xl bg-stone-50 animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Link to="/equipment" className="group flex items-center gap-3 rounded-xl border border-stone-100 p-3 hover:border-amber-200 hover:bg-amber-50/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-bold text-stone-800 leading-none">{pending.equipment}</div>
              <div className="text-[11px] text-stone-400 mt-1">ציוד לא הושלם</div>
            </div>
            <ArrowLeft className="w-4 h-4 text-stone-300 group-hover:text-amber-500 mr-auto shrink-0" />
          </Link>

          <Link to="/shopping" className="group flex items-center gap-3 rounded-xl border border-stone-100 p-3 hover:border-teal-200 hover:bg-teal-50/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-bold text-stone-800 leading-none">{pending.shopping}</div>
              <div className="text-[11px] text-stone-400 mt-1">קניות לא הושלמו</div>
            </div>
            <ArrowLeft className="w-4 h-4 text-stone-300 group-hover:text-teal-500 mr-auto shrink-0" />
          </Link>
        </div>
      )}
    </div>
  );
}