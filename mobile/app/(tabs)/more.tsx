import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../_layout';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/lib/colors';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function MenuItem({ icon, label, onPress }: { icon: IconName; label: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.textSecondary} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

export default function MoreScreen() {
  const { signOut } = useAuth();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>CRM</Text>
        <MenuItem icon="analytics-outline" label="Reports" />
        <MenuItem icon="mail-outline" label="Sequences" />
        <MenuItem icon="flash-outline" label="Automations" />
        <MenuItem icon="notifications-outline" label="Notifications" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Account</Text>
        <MenuItem icon="settings-outline" label="Settings" />
        <MenuItem icon="help-circle-outline" label="Help & Support" />
        <MenuItem
          icon="log-out-outline"
          label="Sign Out"
          onPress={() => signOut()}
        />
      </View>

      <Text style={styles.version}>VIBE Mobile v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  section: { marginTop: 24 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  menuLabel: { flex: 1, color: colors.text, fontSize: 15 },
  version: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 20,
  },
});
