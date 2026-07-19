import React, { useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, shared } from '../lib/theme';
import { useAuth } from '../contexts/AuthContext';
import { useEvent } from '../contexts/EventContext';
import { memberName } from '../components/MemberPicker';

// דף הבית: מספר נרשמים, חלוקת לילות, גרף הגעות לפי שעה
export default function HomeScreen() {
  const { signOut } = useAuth();
  const { event, members, membership, isManager, refreshMembers } = useEvent();

  // עדכון חי כשחברים חדשים נרשמים או מעדכנים הגעה
  useEffect(() => {
    if (!event?.id) return;
    const channel = supabase
      .channel(`event_members:${event.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_members', filter: `event_id=eq.${event.id}` },
        () => refreshMembers()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [event?.id, refreshMembers]);

  const stats = useMemo(() => {
    const oneNight = members.filter((m) => m.nights === 1).length;
    const twoNights = members.filter((m) => m.nights === 2).length;
    const noAnswer = members.length - oneNight - twoNights;

    // גרף הגעות לפי שעה
    const byHour = {};
    members.forEach((m) => {
      if (!m.arrival_at) return;
      const d = new Date(m.arrival_at);
      const key = `${d.getHours()}:00`;
      byHour[key] = (byHour[key] ?? 0) + 1;
    });
    const hours = Object.entries(byHour)
      .map(([label, count]) => ({ label, count, hour: parseInt(label, 10) }))
      .sort((a, b) => a.hour - b.hour);
    const max = Math.max(1, ...hours.map((h) => h.count));
    return { oneNight, twoNights, noAnswer, hours, max };
  }, [members]);

  const arrivalsList = useMemo(
    () =>
      [...members]
        .filter((m) => m.arrival_at)
        .sort((a, b) => a.arrival_at.localeCompare(b.arrival_at)),
    [members]
  );

  const fmtArrival = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString('he-IL', {
      weekday: 'short',
      day: 'numeric',
      month: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ScrollView style={shared.screen} contentContainerStyle={shared.container}>
      <Text style={shared.title}>{event?.name}</Text>

      <View style={[shared.row, { marginBottom: 12 }]}>
        <View style={[shared.card, styles.stat]}>
          <Text style={styles.statNum}>{members.length}</Text>
          <Text style={shared.mutedText}>נרשמים</Text>
        </View>
        <View style={[shared.card, styles.stat]}>
          <Text style={styles.statNum}>{stats.twoNights}</Text>
          <Text style={shared.mutedText}>שני לילות</Text>
        </View>
        <View style={[shared.card, styles.stat]}>
          <Text style={styles.statNum}>{stats.oneNight}</Text>
          <Text style={shared.mutedText}>לילה אחד</Text>
        </View>
      </View>
      {stats.noAnswer > 0 ? (
        <Text style={[shared.mutedText, { marginBottom: 12 }]}>
          {stats.noAnswer} עדיין לא אישרו הגעה
        </Text>
      ) : null}

      <View style={shared.card}>
        <Text style={shared.subtitle}>הגעות לפי שעה</Text>
        {stats.hours.length === 0 ? (
          <Text style={shared.mutedText}>אין עדיין אישורי הגעה</Text>
        ) : (
          <View style={styles.chart}>
            {stats.hours.map((h) => (
              <View key={h.label} style={styles.barCol}>
                <Text style={shared.mutedText}>{h.count}</Text>
                <View
                  style={[
                    styles.bar,
                    { height: Math.max(8, (h.count / stats.max) * 120) },
                  ]}
                />
                <Text style={[shared.mutedText, { fontSize: 11 }]}>{h.label}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={shared.card}>
        <Text style={shared.subtitle}>מי מגיע מתי</Text>
        {arrivalsList.map((m) => (
          <View key={m.id} style={[shared.row, styles.memberRow]}>
            <Text style={[shared.text, { flex: 1 }]}>
              {memberName(m)}
              {m.role === 'manager' ? ' ⭐' : ''}
            </Text>
            <Text style={shared.mutedText}>
              {fmtArrival(m.arrival_at)} · {m.nights === 1 ? 'לילה אחד' : 'שני לילות'}
            </Text>
          </View>
        ))}
        {arrivalsList.length === 0 ? (
          <Text style={shared.mutedText}>עדיין אין אישורי הגעה</Text>
        ) : null}
      </View>

      {isManager ? (
        <View style={shared.card}>
          <Text style={shared.subtitle}>קישור הזמנה</Text>
          <Text style={[shared.mutedText, { marginBottom: 6 }]}>
            שתפו את הקוד עם המשתתפים - הם מזינים אותו אחרי ההרשמה:
          </Text>
          <Text selectable style={styles.inviteCode}>
            {event?.invite_code}
          </Text>
        </View>
      ) : null}

      <Text style={[shared.mutedText, { textAlign: 'center', marginTop: 4 }]}>
        התפקיד שלי: {membership?.role === 'manager' ? 'מנהל אירוע' : membership?.role === 'viewer' ? 'צופה' : 'כוח חלוץ'}
      </Text>
      <TouchableOpacity onPress={signOut}>
        <Text style={[shared.mutedText, { textAlign: 'center', marginTop: 12, marginBottom: 24 }]}>
          התנתקות
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  stat: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
    marginBottom: 0,
  },
  statNum: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  chart: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    minHeight: 160,
    paddingTop: 8,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 22,
    backgroundColor: colors.primary,
    borderRadius: 6,
    marginVertical: 4,
  },
  memberRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  inviteCode: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primaryDark,
    textAlign: 'center',
    letterSpacing: 2,
    paddingVertical: 8,
  },
});
