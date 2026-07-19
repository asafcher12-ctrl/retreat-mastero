import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { colors, shared } from '../lib/theme';
import { useEvent } from '../contexts/EventContext';

// אישור הגעה: תאריך + שעה משוערת + מספר לילות (נדרש בהרשמה ראשונה לאירוע)
export default function ArrivalScreen() {
  const { event, updateArrival } = useEvent();
  const [date, setDate] = useState(event?.starts_at ?? '');
  const [time, setTime] = useState('');
  const [nights, setNights] = useState(2);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setError('');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      setError('תאריך בפורמט YYYY-MM-DD, למשל 2026-08-14');
      return;
    }
    if (!/^\d{1,2}:\d{2}$/.test(time.trim())) {
      setError('שעה בפורמט HH:MM, למשל 16:30');
      return;
    }
    const iso = `${date.trim()}T${time.trim().padStart(5, '0')}:00`;
    const parsed = new Date(iso);
    if (isNaN(parsed.getTime())) {
      setError('תאריך או שעה לא חוקיים');
      return;
    }
    setBusy(true);
    try {
      await updateArrival({ arrivalAt: parsed.toISOString(), nights });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={shared.screen} contentContainerStyle={[shared.container, { paddingTop: 48 }]}>
      <Text style={shared.title}>אישור הגעה - {event?.name}</Text>
      <View style={shared.card}>
        <Text style={[shared.mutedText, { marginBottom: 12 }]}>
          כדי שנדע לתכנן - מתי בערך מגיעים וכמה לילות נשארים?
        </Text>
        <Text style={shared.text}>תאריך הגעה</Text>
        <TextInput
          style={shared.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          value={date}
          onChangeText={setDate}
        />
        <Text style={shared.text}>שעת הגעה משוערת</Text>
        <TextInput
          style={shared.input}
          placeholder="HH:MM"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          value={time}
          onChangeText={setTime}
        />
        <Text style={[shared.text, { marginBottom: 8 }]}>כמה לילות?</Text>
        <View style={[shared.row, { marginBottom: 12 }]}>
          {[1, 2].map((n) => (
            <TouchableOpacity
              key={n}
              style={[shared.chip, nights === n && shared.chipActive, { paddingHorizontal: 20, paddingVertical: 8 }]}
              onPress={() => setNights(n)}
            >
              <Text style={[shared.chipText, nights === n && shared.chipTextActive]}>
                {n === 1 ? 'לילה אחד' : 'שני לילות'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {error ? <Text style={shared.errorText}>{error}</Text> : null}
        <TouchableOpacity style={shared.button} onPress={save} disabled={busy}>
          <Text style={shared.buttonText}>{busy ? '...' : 'אישור הגעה'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
