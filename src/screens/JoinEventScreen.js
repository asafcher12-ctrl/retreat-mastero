import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { colors, shared } from '../lib/theme';
import { useAuth } from '../contexts/AuthContext';
import { useEvent } from '../contexts/EventContext';

// מסך כניסה לאירוע: הצטרפות עם קוד הזמנה, או יצירת אירוע (מנהלי אירועים בלבד)
export default function JoinEventScreen() {
  const { profile, signOut } = useAuth();
  const { joinByCode, createEvent } = useEvent();
  const [code, setCode] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const canCreate = profile?.is_event_manager || profile?.is_super_admin;

  const join = async () => {
    if (!code.trim()) return;
    setError('');
    setBusy(true);
    try {
      await joinByCode(code);
    } catch (e) {
      setError(e.message?.includes('לא נמצא') ? 'קוד הזמנה לא נמצא' : e.message);
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    if (!eventName.trim()) return;
    if (eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(eventDate.trim())) {
      setError('תאריך בפורמט YYYY-MM-DD');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await createEvent(eventName.trim(), eventDate.trim() || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={shared.screen} contentContainerStyle={[shared.container, { paddingTop: 48 }]}>
      <Text style={shared.title}>שלום {profile?.display_name ?? ''} 👋</Text>

      <View style={shared.card}>
        <Text style={shared.subtitle}>הצטרפות לאירוע</Text>
        <Text style={[shared.mutedText, { marginBottom: 8 }]}>
          קיבלתם קישור הזמנה? הזינו את הקוד:
        </Text>
        <TextInput
          style={shared.input}
          placeholder="קוד הזמנה"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          value={code}
          onChangeText={setCode}
          onSubmitEditing={join}
        />
        <TouchableOpacity style={shared.button} onPress={join} disabled={busy}>
          <Text style={shared.buttonText}>הצטרפות</Text>
        </TouchableOpacity>
      </View>

      {canCreate ? (
        <View style={shared.card}>
          <Text style={shared.subtitle}>יצירת אירוע חדש</Text>
          <TextInput
            style={shared.input}
            placeholder="שם האירוע (למשל: ריטריט כנרת 2026)"
            placeholderTextColor={colors.muted}
            value={eventName}
            onChangeText={setEventName}
          />
          <TextInput
            style={shared.input}
            placeholder="תאריך התחלה YYYY-MM-DD (לא חובה)"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            value={eventDate}
            onChangeText={setEventDate}
          />
          <TouchableOpacity style={shared.button} onPress={create} disabled={busy}>
            <Text style={shared.buttonText}>יצירת אירוע</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={[shared.mutedText, { marginBottom: 12 }]}>
          יצירת אירוע חדש זמינה למנהלי אירועים בלבד. אין לכם קוד? פנו למנהל האירוע.
        </Text>
      )}

      {error ? <Text style={shared.errorText}>{error}</Text> : null}

      <TouchableOpacity onPress={signOut}>
        <Text style={[shared.mutedText, { textAlign: 'center', marginTop: 16 }]}>התנתקות</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
