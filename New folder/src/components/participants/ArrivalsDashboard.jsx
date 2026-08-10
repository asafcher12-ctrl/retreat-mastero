import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, LabelList,
  AreaChart, Area
} from 'recharts';
import { addDays, eachDayOfInterval, parseISO, format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Trophy, Users, UserX } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const SHIFTS = [
  { key: 'morning', label: 'בוקר' },
  { key: 'noon', label: 'צהריים' },
  { key: 'evening', label: 'ערב' }
];

const SHIFT_ORDER = { morning: 0, noon: 1, evening: 2 };

function shiftOfHour(h) {
  if (h >= 6 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'noon';
  return 'evening';
}

function SlotTooltip({ active, payload, valueKey = 'count', valueLabel = 'מגיעים' }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-white rounded-xl border border-stone-100 shadow p-2.5 text-xs" dir="rtl">
      <p className="font-bold text-stone-700">{p.shortDay} · {p.shiftLabel}</p>
      <p className="text-teal-600 mt-0.5">{p[valueKey]} {valueLabel}</p>
    </div>
  );
}

export default function ArrivalsDashboard({ members, event }) {
  const [tab, setTab] = useState('present');
  const [activeSlot, setActiveSlot] = useState(null);
  const isMobile = useIsMobile();

  const start = event?.start_date ? parseISO(event.start_date) : null;
  const end = (() => {
    if (!start) return null;
    if (!event?.end_date) return start;
    const e = parseISO(event.end_date);
    return e < start ? start : e;
  })();

  const days = useMemo(() => {
    if (!start) return [];
    return eachDayOfInterval({ start: addDays(start, -1), end: addDays(end || start, 1) });
  }, [start, end]);

  const points = useMemo(() => {
    const beforeDate = start ? format(addDays(start, -1), 'yyyy-MM-dd') : null;
    const afterDate = start ? format(addDays(end || start, 1), 'yyyy-MM-dd') : null;
    const map = new Map();
    days.forEach(d => {
      const dStr = format(d, 'yyyy-MM-dd');
      SHIFTS.forEach(s => {
        if (dStr === beforeDate && s.key === 'morning') return;
        if (dStr === afterDate && s.key === 'evening') return;
        const key = `${dStr}_${s.key}`;
        map.set(key, {
          date: d,
          shortDay: format(d, 'EEEE', { locale: he }),
          dateLabel: format(d, 'd/M', { locale: he }),
          shift: s.key,
          shiftLabel: s.label,
          count: 0,
          names: []
        });
      });
    });

    members.forEach(m => {
      if (!m.arrival_date || !m.arrival_time) return;
      try {
        const ad = parseISO(m.arrival_date);
        const h = parseInt(String(m.arrival_time).split(':')[0], 10);
        if (isNaN(h)) return;
        const shift = shiftOfHour(h);
        let bucketDate = ad;
        if (shift === 'evening' && h < 6) bucketDate = addDays(ad, -1);
        const p = map.get(`${format(bucketDate, 'yyyy-MM-dd')}_${shift}`);
        if (p) {
          p.count += (Number(m.adults) || 0) + (Number(m.children) || 0);
          p.names.push(m.user_name || 'משתמש');
        }
      } catch { /* ignore bad date */ }
    });

    return Array.from(map.values());
  }, [days, members]);

  const presentPoints = useMemo(() => {
    return points.map(p => {
      const slotDate = format(p.date, 'yyyy-MM-dd');
      const slotShift = p.shift;
      let present = 0;
      members.forEach(m => {
        if (!m.arrival_date) return;
        let arrDateStr, arrShift;
        try {
          arrDateStr = format(parseISO(m.arrival_date), 'yyyy-MM-dd');
          arrShift = m.arrival_time ? shiftOfHour(parseInt(String(m.arrival_time).split(':')[0], 10)) : 'morning';
        } catch { return; }
        if (isNaN(SHIFT_ORDER[arrShift])) return;
        const arrived =
          arrDateStr < slotDate ||
          (arrDateStr === slotDate && SHIFT_ORDER[arrShift] <= SHIFT_ORDER[slotShift]);
        if (!arrived) return;
        let depDateStr, depShift;
        if (m.departure_date) {
          try {
            depDateStr = format(parseISO(m.departure_date), 'yyyy-MM-dd');
            depShift = m.departure_time ? shiftOfHour(parseInt(String(m.departure_time).split(':')[0], 10)) : 'evening';
          } catch { return; }
        } else {
          const fallback = event?.end_date || event?.start_date;
          if (!fallback) { present += (Number(m.adults) || 0) + (Number(m.children) || 0); return; }
          try {
            depDateStr = format(parseISO(fallback), 'yyyy-MM-dd');
          } catch { return; }
          depShift = 'evening';
        }
        if (isNaN(SHIFT_ORDER[depShift])) return;
        const departed =
          depDateStr < slotDate ||
          (depDateStr === slotDate && SHIFT_ORDER[depShift] < SHIFT_ORDER[slotShift]);
        if (departed) return;
        present += (Number(m.adults) || 0) + (Number(m.children) || 0);
      });
      return { ...p, present };
    });
  }, [points, members, event]);

  const total = members.length;
  const arrived = members.filter(m => !!m.arrival_date).length;
  const notArrived = total - arrived;
  const totalAdults = members.reduce((s, m) => s + (Number(m.adults) || 0), 0);
  const totalChildren = members.reduce((s, m) => s + (Number(m.children) || 0), 0);
  const inRangeArrivals = points.reduce((s, p) => s + p.count, 0);
  const totalTimedArrivals = members.filter(m => m.arrival_date && m.arrival_time).length;
  const outOfRange = totalTimedArrivals - inRangeArrivals;

  const peak = points.reduce((best, p) => (p.count > (best?.count ?? -1) ? p : best), null);
  const peakLabel = peak && peak.count > 0 ? `${peak.shortDay} ${peak.shiftLabel}` : '—';
  const peakHint = peak && peak.count > 0 ? `${peak.count} הגעות` : 'אין הגעות';

  const rangeLabel = start && end
    ? `${format(start, 'EEEE', { locale: he })} – ${format(end, 'EEEE', { locale: he })}`
    : '';

  const renderTick = (props) => {
    const { x, y, index } = props;
    const entry = (tab === 'present' ? presentPoints : points)[index];
    if (!entry) return null;
    const val = tab === 'present' ? (entry.present ?? 0) : (entry.count ?? 0);
    const showDay = entry.shift === 'noon';
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={1} textAnchor="middle" fontSize={isMobile ? 12 : 10} fill="#0f766e" fontWeight={600}>{entry.shiftLabel}</text>
        {val > 0 && (
          <text x={0} y={isMobile ? 13 : 10} textAnchor="middle" fontSize={isMobile ? 14 : 12} fill="#0f766e" fontWeight={700}>{val}</text>
        )}
        {showDay && (
          <>
            <text x={0} y={isMobile ? 27 : 24} textAnchor="middle" fontSize={isMobile ? 12 : 11} fill="#475569" fontWeight={600}>{entry.shortDay}</text>
            <text x={0} y={isMobile ? 41 : 38} textAnchor="middle" fontSize={isMobile ? 12 : 11} fill="#475569">{entry.dateLabel}</text>
          </>
        )}
      </g>
    );
  };

  const metrics = [
    { label: 'שיא', value: peakLabel, hint: peakHint, icon: Trophy },
    { label: 'סה"כ נרשמו', value: total, hint: `${totalAdults} מבוגרים · ${totalChildren} ילדים`, icon: Users },
    { label: 'טרם הגיעו', value: notArrived, hint: 'ללא אישור הגעה', icon: UserX }
  ];

  return (
    <div className="space-y-4" dir="rtl">
      <div>
        <h2 className="text-xl font-bold text-stone-800">{event?.name || 'אירוע'}</h2>
        {rangeLabel && <p className="text-sm text-stone-500 mt-0.5">{rangeLabel}</p>}
      </div>

      <div className="inline-flex rounded-xl border border-stone-200 bg-white p-1">
        <button
          onClick={() => setTab('new')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'new' ? 'bg-teal-600 text-white' : 'text-stone-500 hover:bg-stone-50'}`}
        >
          הגעות חדשות
        </button>
        <button
          onClick={() => setTab('present')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'present' ? 'bg-teal-600 text-white' : 'text-stone-500 hover:bg-stone-50'}`}
        >
          נוכחים בפועל
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
        {totalTimedArrivals === 0 ? (
          <div className="py-16 text-center text-stone-400 text-sm">עדיין אין אישורי הגעה עם שעה.</div>
        ) : (
          <>
          <p className="text-xs text-stone-500 text-center mb-1 font-medium">משתתפים</p>
          <div className="overflow-x-auto -mx-1 px-1 pb-1">
          <div style={{ minWidth: Math.max((tab === 'present' ? presentPoints : points).length * (isMobile ? 70 : 58), 320) }}>
          <ResponsiveContainer width="100%" height={isMobile ? 320 : 300}>
            {tab === 'new' ? (
              <BarChart data={points} margin={{ top: 10, right: 10, left: 0, bottom: isMobile ? 56 : 50 }}>
                {!isMobile && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />}
                <XAxis dataKey="shiftLabel" tick={renderTick} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fontSize: isMobile ? 13 : 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} width={isMobile ? 30 : 36} />
                <Tooltip content={<SlotTooltip />} cursor={{ fill: '#0d948822' }} />
                <Bar
                  dataKey="count"
                  fill="#14b8a6"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={isMobile ? 40 : 56}
                  onClick={(d) => setActiveSlot(d?.payload || null)}
                  cursor="pointer"
                >
                  <LabelList
                    dataKey="count"
                    position="insideTop"
                    fill="#ffffff"
                    fontSize={isMobile ? 14 : 13}
                    fontWeight={700}
                    formatter={(v) => (Number(v) > 0 ? v : '')}
                  />
                </Bar>
              </BarChart>
            ) : (
              <AreaChart data={presentPoints} margin={{ top: 10, right: 10, left: 0, bottom: isMobile ? 56 : 50 }}>
                <defs>
                  <linearGradient id="tealFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                {!isMobile && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />}
                <XAxis dataKey="shiftLabel" tick={renderTick} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fontSize: isMobile ? 13 : 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} width={isMobile ? 30 : 36} />
                <Tooltip content={<SlotTooltip valueKey="present" valueLabel="נוכחים" />} cursor={{ stroke: '#14b8a6', strokeWidth: 1 }} />
                <Area type="stepAfter" dataKey="present" stroke="#0d9488" strokeWidth={isMobile ? 2.5 : 2} fill="url(#tealFill)" />
              </AreaChart>
            )}
          </ResponsiveContainer>
          </div>
          </div>
          </>
        )}

        {outOfRange > 0 && (
          <div className="mt-3 text-[11px] text-amber-600 text-center">
            הערה: {outOfRange} {outOfRange === 1 ? 'הגעה רשומה' : 'הגעות רשומות'} מחוץ לטווח תאריכי האירוע
          </div>
        )}

        {activeSlot && (
          <div className="mt-4 rounded-xl bg-teal-50 border border-teal-100 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-teal-800">
                {activeSlot.shortDay} · {activeSlot.shiftLabel} — {activeSlot.count} מגיעים
              </p>
              <button onClick={() => setActiveSlot(null)} className="text-xs text-teal-600 hover:underline">סגור</button>
            </div>
            {activeSlot.names.length === 0 ? (
              <p className="text-xs text-teal-700">אין הגעות במשבצת זו.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {activeSlot.names.map((n, i) => (
                  <span key={i} className="text-xs bg-white text-teal-700 rounded-full px-2.5 py-1 border border-teal-100">{n}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
        {metrics.map(m => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-bold text-stone-800 leading-tight break-words">{m.value}</div>
                <div className="text-xs text-stone-400">{m.label}</div>
                {m.hint && <div className="text-[11px] text-stone-400 mt-0.5">{m.hint}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}