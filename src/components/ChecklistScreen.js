import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, shared } from '../lib/theme';
import { useAuth } from '../contexts/AuthContext';
import { useEvent } from '../contexts/EventContext';
import { useRealtimeList } from '../hooks/useRealtimeList';
import MemberPicker, { memberName } from './MemberPicker';

const CATEGORIES = ['מזון', 'שתייה', 'חד״פ', 'ציוד', 'אחר'];

function confirmDelete(onConfirm) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (window.confirm('למחוק את הפריט?')) onConfirm();
  } else {
    Alert.alert('מחיקה', 'למחוק את הפריט?', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'מחיקה', style: 'destructive', onPress: onConfirm },
    ]);
  }
}

// מסך רשימה משותף לקניות ולציוד: checkbox, קו חוצה, תיוג אחראי
export default function ChecklistScreen({ table, withCategories = false }) {
  const { user } = useAuth();
  const { event, members, membership, isManager } = useEvent();
  const { rows } = useRealtimeList(table, event?.id);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(null);
  const [pickerFor, setPickerFor] = useState(null); // item id שמחכה לבחירת אחראי
  const [error, setError] = useState('');

  const canEdit = membership?.role !== 'viewer';

  const nameById = useMemo(() => {
    const map = {};
    members.forEach((m) => {
      if (m.profile?.id) map[m.profile.id] = memberName(m);
    });
    return map;
  }, [members]);

  // לא מסומנים למעלה (לפי מיקום/קטגוריה), מסומנים בתחתית
  const sorted = useMemo(() => {
    const unchecked = rows.filter((r) => !r.is_checked);
    const checked = rows.filter((r) => r.is_checked);
    const byOrder = (a, b) =>
      a.position - b.position ||
      (a.category ?? '').localeCompare(b.category ?? '', 'he') ||
      a.created_at.localeCompare(b.created_at);
    return [...unchecked.sort(byOrder), ...checked.sort(byOrder)];
  }, [rows]);

  const addItem = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError('');
    const { error: err } = await supabase
      .from(table)
      .insert({ event_id: event.id, name: trimmed, category });
    if (err) setError(err.message);
    else {
      setName('');
      setCategory(null);
    }
  };

  const toggle = async (item) => {
    if (!canEdit) return;
    await supabase.from(table).update({ is_checked: !item.is_checked }).eq('id', item.id);
  };

  const assign = async (itemId, profileId) => {
    await supabase.from(table).update({ assigned_to: profileId }).eq('id', itemId);
  };

  const remove = (item) =>
    confirmDelete(async () => {
      await supabase.from(table).delete().eq('id', item.id);
    });

  // מנהל אירוע: מיון לפי קטגוריה + הסרת כפילויות (לפי שם מנורמל)
  const organize = async () => {
    const seen = new Map();
    const duplicates = [];
    [...rows]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .forEach((r) => {
        const key = r.name.trim().toLowerCase();
        if (seen.has(key)) duplicates.push(r.id);
        else seen.set(key, r);
      });
    if (duplicates.length > 0) {
      await supabase.from(table).delete().in('id', duplicates);
    }
    const kept = [...seen.values()].sort(
      (a, b) =>
        (a.category ?? 'ת״ת').localeCompare(b.category ?? 'ת״ת', 'he') ||
        a.name.localeCompare(b.name, 'he')
    );
    await Promise.all(
      kept.map((r, i) =>
        supabase.from(table).update({ position: i + 1 }).eq('id', r.id)
      )
    );
  };

  const renderItem = ({ item }) => {
    const canDelete = item.created_by === user?.id || isManager;
    return (
      <View style={[shared.card, styles.itemRow]}>
        <TouchableOpacity style={styles.checkbox} onPress={() => toggle(item)}>
          <View style={[styles.box, item.is_checked && styles.boxChecked]}>
            {item.is_checked ? <Text style={styles.boxMark}>✓</Text> : null}
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              shared.text,
              item.is_checked && { textDecorationLine: 'line-through', color: colors.muted },
            ]}
          >
            {item.name}
          </Text>
          <View style={[shared.row, { flexWrap: 'wrap' }]}>
            {item.category ? (
              <Text style={shared.mutedText}>{item.category} · </Text>
            ) : null}
            <TouchableOpacity onPress={() => canEdit && setPickerFor(item.id)}>
              <Text style={[shared.mutedText, { color: colors.primary }]}>
                {item.assigned_to
                  ? `אחראי: ${nameById[item.assigned_to] ?? '—'}`
                  : canEdit
                    ? '+ תיוג אחראי'
                    : 'ללא אחראי'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {canDelete ? (
          <TouchableOpacity onPress={() => remove(item)} style={styles.delete}>
            <Text style={{ color: colors.danger, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <View style={shared.screen}>
      <FlatList
        data={sorted}
        keyExtractor={(r) => r.id}
        renderItem={renderItem}
        contentContainerStyle={shared.container}
        ListHeaderComponent={
          <View>
            {canEdit ? (
              <View style={shared.card}>
                <TextInput
                  style={shared.input}
                  placeholder="פריט חדש..."
                  placeholderTextColor={colors.muted}
                  value={name}
                  onChangeText={setName}
                  onSubmitEditing={addItem}
                />
                {withCategories ? (
                  <View style={[shared.row, { flexWrap: 'wrap', marginBottom: 8 }]}>
                    {CATEGORIES.map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={[shared.chip, category === c && shared.chipActive]}
                        onPress={() => setCategory(category === c ? null : c)}
                      >
                        <Text style={[shared.chipText, category === c && shared.chipTextActive]}>
                          {c}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
                {error ? <Text style={shared.errorText}>{error}</Text> : null}
                <TouchableOpacity style={shared.button} onPress={addItem}>
                  <Text style={shared.buttonText}>הוספה</Text>
                </TouchableOpacity>
                {isManager && withCategories ? (
                  <TouchableOpacity style={shared.buttonSecondary} onPress={organize}>
                    <Text style={shared.buttonSecondaryText}>
                      מיון לפי קטגוריה + הסרת כפילויות
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <Text style={[shared.mutedText, { marginBottom: 12 }]}>מצב צפייה בלבד</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <Text style={[shared.mutedText, { textAlign: 'center', marginTop: 24 }]}>
            אין פריטים עדיין
          </Text>
        }
      />
      <MemberPicker
        visible={pickerFor !== null}
        onClose={() => setPickerFor(null)}
        onSelect={(profileId) => assign(pickerFor, profileId)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  itemRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 10,
  },
  checkbox: {
    marginLeft: 10,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: colors.primary,
  },
  boxMark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  delete: {
    marginRight: 8,
    padding: 4,
  },
});
