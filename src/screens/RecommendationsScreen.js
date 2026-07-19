import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Linking,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, shared } from '../lib/theme';
import { useAuth } from '../contexts/AuthContext';
import { useEvent } from '../contexts/EventContext';
import { useRealtimeList } from '../hooks/useRealtimeList';

// המלצות קנייה: שם מוצר + תיאור + קישור חיצוני (כולל לינקים אפילייט)
export default function RecommendationsScreen() {
  const { user } = useAuth();
  const { event, membership, isManager } = useEvent();
  const { rows } = useRealtimeList('recommendations', event?.id);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const canEdit = membership?.role !== 'viewer';

  const addRec = async () => {
    if (!name.trim()) return;
    let link = url.trim();
    if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
    setError('');
    const { error: err } = await supabase.from('recommendations').insert({
      event_id: event.id,
      name: name.trim(),
      description: description.trim() || null,
      url: link || null,
    });
    if (err) setError(err.message);
    else {
      setName('');
      setDescription('');
      setUrl('');
    }
  };

  const remove = async (item) => {
    await supabase.from('recommendations').delete().eq('id', item.id);
  };

  return (
    <View style={shared.screen}>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={shared.container}
        ListHeaderComponent={
          canEdit ? (
            <View style={shared.card}>
              <Text style={shared.subtitle}>המלצה חדשה</Text>
              <TextInput
                style={shared.input}
                placeholder="שם המוצר *"
                placeholderTextColor={colors.muted}
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={shared.input}
                placeholder="תיאור קצר"
                placeholderTextColor={colors.muted}
                value={description}
                onChangeText={setDescription}
              />
              <TextInput
                style={shared.input}
                placeholder="קישור לרכישה"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                keyboardType="url"
                value={url}
                onChangeText={setUrl}
              />
              {error ? <Text style={shared.errorText}>{error}</Text> : null}
              <TouchableOpacity style={shared.button} onPress={addRec}>
                <Text style={shared.buttonText}>הוספה</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={shared.card}>
            <View style={shared.row}>
              <Text style={[shared.text, { flex: 1, fontWeight: '600' }]}>{item.name}</Text>
              {item.created_by === user?.id || isManager ? (
                <TouchableOpacity onPress={() => remove(item)} style={{ padding: 4 }}>
                  <Text style={{ color: colors.danger, fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {item.description ? (
              <Text style={[shared.mutedText, { marginTop: 4 }]}>{item.description}</Text>
            ) : null}
            {item.url ? (
              <TouchableOpacity onPress={() => Linking.openURL(item.url)}>
                <Text style={[shared.text, { color: colors.primary, marginTop: 6 }]}>
                  לצפייה במוצר ↗
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          <Text style={[shared.mutedText, { textAlign: 'center', marginTop: 24 }]}>
            אין המלצות עדיין
          </Text>
        }
      />
    </View>
  );
}
