import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, ActivityIndicator, RefreshControl } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/lib/colors';
import { useApiFetch } from '../../src/lib/api';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface Activity {
  id: string;
  type: string;
  description: string | null;
  createdAt: string;
}

interface Deal {
  id: string;
  name: string;
  value: number | null;
  status: string;
  stage: { name: string } | null;
}

interface ContactDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  source: string | null;
  company: string | null;
  createdAt: string;
  activities: Activity[];
  tasks: { id: string; title: string; dueAt: string | null }[];
  deals: Deal[];
}

interface ContactResponse {
  contact: ContactDetail;
}

function ActionButton({ icon, label, onPress }: { icon: IconName; label: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={20} color={colors.gold} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function activityIcon(type: string): IconName {
  switch (type) {
    case 'call': return 'call-outline';
    case 'sms': return 'chatbubble-outline';
    case 'email': return 'mail-outline';
    case 'note': return 'document-text-outline';
    case 'deal_created': return 'cash-outline';
    case 'status_change': return 'swap-horizontal-outline';
    default: return 'ellipse-outline';
  }
}

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const apiFetch = useApiFetch();
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadContact = useCallback(async (isRefresh = false) => {
    try {
      setError(null);
      if (isRefresh) setRefreshing(true);
      const result = await apiFetch<ContactResponse>(`/api/mobile/contacts/${id}`);
      if ('error' in result) {
        setError((result as { error: string }).error);
        return;
      }
      setContact(result.contact);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiFetch, id]);

  useFocusEffect(
    useCallback(() => {
      loadContact();
    }, [loadContact]),
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  if (error || !contact) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>{error || 'Contact not found'}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadContact(true)} tintColor={colors.gold} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{contact.name.charAt(0)}</Text>
        </View>
        <Text style={styles.name}>{contact.name}</Text>
        <Text style={styles.email}>{contact.email || 'No email'}</Text>
        {contact.company && <Text style={styles.company}>{contact.company}</Text>}
      </View>

      {/* Quick Actions */}
      <View style={styles.actions}>
        <ActionButton
          icon="call-outline"
          label="Call"
          onPress={() => contact.phone && Linking.openURL(`tel:${contact.phone}`)}
        />
        <ActionButton
          icon="chatbubble-outline"
          label="SMS"
          onPress={() => contact.phone && Linking.openURL(`sms:${contact.phone}`)}
        />
        <ActionButton
          icon="mail-outline"
          label="Email"
          onPress={() => contact.email && Linking.openURL(`mailto:${contact.email}`)}
        />
      </View>

      {/* Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <InfoRow label="Status" value={contact.status} />
        <InfoRow label="Phone" value={contact.phone || '—'} />
        <InfoRow label="Source" value={contact.source || '—'} />
        <InfoRow label="Added" value={new Date(contact.createdAt).toLocaleDateString()} />
      </View>

      {/* Deals */}
      {contact.deals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deals ({contact.deals.length})</Text>
          {contact.deals.map((deal) => (
            <View key={deal.id} style={styles.dealRow}>
              <View style={styles.dealInfo}>
                <Text style={styles.dealName}>{deal.name}</Text>
                <Text style={styles.dealStage}>{deal.stage?.name || 'No stage'}</Text>
              </View>
              <Text style={styles.dealValue}>
                {deal.value != null ? `$${Number(deal.value).toLocaleString()}` : '—'}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Pending Tasks */}
      {contact.tasks.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Tasks ({contact.tasks.length})</Text>
          {contact.tasks.map((task) => (
            <View key={task.id} style={styles.taskRow}>
              <Ionicons name="ellipse-outline" size={16} color={colors.textMuted} />
              <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Activity Timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity ({contact.activities.length})</Text>
        {contact.activities.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No activity recorded yet</Text>
          </View>
        ) : (
          contact.activities.map((activity) => (
            <View key={activity.id} style={styles.activityRow}>
              <Ionicons name={activityIcon(activity.type)} size={16} color={colors.textMuted} />
              <View style={styles.activityInfo}>
                <Text style={styles.activityDesc} numberOfLines={2}>
                  {activity.description || activity.type}
                </Text>
                <Text style={styles.activityTime}>{formatRelativeTime(activity.createdAt)}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: colors.gold, fontSize: 28, fontWeight: '700' },
  name: { color: colors.text, fontSize: 22, fontWeight: '700' },
  email: { color: colors.textMuted, fontSize: 14, marginTop: 4 },
  company: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionButton: { alignItems: 'center', gap: 6 },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { color: colors.textSecondary, fontSize: 12 },
  section: { padding: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: { color: colors.textMuted, fontSize: 14 },
  infoValue: { color: colors.text, fontSize: 14 },
  dealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  dealInfo: { flex: 1 },
  dealName: { color: colors.text, fontSize: 14, fontWeight: '500' },
  dealStage: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  dealValue: { color: colors.emerald, fontSize: 14, fontWeight: '600' },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  taskTitle: { color: colors.text, fontSize: 14, flex: 1 },
  activityRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityInfo: { flex: 1 },
  activityDesc: { color: colors.text, fontSize: 13 },
  activityTime: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  emptyState: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: { color: colors.textMuted, fontSize: 13 },
  errorText: { color: colors.red, fontSize: 14, textAlign: 'center', padding: 20 },
});
