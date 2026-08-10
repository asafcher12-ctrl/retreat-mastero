import React from 'react';
import { Receipt } from 'lucide-react';

export default function SpentByMember({ rows, currentUserId }) {
  const spenders = rows.filter(r => r.spent > 0);
  const maxSpent = spenders.reduce((mx, r) => Math.max(mx, r.spent), 0) || 1;

  return (
    <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <Receipt className="w-4 h-4" />
        </div>
        <div>
          <h2 className="font-bold text-stone-800 text-sm">כמה הוציא כל משתתף</h2>
          <p className="text-[11px] text-stone-400">סך ההוצאות שנרשמו על שמך עד כה</p>
        </div>
      </div>

      {spenders.length === 0 ? (
        <div className="p-6 text-center text-stone-400 text-sm">עדיין לא נרשמו הוצאות.</div>
      ) : (
        <div className="space-y-2.5">
          {spenders.map((r, i) => {
            const isMe = r.userId && r.userId === currentUserId;
            const pct = Math.round((r.spent / maxSpent) * 100);
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="w-28 shrink-0 flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-[11px] font-bold shrink-0">
                    {(r.name || '?').trim().charAt(0)}
                  </div>
                  <span className={`text-xs truncate ${isMe ? 'font-bold text-emerald-700' : 'font-medium text-stone-600'}`}>
                    {r.name}{isMe && ' (את/ה)'}
                  </span>
                </div>
                <div className="flex-1 h-2 rounded-full bg-stone-100 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <div className="w-16 text-left text-sm font-bold text-stone-800">₪{r.spent.toFixed(0)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}