import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid
} from 'recharts';
import { addDays, eachDayOfInterval, parseISO, format, isSameDay, isBefore, isAfter } from 'date-fns';
import { he } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';

export default function ArrivalsByDayChart({ members, startDate, endDate }) {
  const isMobile = useIsMobile();
  const days = useMemo(() => {
    if (!startDate) return [];
    try {
      const start = addDays(parseISO(startDate), -1);
      const end = addDays(parseISO(endDate || startDate), 1);
      return eachDayOfInterval({ start, end });
    } catch {
      return [];
    }
  }, [startDate, endDate]);

  const start = startDate ? parseISO(startDate) : null;
  const end = endDate ? parseISO(endDate) : start;

  const dayData = useMemo(() => days.map(day => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, label: `${h}:00`, count: 0 }));
    members.forEach(m => {
      if (m.arrival_date && m.arrival_time) {
        try {
          if (isSameDay(parseISO(m.arrival_date), day)) {
            const h = parseInt(String(m.arrival_time).split(':')[0], 10);
            if (!isNaN(h) && h >= 0 && h < 24) buckets[h].count += 1;
          }
        } catch { /* ignore bad date */ }
      }
    });
    const total = buckets.reduce((s, b) => s + b.count, 0);
    const active = buckets.filter(b => b.count > 0);

    let relative = 'יום האירוע';
    if (start && isBefore(day, start)) relative = 'יום לפני האירוע';
    else if (end && isAfter(day, end)) relative = 'יום אחרי האירוע';

    return { day, total, active, relative };
  }), [days, members, start, end]);

  return (
    <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
      <h2 className="font-bold text-stone-800 mb-1">הגעות לפי יום ושעה</h2>
      <p className="text-xs text-stone-400 mb-4">פילוח הגעות מיום לפני האירוע ועד יום אחריו, לפי שעות היום</p>

      {days.length === 0 ? (
        <div className="py-10 text-center text-stone-400 text-sm">
          <Clock className="w-8 h-8 mx-auto mb-2 text-stone-300" />
          אין תאריכי אירוע מוגדרים.
        </div>
      ) : (
        <div className="space-y-4">
          {dayData.map(({ day, total, active, relative }) => (
            <div key={day.toISOString()} className="rounded-xl border border-stone-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-stone-50/70 border-b border-stone-100">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold text-stone-700">
                    {format(day, 'EEEE d.M', { locale: he })}
                  </span>
                  <span className="text-[11px] text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">{relative}</span>
                </div>
                <span className="text-xs text-stone-500">
                  {total > 0 ? `${total} מגיעים` : 'אין הגעות'}
                </span>
              </div>
              {active.length === 0 ? (
                <div className="py-6 text-center text-stone-300 text-xs">
                  אין הגעות מתוכננות ליום זה
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={isMobile ? 170 : 150}>
                  <BarChart data={active} margin={{ top: 10, right: 10, left: isMobile ? -10 : -20, bottom: 0 }}>
                    {!isMobile && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f4" vertical={false} />}
                    <XAxis dataKey="label" interval={isMobile ? 2 : 0} tick={{ fontSize: isMobile ? 13 : 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: isMobile ? 13 : 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} width={isMobile ? 28 : 36} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #f1f5f4', fontSize: 13, direction: 'rtl' }}
                      labelFormatter={(l) => `שעה ${l}`}
                      formatter={(v) => [`${v} מגיעים`, '']}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={isMobile ? 28 : 48} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}