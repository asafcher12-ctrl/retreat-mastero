import { base44 } from '@/api/base44Client';

// תוכן דמה לרשימת ציוד קבוצתי
export const DEMO_EQUIPMENT = [
  { name: 'אוהל משפחתי', category: 'group' },
  { name: 'יריעות / ברזנט', category: 'group' },
  { name: 'ערכת הדלקה + פחם', category: 'group' },
  { name: 'סיר גדול', category: 'group' },
  { name: 'גזייה + מחסנית גז', category: 'group' },
  { name: 'פנס גז / תאורת שטח', category: 'group' },
  { name: 'מקרר נייד + קרח', category: 'group' },
  { name: 'ערכת עזרה ראשונה', category: 'group' },
  { name: 'שולחן מתקפל', category: 'group' },
  { name: 'כיסאות מתקפלים', category: 'group' },
  { name: 'מיכל מי שתייה', category: 'group' },
  { name: 'ערכת כלים חד פעמיים', category: 'group' },
  { name: 'שקיות זבל', category: 'group' },
];

// תוכן דמה ללוח זמנים
export const DEMO_PROGRAM = [
  { title: 'הגעה והקמת מחנה', time: '16:00', order: 0, description: 'בניית אוהלים וסידור שטח' },
  { title: 'ארוחת ערב משותפת', time: '19:30', order: 1, description: 'בישול משותף על האש' },
  { title: 'מדורה ושירה', time: '21:00', order: 2, description: 'כיבוד קל ושירים' },
  { title: 'יוגת בוקר', time: '07:00', order: 3, description: 'מתיחות והתעוררות רכה' },
  { title: 'ארוחת בוקר', time: '08:30', order: 4 },
  { title: 'סדנת קשר / פעילות', time: '10:00', order: 5 },
  { title: 'זמן חופשי / ים', time: '12:00', order: 6 },
  { title: 'ארוחת צהריים', time: '13:30', order: 7 },
  { title: 'פעילות חברתית', time: '17:00', order: 8 },
];

export async function seedEventDemo(eventId) {
  await base44.entities.EquipmentItem.bulkCreate(
    DEMO_EQUIPMENT.map(item => ({ event_id: eventId, name: item.name, category: item.category, is_checked: false }))
  );
  await base44.entities.ProgramItem.bulkCreate(
    DEMO_PROGRAM.map(item => ({
      event_id: eventId,
      title: item.title,
      time: item.time,
      order: item.order,
      description: item.description || ''
    }))
  );
}