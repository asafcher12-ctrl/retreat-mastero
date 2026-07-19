import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, shared } from '../lib/theme';

// כניסה באימייל+סיסמה או בקישור קסם (magic link)
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin'); // signin | signup
  const [message, setMessage] = useState(null); // {type: 'error'|'info', text}
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setMessage(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setMessage({ type: 'error', text: e.message ?? 'שגיאה לא צפויה' });
    } finally {
      setBusy(false);
    }
  };

  const signIn = () =>
    run(async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw new Error('פרטי התחברות שגויים');
    });

  const signUp = () =>
    run(async () => {
      if (password.length < 6) throw new Error('סיסמה חייבת להכיל לפחות 6 תווים');
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      if (!data.session) {
        setMessage({ type: 'info', text: 'נשלח מייל אימות - בדקו את תיבת הדואר' });
      }
    });

  const magicLink = () =>
    run(async () => {
      if (!email.trim()) throw new Error('נא להזין אימייל');
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: Platform.OS === 'web' ? { emailRedirectTo: window.location.origin } : {},
      });
      if (error) throw error;
      setMessage({ type: 'info', text: 'קישור התחברות נשלח למייל - בדקו את תיבת הדואר' });
    });

  return (
    <KeyboardAvoidingView
      style={shared.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={[shared.container, { flexGrow: 1, justifyContent: 'center' }]}>
        <Text style={[shared.title, { textAlign: 'center', fontSize: 28 }]}>ריטריט כנרת 🏕️</Text>
        <Text style={[shared.mutedText, { textAlign: 'center', marginBottom: 24 }]}>
          ניהול קמפינג וטיולים
        </Text>

        <View style={shared.card}>
          <TextInput
            style={shared.input}
            placeholder="אימייל"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={shared.input}
            placeholder="סיסמה"
            placeholderTextColor={colors.muted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={mode === 'signin' ? signIn : signUp}
          />

          {message ? (
            <Text
              style={[
                shared.errorText,
                message.type === 'info' && { color: colors.success },
              ]}
            >
              {message.text}
            </Text>
          ) : null}

          {mode === 'signin' ? (
            <TouchableOpacity style={shared.button} onPress={signIn} disabled={busy}>
              <Text style={shared.buttonText}>{busy ? '...' : 'התחברות'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={shared.button} onPress={signUp} disabled={busy}>
              <Text style={shared.buttonText}>{busy ? '...' : 'הרשמה'}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={shared.buttonSecondary} onPress={magicLink} disabled={busy}>
            <Text style={shared.buttonSecondaryText}>שליחת קישור התחברות למייל</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setMessage(null);
            }}
          >
            <Text style={[shared.mutedText, { textAlign: 'center', marginTop: 8 }]}>
              {mode === 'signin' ? 'אין לכם חשבון? הרשמה' : 'יש לכם חשבון? התחברות'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
