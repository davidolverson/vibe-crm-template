import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/lib/colors';
import { useApiFetch } from '../../src/lib/api';

interface Task {
  id: string;
  title: string;
  status: string;
  dueAt: string | null;
  assignedToUserId: string | null;
  contactId: string | null;
  createdAt: string;
}

interface TasksResponse {
  tasks: Task[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

type FilterTab = 'active' | 'completed' | 'all';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'No due date';
  const d = new Date(dateStr);
  const diffMs = d.getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays <= 7) return `Due in ${diffDays}d`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function dueDateColor(dateStr: string | null): string {
  if (!dateStr) return colors.textMuted;
  const diffMs = new Date(dateStr).getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return colors.red;
  if (diffDays <= 1) return colors.amber;
  return colors.textSecondary;
}

export default function TasksScreen() {
  const apiFetch = useApiFetch();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>('active');
  const [total, setTotal] = useState(0);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadTasks = useCallback(async (status: FilterTab, isRefresh = false) => {
    try {
      setError(null);
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const result = await apiFetch<TasksResponse>(`/api/mobile/tasks?status=${status}&limit=50`);
      setTasks(result.tasks);
      setTotal(result.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiFetch]);

  useFocusEffect(
    useCallback(() => {
      loadTasks(filter);
    }, [loadTasks, filter]),
  );

  const handleFilterChange = (tab: FilterTab) => {
    setFilter(tab);
    loadTasks(tab);
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    setTogglingId(task.id);

    // Optimistic update
    setTasks(prev =>
      prev.map(t => (t.id === task.id ? { ...t, status: newStatus } : t)),
    );

    try {
      await apiFetch(`/api/mobile/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      // Reload to get accurate count
      loadTasks(filter, true);
    } catch {
      // Revert on failure
      setTasks(prev =>
        prev.map(t => (t.id === task.id ? { ...t, status: task.status } : t)),
      );
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Filter tabs */}
      <View style={styles.filterBar}>
        {(['active', 'completed', 'all'] as FilterTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, filter === tab && styles.filterTabActive]}
            onPress={() => handleFilterChange(tab)}
          >
            <Text style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.totalBadge}>{total}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={tasks.length === 0 ? styles.emptyContainer : styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadTasks(filter, true)}
              tintColor={colors.gold}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.taskRow}>
              <TouchableOpacity
                style={styles.taskIcon}
                onPress={() => toggleTaskStatus(item)}
                disabled={togglingId === item.id}
              >
                {togglingId === item.id ? (
                  <ActivityIndicator size="small" color={colors.gold} />
                ) : (
                  <Ionicons
                    name={item.status === 'completed' ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={item.status === 'completed' ? colors.emerald : colors.textMuted}
                  />
                )}
              </TouchableOpacity>
              <View style={styles.taskInfo}>
                <Text
                  style={[styles.taskTitle, item.status === 'completed' && styles.taskTitleDone]}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                <Text style={[styles.taskDue, { color: dueDateColor(item.dueAt) }]}>
                  {formatDate(item.dueAt)}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>
                {filter === 'active' ? 'No pending tasks' : 'No tasks found'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'active' ? "You're all caught up!" : 'Tasks will appear here'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 4,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterTabActive: {
    backgroundColor: colors.goldMuted,
  },
  filterTabText: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  filterTabTextActive: { color: colors.gold },
  totalBadge: {
    marginLeft: 'auto',
    color: colors.textMuted,
    fontSize: 12,
  },
  listContent: { paddingBottom: 20 },
  emptyContainer: { flex: 1 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  taskIcon: { paddingTop: 2, width: 24, alignItems: 'center' },
  taskInfo: { flex: 1 },
  taskTitle: { color: colors.text, fontSize: 15, fontWeight: '500' },
  taskTitleDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  taskDue: { fontSize: 12, marginTop: 4 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '600' },
  emptySubtitle: { color: colors.textMuted, fontSize: 14 },
  errorText: { color: colors.red, fontSize: 14, textAlign: 'center', padding: 20 },
});
