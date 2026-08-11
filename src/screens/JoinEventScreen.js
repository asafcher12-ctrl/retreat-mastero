import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { colors, shared } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useEvent } from '../contexts/EventContext';

// מסך כניסה לאירוע: התחברות/הרשמה (למי שעדיין לא מחובר), הצטרפות עם קוד הזמנה, או יצירת אירוע
export default function JoinEventScreen() {
  const { user, profile, signOut } = useAuth();
  const { joinByCode, createEvent } = useEvent();
  const [code, setCode] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // מצב התחברות/הרשמה למי שעדיין אין לו session
  const [authMode, setAuthMode] = useState('signin'); // signin | signup
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMessage, setAuthMessage] = useState(null); // {type: 'error'|'info', text}
  const [authBusy, setAuthBusy] = useState(false);

  const canCreate = profile?.is_event_manager || profile?.is_super_admin;

  const submitAuth = async () => {
    setAuthMessage(null);
    if (!authEmail.trim()) {
      setAuthMessage({ type: 'error', text: 'נא להזין אימייל' });
      return;
    }
    setAuthBusy(true);
    try {
      if (authMode === 'signup') {
        if (authPassword.length < 6) {
          throw new Error('סיסמה חייבת להכיל לפחות 6 תווים');
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setAuthMessage({ type: 'info', text: 'נשלח מייל אימות - בדקו את תיבת הדואר' });
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (signInError) {
          if (signInError.message?.includes('not confirmed')) {
            throw new Error('האימייל עדיין לא אומת - לחצו על הקישור שנשלח אליכם במייל ונסו שוב');
          }
          throw new Error('פרטי התחברות שגויים');
        }
      }
    } catch (e) {
      setAuthMessage({ type: 'error', text: e.message ?? 'שגיאה לא צפויה' });
    } finally {
      setAuthBusy(false);
    }
  };

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

  if (!user) {
    const isSignup = authMode === 'signup';
    return (
      <ScrollView style={shared.screen} contentContainerStyle={[shared.container, { paddingTop: 48 }]}>
        <Text style={shared.title}>שלום 👋</Text>

        <View style={shared.card}>
          <Text style={shared.subtitle}>{isSignup ? 'הרשמה' : 'התחברות'}</Text>
          {isSignup ? (
            <Text style={[shared.mutedText, { marginBottom: 8 }]}>
              משתמש חדש נרשם כמנהל אירועים ויכול ליצור אירוע חדש או להצטרף עם קוד הזמנה.
            </Text>
          ) : null}
          <TextInput
            style={shared.input}
            placeholder="אימייל"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={authEmail}
            onChangeText={setAuthEmail}
          />
          <TextInput
            style={shared.input}
            placeholder="סיסמה"
            placeholderTextColor={colors.muted}
            secureTextEntry
            value={authPassword}
            onChangeText={setAuthPassword}
            onSubmitEditing={submitAuth}
          />
          {authMessage ? (
            <Text
              style={[
                shared.errorText,
                authMessage.type === 'info' && { color: colors.success },
              ]}
            >
              {authMessage.text}
            </Text>
          ) : null}
          <TouchableOpacity style={shared.button} onPress={submitAuth} disabled={authBusy}>
            <Text style={shared.buttonText}>{authBusy ? '...' : isSignup ? 'הרשמה' : 'התחברות'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setAuthMode(isSignup ? 'signin' : 'signup');
              setAuthMessage(null);
            }}
          >
            <Text style={[shared.mutedText, { textAlign: 'center' }]}>
              {isSignup ? 'כבר יש לכם חשבון? התחברות' : 'אין לכם חשבון? הרשמה כמנהל אירועים'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

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
