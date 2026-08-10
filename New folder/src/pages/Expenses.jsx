import React, { useEffect, useState, useMemo } from 'react';
import { useEvent } from '@/lib/event-context';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import ViewerButton from '@/components/ViewerButton';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import SpentByMember from '@/components/expenses/SpentByMember';

export default function Expenses() {
  const { currentEvent, currentMembers, user, canEdit } = useEvent();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paidBy, setPaidBy] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.Expense.filter({ event_id: currentEvent.id });
      setExpenses(list);
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentEvent.id]);

  const addExpense = async (e) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;
    const member = currentMembers.find(m => m.user_id === paidBy) || currentMembers.find(m => m.user_id === user?.id);
    await base44.entities.Expense.create({
      event_id: currentEvent.id,
      user_id: member?.user_id || user?.id,
      user_name: member?.user_name || user?.full_name || user?.email,
      amount: val,
      description: description.trim()
    });
    setAmount(''); setDescription(''); setPaidBy('');
    load();
  };

  const remove = async (exp) => {
    await base44.entities.Expense.delete(exp.id);
    load();
  };

  const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  const memberNights = useMemo(() => {
    return currentMembers.reduce((s, m) => {
      const nights = Number(m.nights) || 1;
      const adults = Number(m.adults ?? 1);
      const children = Number(m.children ?? 0);
      return s + nights * (adults + 0.5 * children);
    }, 0);
  }, [currentMembers]);

  const perPersonNight = memberNights > 0 ? total / memberNights : 0;

  const rows = useMemo(() => {
    return currentMembers.map(m => {
      const spent = expenses
        .filter(e => e.user_id === m.user_id)
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      const nights = Number(m.nights) || 1;
      const adults = Number(m.adults ?? 1);
      const children = Number(m.children ?? 0);
      const personNights = nights * (adults + 0.5 * children);
      const fairShare = personNights * perPersonNight;
      return { userId: m.user_id, name: m.user_name || 'משתמש', spent, nights, adults, children, personNights, fairShare, balance: spent - fairShare };
    }).sort((a, b) => b.spent - a.spent);
  }, [currentMembers, expenses, perPersonNight]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">הוצאות</h1>
        <p className="text-sm text-stone-400">כל משתתף מוסיף את הסכום ששילם — החלוקה לפי לילות-אדם</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-sm">
          <Wallet className="w-5 h-5 mb-2 opacity-80" />
          <div className="text-2xl font-bold">₪{total.toFixed(0)}</div>
          <div className="text-xs opacity-80">סה"כ הוצאות</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
          <div className="text-2xl font-bold text-stone-800">{memberNights}</div>
          <div className="text-xs text-stone-400">סה"כ לילות-אדם</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
          <div className="text-2xl font-bold text-emerald-700">₪{perPersonNight.toFixed(0)}</div>
          <div className="text-xs text-stone-400">חלוקה ללילה-אדם</div>
        </div>
      </div>

      <SpentByMember rows={rows} currentUserId={user?.id} />

      <form onSubmit={addExpense} className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
        <fieldset disabled={!canEdit} className="space-y-3 border-0 p-0 m-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input type="number" step="0.01" placeholder="סכום ב₪" value={amount} onChange={e => setAmount(e.target.value)} />
            <Input placeholder="תיאור (לא חובה)" value={description} onChange={e => setDescription(e.target.value)} />
            <select
              value={paidBy}
              onChange={e => setPaidBy(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-stone-700 focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">מי שילם? (אני)</option>
              {currentMembers.map(m => (
                <option key={m.user_id} value={m.user_id}>{m.user_name || 'משתמש'}</option>
              ))}
            </select>
            <ViewerButton canEdit={canEdit} type="submit" className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 ml-1" /> הוסף הוצאה
            </ViewerButton>
          </div>
        </fieldset>
      </form>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100">
          <h2 className="font-bold text-stone-800">ריכוז הוצאות</h2>
          <p className="text-xs text-stone-400">מאזן הוגן לפי לילות-אדם — מי שילם יותר מחלקו מקבל החזר</p>
        </div>
        {rows.length === 0 ? (
          <div className="p-8 text-center text-stone-400 text-sm">אין משתתפים להציג.</div>
        ) : (
          <>
            <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-stone-50 text-[11px] font-semibold text-stone-400">
              <div className="col-span-4">משתתף</div>
              <div className="col-span-2 text-center">לילות-אדם</div>
              <div className="col-span-2 text-center">שילם</div>
              <div className="col-span-2 text-center">חלקו</div>
              <div className="col-span-2 text-center">מאזן</div>
            </div>
            <div className="divide-y divide-stone-100">
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                  <div className="col-span-4">
                    <div className="text-sm font-medium text-stone-700">{r.name}</div>
                    {(r.adults > 0 || r.children > 0) && (
                      <div className="text-[11px] text-stone-400">{r.adults} מבוגרים · {r.children} ילדים</div>
                    )}
                  </div>
                  <div className="col-span-2 text-center text-sm text-stone-500">
                    {Number.isInteger(r.personNights) ? r.personNights : r.personNights.toFixed(1)}
                  </div>
                  <div className="col-span-2 text-center text-sm text-stone-700">₪{r.spent.toFixed(0)}</div>
                  <div className="col-span-2 text-center text-sm text-stone-500">₪{r.fairShare.toFixed(0)}</div>
                  <div className={`col-span-2 text-center text-sm font-semibold flex items-center justify-center gap-1 ${
                    r.balance >= 0 ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    {r.balance >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {r.balance >= 0 ? '+' : ''}{r.balance.toFixed(0)} ₪
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm divide-y divide-stone-100">
        {loading ? (
          <div className="p-6 text-center text-stone-400 text-sm">טוען...</div>
        ) : expenses.length === 0 ? (
          <div className="p-8 text-center text-stone-400 text-sm">אין הוצאות עדיין.</div>
        ) : expenses.map(exp => (
          <div key={exp.id} className="flex items-center justify-between p-3.5 group">
            <div>
              <p className="text-sm font-medium text-stone-700">₪{Number(exp.amount).toFixed(0)}</p>
              <p className="text-[11px] text-stone-400">
                {exp.user_name || 'משתמש'}{exp.description ? ` · ${exp.description}` : ''}
              </p>
            </div>
            {canEdit && (exp.user_id === user?.id || exp.created_by_id === user?.id) && (
              <button onClick={() => remove(exp)} className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}