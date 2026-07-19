import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, shared } from '../lib/theme';
import { useEvent } from '../contexts/EventContext';
import { useRealtimeList } from '../hooks/useRealtimeList';
import MemberPicker, { memberName } from '../components/MemberPicker';

// תוכנית אמנותית: עריכה ע"י מנהל אירוע בלבד, תיוג אחראי לכל סעיף
export default function ProgramScreen() {
  const { event, members, isManager } = useEvent();
  const { rows } = useRealtimeList('program_items', event?.id, 'position');
  const [timeSlot, setTimeSlot] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pickerFor, setPickerFor] = useState(null);
  const [error, setError] = useState('');

  const nameById = useMemo(() => {
    const map = {};
    members.forEach((m) => {
      if (m.profile?.id) map[m.profile.id] = memberName(m);
    });
    return map;
  }, [members]);

  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          a.position - b.position ||
          (a.time_slot ?? '').localeCompare(b.time_slot ?? '') ||
          a.created_at.localeCompare(b.created_at)
      ),
    [rows]
  );

  const addItem = async () => {
    if (!title.trim()) return;
    setError('');
    const maxPos = Math.max(0, ...rows.map((r) => r.position));
    const { error: err } = await supabase.from('program_items').insert({
      event_id: event.id,
      title: title.trim(),
      time_slot: timeSlot.trim() || null,
      description: description.trim() || null,
      position: maxPos + 1,
    });
    if (err) setError(err.message);
    else {
      setTitle('');
      setTimeSlot('');
      setDescription('');
    }
  };

  const assign = async (itemId, profileId) => {
    await supabase.from('program_items').update({ assigned_to: profileId }).eq('id', itemId);
  };

  const remove = async (item) => {
    await supabase.from('program_items').delete().eq('id', item.id);
  };

  return (
    <View style={shared.screen}>
      <FlatList
        data={sorted}
        keyExtractor={(r) => r.id}
        contentContainerStyle={shared.container}
        ListHeaderComponent={
          isManager ? (
            <View style={shared.card}>
              <Text style={shared.subtitle}>הוספת סעיף לתוכנית</Text>
              <TextInput
                style={shared.input}
                placeholder="שעה (למשל 21:00 או ערב)"
                placeholderTextColor={colors.muted}
                value={timeSlot}
                onChangeText={setTimeSlot}
              />
              <TextInput
                style={shared.input}
                placeholder="כותרת *"
                placeholderTextColor={colors.muted}
                value={title}
                onChangeText={setTitle}
              />
              <TextInput
                style={[shared.input, { minHeight: 60 }]}
                placeholder="תיאור (לא חובה)"
                placeholderTextColor={colors.muted}
                multiline
                value={description}
                onChangeText={setDescription}
              />
              {error ? <Text style={shared.errorText}>{error}</Text> : null}
              <TouchableOpacity style={shared.button} onPress={addItem}>
                <Text style={shared.buttonText}>הוספה</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={[shared.mutedText, { marginBottom: 12 }]}>
              את התוכנית עורך מנהל האירוע
            </Text>
          )
        }
        renderItem={({ item }) => (
          <View style={shared.card}>
            <View style={shared.row}>
              {item.time_slot ? (
                <View style={[shared.chip, shared.chipActive, { marginLeft: 8 }]}>
                  <Text style={shared.chipTextActive}>{item.time_slot}</Text>
                </View>
              ) : null}
              <Text style={[shared.text, { flex: 1, fontWeight: '600' }]}>{item.title}</Text>
              {isManager ? (
                <TouchableOpacity onPress={() => remove(item)} style={{ padding: 4 }}>
                  <Text style={{ color: colors.danger, fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {item.description ? (
              <Text style={[shared.mutedText, { marginTop: 4 }]}>{item.description}</Text>
            ) : null}
            <TouchableOpacity
              onPress={() => isManager && setPickerFor(item.id)}
              disabled={!isManager}
            >
              <Text style={[shared.mutedText, { color: colors.primary, marginTop: 4 }]}>
                {item.assigned_to
                  ? `אחראי: ${nameById[item.assigned_to] ?? '—'}`
                  : isManager
                    ? '+ תיוג אחראי'
                    : 'ללא אחראי'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={[shared.mutedText, { textAlign: 'center', marginTop: 24 }]}>
            התוכנית עדיין ריקה
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
