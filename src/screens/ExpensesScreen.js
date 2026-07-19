import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, shared } from '../lib/theme';
import { useAuth } from '../contexts/AuthContext';
import { useEvent } from '../contexts/EventContext';
import { useRealtimeList } from '../hooks/useRealtimeList';
import { memberName } from '../components/MemberPicker';

// הוצאות: כל משתמש מדווח סכום כללי ששילם; חלוקה הוגנת לפי לילות-אדם
export default function ExpensesScreen() {
  const { user } = useAuth();
  const { event, members, membership } = useEvent();
  const { rows: expenses } = useRealtimeList('expenses', event?.id);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const canEdit = membership?.role !== 'viewer';

  const nameById = useMemo(() => {
    const map = {};
    members.forEach((m) => {
      if (m.profile?.id) map[m.profile.id] = memberName(m);
    });
    return map;
  }, [members]);

  const summary = useMemo(() => {
    const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
    // סה"כ לילות-אדם: מי שלא ענה נספר כ-2 לילות
    const totalNights = members.reduce((s, m) => s + (m.nights ?? 2), 0);
    const perNight = totalNights > 0 ? total / totalNights : 0;

    const paidById = {};
    expenses.forEach((e) => {
      paidById[e.user_id] = (paidById[e.user_id] ?? 0) + Number(e.amount);
    });

    const balances = members.map((m) => {
      const nights = m.nights ?? 2;
      const share = nights * perNight;
      const paid = paidById[m.profile?.id] ?? 0;
      return { id: m.id, name: memberName(m), nights, share, paid, balance: paid - share };
    });

    return { total, totalNights, perNight, balances };
  }, [expenses, members]);

  const addExpense = async () => {
    const value = parseFloat(amount.replace(',', '.'));
    if (isNaN(value) || value <= 0) {
      setError('נא להזין סכום חיובי');
      return;
    }
    setError('');
    const { error: err } = await supabase
      .from('expenses')
      .insert({ event_id: event.id, amount: value, note: note.trim() || null });
    if (err) setError(err.message);
    else {
      setAmount('');
      setNote('');
    }
  };

  const removeExpense = async (exp) => {
    await supabase.from('expenses').delete().eq('id', exp.id);
  };

  const fmt = (n) => `₪${n.toFixed(0)}`;

  return (
    <View style={shared.screen}>
      <FlatList
        data={expenses}
        keyExtractor={(e) => e.id}
        contentContainerStyle={shared.container}
        ListHeaderComponent={
          <View>
            <View style={shared.card}>
              <Text style={shared.subtitle}>סיכום</Text>
              <View style={shared.row}>
                <Text style={[shared.text, { flex: 1 }]}>סה"כ הוצאות</Text>
                <Text style={[shared.text, { fontWeight: '700' }]}>{fmt(summary.total)}</Text>
              </View>
              <View style={shared.row}>
                <Text style={[shared.text, { flex: 1 }]}>עלות ללילה-אדם</Text>
                <Text style={shared.text}>{fmt(summary.perNight)}</Text>
              </View>
              <View style={styles.divider} />
              {summary.balances.map((b) => (
                <View key={b.id} style={shared.row}>
                  <Text style={[shared.mutedText, { flex: 1 }]}>
                    {b.name} ({b.nights} לילות)
                  </Text>
                  <Text
                    style={[
                      shared.mutedText,
                      { color: b.balance >= 0 ? colors.success : colors.danger },
                    ]}
                  >
                    שילם {fmt(b.paid)} · {b.balance >= 0 ? 'מקבל' : 'חייב'}{' '}
                    {fmt(Math.abs(b.balance))}
                  </Text>
                </View>
              ))}
            </View>

            {canEdit ? (
              <View style={shared.card}>
                <Text style={shared.subtitle}>הוספת הוצאה ששילמתי</Text>
                <TextInput
                  style={shared.input}
                  placeholder="סכום בש״ח"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
                <TextInput
                  style={shared.input}
                  placeholder="הערה (לא חובה): סופר, דלק..."
                  placeholderTextColor={colors.muted}
                  value={note}
                  onChangeText={setNote}
                />
                {error ? <Text style={shared.errorText}>{error}</Text> : null}
                <TouchableOpacity style={shared.button} onPress={addExpense}>
                  <Text style={shared.buttonText}>הוספה</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            <Text style={shared.subtitle}>כל ההוצאות</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[shared.card, shared.row, { paddingVertical: 10 }]}>
            <View style={{ flex: 1 }}>
              <Text style={shared.text}>
                {nameById[item.user_id] ?? '—'} · {fmt(Number(item.amount))}
              </Text>
              {item.note ? <Text style={shared.mutedText}>{item.note}</Text> : null}
            </View>
            {item.user_id === user?.id ? (
              <TouchableOpacity onPress={() => removeExpense(item)} style={{ padding: 4 }}>
                <Text style={{ color: colors.danger, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          <Text style={[shared.mutedText, { textAlign: 'center', marginTop: 12 }]}>
            אין הוצאות עדיין
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
});
