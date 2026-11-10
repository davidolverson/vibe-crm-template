import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useState, useCallback, useRef } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/lib/colors';
import { useApiFetch } from '../../src/lib/api';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: string;
  source?: string | null;
  createdAt: string;
}

interface ContactsResponse {
  contacts: Contact[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export default function ContactsScreen() {
  const apiFetch = useApiFetch();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadContacts = useCallback(async (searchTerm: string, pageNum: number, append = false) => {
    try {
      setError(null);
      if (!append) setLoading(true);
      else setLoadingMore(true);

      const params = new URLSearchParams({ page: String(pageNum), limit: '20' });
      if (searchTerm) params.set('search', searchTerm);

      const result = await apiFetch<ContactsResponse>(`/api/mobile/contacts?${params}`);
      setContacts(prev => append ? [...prev, ...result.contacts] : result.contacts);
      setTotalPages(result.pagination.pages);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [apiFetch]);

  useFocusEffect(
    useCallback(() => {
      loadContacts(search, 1);
    }, [loadContacts]),
  );

  const handleSearch = (text: string) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadContacts(text, 1);
    }, 400);
  };

  const loadMore = () => {
    if (!loadingMore && page < totalPages) {
      loadContacts(search, page + 1, true);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={handleSearch}
        />
      </View>

      {error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={contacts.length === 0 ? styles.emptyContainer : styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadContacts(search, 1).finally(() => setRefreshing(false));
              }}
              tintColor={colors.gold}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.contactRow}
              onPress={() => router.push(`/contacts/${item.id}`)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.name}</Text>
                <Text style={styles.contactEmail}>{item.email || item.phone || 'No contact info'}</Text>
              </View>
              <View style={[styles.statusBadge, statusColor(item.status)]}>
                <Text style={[styles.statusText, statusTextColor(item.status)]}>{item.status}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator color={colors.gold} size="small" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No contacts found</Text>
              <Text style={styles.emptySubtitle}>
                {search ? 'Try a different search term' : 'Add contacts in your VIBE dashboard'}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB - Add Contact */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/contacts/add')}>
        <Ionicons name="add" size={28} color={colors.background} />
      </TouchableOpacity>
    </View>
  );
}

function statusColor(status: string) {
  switch (status) {
    case 'qualified': return { backgroundColor: colors.emeraldMuted };
    case 'contacted': return { backgroundColor: colors.blueMuted };
    case 'new': return { backgroundColor: colors.amberMuted };
    case 'won': return { backgroundColor: colors.goldMuted };
    case 'lost': return { backgroundColor: colors.redMuted };
    default: return { backgroundColor: colors.emeraldMuted };
  }
}

function statusTextColor(status: string) {
  switch (status) {
    case 'qualified': return { color: colors.emerald };
    case 'contacted': return { color: colors.blue };
    case 'new': return { color: colors.amber };
    case 'won': return { color: colors.gold };
    case 'lost': return { color: colors.red };
    default: return { color: colors.emerald };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 16 },
  listContent: { paddingBottom: 20 },
  emptyContainer: { flex: 1 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.gold, fontWeight: '600', fontSize: 16 },
  contactInfo: { flex: 1 },
  contactName: { color: colors.text, fontSize: 15, fontWeight: '500' },
  contactEmail: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: { fontSize: 11, fontWeight: '500' },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '600' },
  emptySubtitle: { color: colors.textMuted, fontSize: 14 },
  footer: { paddingVertical: 16, alignItems: 'center' },
  errorText: { color: colors.red, fontSize: 14, textAlign: 'center', padding: 20 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
