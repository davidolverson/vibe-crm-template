import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { colors } from '../../src/lib/colors';
import { useApiFetch } from '../../src/lib/api';

interface DashboardData {
  leads: { today: number; thisWeek: number; total: number };
  activeDeals: number;
  tasksDue: number;
  pipelineValue: number;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

export default function DashboardScreen() {
  const apiFetch = useApiFetch();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    try {
      setError(null);
      if (isRefresh) setRefreshing(true);
      const result = await apiFetch<DashboardData>('/api/mobile/dashboard');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiFetch]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard]),
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} tintColor={colors.gold} />
      }
    >
      <Text style={styles.greeting}>Welcome back</Text>

      <View style={styles.grid}>
        <StatCard
          label="New Leads"
          value={String(data?.leads.today ?? 0)}
          sub={`${data?.leads.thisWeek ?? 0} this week`}
        />
        <StatCard label="Active Deals" value={String(data?.activeDeals ?? 0)} />
        <StatCard label="Tasks Due" value={String(data?.tasksDue ?? 0)} sub="this week" />
        <StatCard
          label="Pipeline Value"
          value={formatCurrency(Number(data?.pipelineValue ?? 0))}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Stats</Text>
        <View style={styles.quickStat}>
          <Text style={styles.quickStatLabel}>Total Contacts</Text>
          <Text style={styles.quickStatValue}>{data?.leads.total ?? 0}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    width: '48%',
    flexGrow: 1,
  },
  statLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  statValue: { fontSize: 28, fontWeight: '700', color: colors.text },
  statSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  quickStat: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickStatLabel: { color: colors.textMuted, fontSize: 14 },
  quickStatValue: { color: colors.gold, fontSize: 20, fontWeight: '700' },
  errorText: { color: colors.red, fontSize: 14, textAlign: 'center', padding: 20 },
});
