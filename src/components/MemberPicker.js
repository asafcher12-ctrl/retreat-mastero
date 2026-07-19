import React from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { colors, shared } from '../lib/theme';
import { useEvent } from '../contexts/EventContext';

export function memberName(member) {
  return member?.profile?.display_name || member?.profile?.email || 'ללא שם';
}

// מודאל לבחירת אחראי מבין חברי האירוע
export default function MemberPicker({ visible, onClose, onSelect }) {
  const { members } = useEvent();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <Text style={shared.subtitle}>בחירת אחראי</Text>
          <FlatList
            data={members}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.option}
                onPress={() => {
                  onSelect(item.profile?.id ?? item.user_id);
                  onClose();
                }}
              >
                <Text style={shared.text}>{memberName(item)}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity
            style={styles.option}
            onPress={() => {
              onSelect(null);
              onClose();
            }}
          >
            <Text style={[shared.text, { color: colors.danger }]}>הסרת אחראי</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    maxHeight: 420,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  option: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
