import React, { useEffect, useState } from 'react';
import { useEvent } from '@/lib/event-context';
import { base44 } from '@/api/base44Client';
import { Tent, Users, Moon, Clock, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import ArrivalsDashboard from '@/components/participants/ArrivalsDashboard';
import PersonalEquipmentTable from '@/components/home/PersonalEquipmentTable';
import PendingItemsSummary from '@/components/home/PendingItemsSummary';
import { useToast } from '@/components/ui/use-toast';

export default function Home() {
  const { currentEvent, currentMembers, user } = useEvent();
  const { toast } = useToast();
  const [members, setMembers] = useState(currentMembers);

  useEffect(() => {
    let active = true;
    base44.entities.EventMember.filter({ event_id: currentEvent.id }).then(m => {
      if (active) setMembers(m);
    }).catch(() => {});
    return () => { active = false; };
  }, [currentEvent.id]);

  useEffect(() => {
    try {
      if (localStorage.getItem('just_registered') === '1') {
      localStorage.removeItem('just_registered');
      const t = toast({
        title: 'ברוכים הבאים!',
        description: 'אם השם שלך רשום פעמיים, אנא מחק את ההרשמה הקודמת בעמוד משתתפים.',
      });
      setTimeout(() => t.dismiss(), 10000);
      }
    } catch (e) {}
  }, []);

  const oneNight = members.filter(m => Number(m.nights) === 1).length;
  const twoNights = members.filter(m => Number(m.nights) === 2).length;

  const arrivedConfirmed = members.filter(m => m.arrival_date).length;

  const sumAdults = (arr) => arr.reduce((s, m) => s + (Number(m.adults) || 0), 0);
  const sumChildren = (arr) => arr.reduce((s, m) => s + (Number(m.children) || 0), 0);

  const oneNightArr = members.filter(m => Number(m.nights) === 1);
  const twoNightsArr = members.filter(m => Number(m.nights) === 2);
  const arrivedArr = members.filter(m => m.arrival_date);

  const stats = [
    { label: 'נרשמים', value: members.length, sub: `${sumAdults(members)} מבוגרים · ${sumChildren(members)} ילדים`, icon: Users, color: 'emerald' },
    { label: 'לילה אחד', value: oneNight, sub: `${sumAdults(oneNightArr)} מבוגרים · ${sumChildren(oneNightArr)} ילדים`, icon: Moon, color: 'sky' },
    { label: 'שני לילות', value: twoNights, sub: `${sumAdults(twoNightsArr)} מבוגרים · ${sumChildren(twoNightsArr)} ילדים`, icon: Moon, color: 'indigo' },
    { label: 'אישרו הגעה', value: arrivedConfirmed, sub: `${sumAdults(arrivedArr)} מבוגרים · ${sumChildren(arrivedArr)} ילדים`, icon: Clock, color: 'amber' }
  ];

  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600',
    sky: 'bg-sky-50 text-sky-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    amber: 'bg-amber-50 text-amber-600'
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">{currentEvent.name}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-stone-500">
          {currentEvent.location && (
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{currentEvent.location}</span>
          )}
          {currentEvent.start_date && <span>{currentEvent.start_date}{currentEvent.end_date ? ` – ${currentEvent.end_date}` : ''}</span>}
        </div>
        {currentEvent.description && <p className="text-stone-500 text-sm mt-2">{currentEvent.description}</p>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${colorMap[s.color]}`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="text-2xl font-bold text-stone-800">{s.value}</div>
              <div className="text-xs text-stone-400">{s.label}</div>
              <div className="text-[11px] text-stone-500 mt-1">{s.sub}</div>
            </div>
          );
        })}
      </div>

      <ArrivalsDashboard members={members} event={currentEvent} />

      <PendingItemsSummary />

      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
        <h2 className="font-bold text-stone-800 mb-3">רשימת משתתפים</h2>
        {members.length === 0 ? (
          <p className="text-sm text-stone-400">אין נרשמים עדיין.</p>
        ) : (
          <div className="divide-y divide-stone-100">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold">
                    {(m.user_name || '?').trim().charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-700">
                      {m.user_name || 'משתמש'}{m.user_id === user?.id && ' (את/ה)'}
                    </p>
                    <p className="text-[11px] text-stone-400">
                      {m.role === 'event_manager' ? 'מנהל אירוע' : m.role === 'viewer' ? 'צופה' : 'כוח חלוץ'}
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  {m.arrival_time ? (
                    <span className="text-xs text-stone-500">{m.arrival_time}</span>
                  ) : m.arrival_date ? (
                    <span className="text-xs text-stone-500">{m.arrival_date}</span>
                  ) : (
                    <span className="text-[11px] text-stone-300">טרם אישר</span>
                  )}
                  {Number(m.nights) === 2 && <span className="text-[11px] text-indigo-400 block">2 לילות</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PersonalEquipmentTable />
    </div>
  );
}