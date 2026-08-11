import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, shared } from '../lib/theme';

const BG = require('../../assets/login-bg.jpg');

// כניסה/הרשמה על רקע תמונת הכנרת: טופס + כניסה עם Google
export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 768;

  const [mode, setMode] = useState('signin'); // signup | signin
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(null); // {type: 'error'|'info', text}
  const [busy, setBusy] = useState(false);

  const isSignup = mode === 'signup';

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

  const submit = () =>
    run(async () => {
      if (!email.trim()) throw new Error('נא להזין אימייל');
      if (isSignup) {
        if (password.length < 6) throw new Error('סיסמה חייבת להכיל לפחות 6 תווים');
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (!data.session) {
          setMessage({ type: 'info', text: 'נשלח מייל אימות - בדקו את תיבת הדואר' });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          if (error.message?.includes('not confirmed')) {
            throw new Error('האימייל עדיין לא אומת - לחצו על הקישור שנשלח אליכם במייל ונסו שוב');
          }
          throw new Error('פרטי התחברות שגויים');
        }
      }
    });

  const magicLink = () =>
    run(async () => {
      if (!email.trim()) throw new Error('נא להזין אימייל ואז ללחוץ שוב');
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: Platform.OS === 'web' ? { emailRedirectTo: window.location.origin } : {},
      });
      if (error) throw error;
      setMessage({ type: 'info', text: 'קישור התחברות נשלח למייל - בדקו את תיבת הדואר' });
    });

  const googleSignIn = () =>
    run(async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: Platform.OS === 'web' ? { redirectTo: window.location.origin } : {},
      });
      if (error) throw error;
    });

  const form = (
    <View style={styles.formCol}>
      <TextInput
        style={styles.lineInput}
        placeholder="אימייל"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.lineInput}
        placeholder="סיסמה"
        placeholderTextColor={colors.muted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={submit}
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

      <TouchableOpacity style={styles.darkButton} onPress={submit} disabled={busy}>
        <Text style={styles.darkButtonText}>
          {busy ? '...' : isSignup ? 'הרשמה' : 'התחברות'}
        </Text>
      </TouchableOpacity>

      {!isSignup ? (
        <TouchableOpacity onPress={magicLink} disabled={busy}>
          <Text style={[styles.link, { textAlign: 'center', marginTop: 12 }]}>
            שליחת קישור התחברות למייל
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const social = (
    <View style={styles.socialCol}>
      <TouchableOpacity style={styles.socialButton} onPress={googleSignIn} disabled={busy}>
        <Text style={[styles.socialIcon, { color: '#DB4437' }]}>G</Text>
        <Text style={styles.socialText}>המשך עם Google</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 16 }}
        >
          <View style={styles.overlayCard}>
            <Text style={styles.bigTitle}>{isSignup ? 'הרשמה' : 'התחברות'}</Text>
            <TouchableOpacity
              onPress={() => {
                setMode(isSignup ? 'signin' : 'signup');
                setMessage(null);
              }}
            >
              <Text style={[shared.mutedText, { textAlign: 'center', marginBottom: 28 }]}>
                {isSignup ? 'כבר יש לכם חשבון? ' : 'אין לכם חשבון? '}
                <Text style={styles.link}>{isSignup ? 'התחברות' : 'הרשמה'}</Text>
              </Text>
            </TouchableOpacity>

            {wide ? (
              <View style={styles.wideRow}>
                {form}
                <View style={styles.dividerCol}>
                  <View style={styles.vLine} />
                  <Text style={[shared.mutedText, { marginVertical: 8 }]}>או</Text>
                  <View style={styles.vLine} />
                </View>
                {social}
              </View>
            ) : (
              <View>
                {form}
                <View style={styles.hDividerRow}>
                  <View style={styles.hLine} />
                  <Text style={[shared.mutedText, { marginHorizontal: 12 }]}>או</Text>
                  <View style={styles.hLine} />
                </View>
                {social}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  overlayCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    maxWidth: 920,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  bigTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  wideRow: {
    flexDirection: 'row-reverse',
    alignItems: 'stretch',
  },
  formCol: {
    flex: 1,
    paddingHorizontal: 16,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  socialCol: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  dividerCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  vLine: {
    flex: 1,
    width: 1,
    backgroundColor: colors.border,
  },
  hDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  hLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  lineInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    textAlign: 'right',
    marginBottom: 20,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  termsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  checkMark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  link: {
    color: '#2563eb',
  },
  darkButton: {
    backgroundColor: '#1f2937',
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 6,
  },
  darkButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  socialButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 13,
    marginBottom: 14,
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  socialIcon: {
    fontSize: 17,
    fontWeight: '800',
    marginLeft: 10,
  },
  socialText: {
    fontSize: 15,
    color: colors.text,
  },
});
