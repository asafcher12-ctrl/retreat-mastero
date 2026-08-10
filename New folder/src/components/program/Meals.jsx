import React, { useEffect, useState } from 'react';
import { useEvent } from '@/lib/event-context';
import { base44 } from '@/api/base44Client';
import ViewerButton from '@/components/ViewerButton';
import { Input } from '@/components/ui/input';
import { Plus, X, Utensils, Coffee, Sun, Moon } from 'lucide-react';

const MEAL_TYPES = [
  { key: 'breakfast', label: 'ארוחת בוקר', icon: Coffee, color: 'amber' },
  { key: 'lunch', label: 'ארוחת צהריים', icon: Sun, color: 'sky' },
  { key: 'dinner', label: 'ארוחת ערב', icon: Moon, color: 'indigo' }
];

const colorMap = {
  amber: 'bg-amber-50 text-amber-600',
  sky: 'bg-sky-50 text-sky-600',
  indigo: 'bg-indigo-50 text-indigo-600'
};

const DEFAULT_MEAL_TEMPLATE = {
  breakfast: { description: 'פירות העונה', ingredients: ['אבטיח', 'מלון', 'ליצי'] },
  lunch: { description: 'על האש ילדים', ingredients: ['כנפיים', 'נקנקיות', 'תפוח אדמה'] },
  dinner: { description: 'על האש בוגרים', ingredients: ['פיקניה', 'אנטריקוט', 'פטרוזיליה'] }
};

function getDays(event) {
  if (!event?.start_date) return [];
  const start = new Date(event.start_date + 'T00:00:00');
  const end = event.end_date ? new Date(event.end_date + 'T00:00:00') : start;
  if (isNaN(start) || isNaN(end)) return [];
  const days = [];
  const d = new Date(start);
  while (d <= end) {
    days.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric' });
}

export default function Meals() {
  const { currentEvent, canEdit } = useEvent();
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.Meal.filter({ event_id: currentEvent.id });
      setMeals(list);
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentEvent.id]);

  const days = getDays(currentEvent);

  const getMeal = (date, mealType) => meals.find(m => m.date === date && m.meal_type === mealType);

  const getDraft = (date, mealType) => {
    const key = `${date}|${mealType}`;
    if (drafts[key]) return drafts[key];
    const meal = getMeal(date, mealType);
    if (meal) return { description: meal.description || '', ingredients: meal.ingredients || [], newIngredient: '' };
    const tpl = DEFAULT_MEAL_TEMPLATE[mealType];
    return { description: tpl.description, ingredients: [...tpl.ingredients], newIngredient: '' };
  };

  const setDraft = (date, mealType, patch) => {
    const key = `${date}|${mealType}`;
    setDrafts(d => ({ ...d, [key]: { ...getDraft(date, mealType), ...patch } }));
  };

  const addIngredient = (date, mealType) => {
    const draft = getDraft(date, mealType);
    const val = draft.newIngredient.trim();
    if (!val) return;
    if (draft.ingredients.some(i => i.trim().toLowerCase() === val.toLowerCase())) {
      setDraft(date, mealType, { newIngredient: '' });
      return;
    }
    setDraft(date, mealType, { ingredients: [...draft.ingredients, val], newIngredient: '' });
  };

  const removeIngredient = (date, mealType, idx) => {
    const draft = getDraft(date, mealType);
    setDraft(date, mealType, { ingredients: draft.ingredients.filter((_, i) => i !== idx) });
  };

  const save = async (date, mealType) => {
    const draft = getDraft(date, mealType);
    const existing = getMeal(date, mealType);
    const payload = { description: draft.description.trim(), ingredients: draft.ingredients };
    if (existing) {
      await base44.entities.Meal.update(existing.id, payload);
    } else {
      await base44.entities.Meal.create({ event_id: currentEvent.id, date, meal_type: mealType, ...payload });
    }
    // sync new ingredients to shopping list
    if (draft.ingredients.length > 0) {
      try {
        const existingShopping = await base44.entities.ShoppingItem.filter({ event_id: currentEvent.id });
        const names = new Set(existingShopping.map(i => (i.name || '').trim().toLowerCase()));
        const toAdd = draft.ingredients.filter(ing => !names.has(ing.trim().toLowerCase()));
        if (toAdd.length > 0) {
          await base44.entities.ShoppingItem.bulkCreate(toAdd.map(name => ({
            event_id: currentEvent.id,
            name: name.trim(),
            category: 'ארוחות'
          })));
        }
      } catch (e) {}
    }
    setDrafts(d => { const copy = { ...d }; delete copy[`${date}|${mealType}`]; return copy; });
    load();
  };

  if (loading) {
    return <div className="p-6 text-center text-stone-400 text-sm">טוען ארוחות...</div>;
  }

  if (days.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm text-center text-stone-400 text-sm">
        הגדירו תאריכי אירוע כדי לתכנן ארוחות.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {days.map(date => (
        <div key={date} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-stone-50 border-b border-stone-100 flex items-center gap-2">
            <Utensils className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-stone-800 text-sm">{formatDateLabel(date)}</h3>
          </div>
          <div className="divide-y divide-stone-100">
            {MEAL_TYPES.map(mt => {
              const Icon = mt.icon;
              const draft = getDraft(date, mt.key);
              const meal = getMeal(date, mt.key);
              const baseline = meal
                ? { description: meal.description || '', ingredients: meal.ingredients || [] }
                : { description: DEFAULT_MEAL_TEMPLATE[mt.key].description, ingredients: DEFAULT_MEAL_TEMPLATE[mt.key].ingredients };
              const isDirty = JSON.stringify(draft.ingredients) !== JSON.stringify(baseline.ingredients) || draft.description !== baseline.description;
              return (
                <div key={mt.key} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colorMap[mt.color]}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-stone-700">{mt.label}</span>
                  </div>
                  <fieldset disabled={!canEdit} className="space-y-2 border-0 p-0 m-0">
                    <Input
                      placeholder="תיאור הארוחה (לא חובה)"
                      value={draft.description}
                      onChange={e => setDraft(date, mt.key, { description: e.target.value })}
                    />
                    {draft.ingredients.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {draft.ingredients.map((ing, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 rounded-full px-2.5 py-1 text-xs">
                            {ing}
                            {canEdit && (
                              <button type="button" onClick={() => removeIngredient(date, mt.key, idx)} className="text-emerald-400 hover:text-red-500">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                    {canEdit && (
                      <div className="flex gap-2">
                        <Input
                          placeholder="הוסף מצרך ולחץ Enter"
                          value={draft.newIngredient}
                          onChange={e => setDraft(date, mt.key, { newIngredient: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addIngredient(date, mt.key); } }}
                        />
                        <ViewerButton canEdit={canEdit} type="button" variant="outline" size="sm" onClick={() => addIngredient(date, mt.key)}>
                          <Plus className="w-4 h-4" />
                        </ViewerButton>
                      </div>
                    )}
                    {canEdit && isDirty && (
                      <ViewerButton canEdit={canEdit} type="button" size="sm" onClick={() => save(date, mt.key)} className="bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="w-4 h-4 ml-1" /> שמור ארוחה
                      </ViewerButton>
                    )}
                  </fieldset>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}