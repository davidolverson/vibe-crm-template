import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/lib/colors';
import { useApiFetch } from '../../src/lib/api';

interface Deal {
  id: string;
  name: string;
  value: number | null;
  contactId: string | null;
  createdAt: string;
}

interface Stage {
  id: string;
  name: string;
  position: number;
  dealCount: number;
  totalValue: number;
  deals: Deal[];
}

interface PipelineResponse {
  stages: Stage[];
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function StageCard({ stage }: { stage: Stage }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.stageCard}>
      <TouchableOpacity style={styles.stageHeader} onPress={() => setExpanded(!expanded)}>
        <View style={styles.stageInfo}>
          <Text style={styles.stageName}>{stage.name}</Text>
          <Text style={styles.stageStats}>
            {stage.dealCount} deal{stage.dealCount !== 1 ? 's' : ''} · {formatCurrency(stage.totalValue)}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {expanded && stage.deals.length > 0 && (
        <View style={styles.dealsList}>
          {stage.deals.map((deal) => (
            <View key={deal.id} style={styles.dealRow}>
              <Text style={styles.dealName} numberOfLines={1}>{deal.name}</Text>
              <Text style={styles.dealValue}>
                {deal.value != null ? formatCurrency(Number(deal.value)) : '—'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function PipelineScreen() {
  const apiFetch = useApiFetch();
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadPipeline = useCallback(async (isRefresh = false) => {
    try {
      setError(null);
      if (isRefresh) setRefreshing(true);
      const result = await apiFetch<PipelineResponse>('/api/mobile/pipeline');
      setStages(result.stages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiFetch]);

  useFocusEffect(
    useCallback(() => {
      loadPipeline();
    }, [loadPipeline]),
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

  const totalDeals = stages.reduce((sum, s) => sum + s.dealCount, 0);
  const totalValue = stages.reduce((sum, s) => sum + s.totalValue, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadPipeline(true)} tintColor={colors.gold} />
      }
    >
      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalDeals}</Text>
          <Text style={styles.summaryLabel}>Open Deals</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{formatCurrency(totalValue)}</Text>
          <Text style={styles.summaryLabel}>Total Value</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{stages.length}</Text>
          <Text style={styles.summaryLabel}>Stages</Text>
        </View>
      </View>

      {stages.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="funnel-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No pipeline configured</Text>
          <Text style={styles.emptySubtitle}>Set up your pipeline in VIBE settings</Text>
        </View>
      ) : (
        stages.map((stage) => <StageCard key={stage.id} stage={stage} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { color: colors.gold, fontSize: 20, fontWeight: '700' },
  summaryLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  summaryDivider: { width: 1, height: 32, backgroundColor: colors.border },
  stageCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  stageInfo: { flex: 1 },
  stageName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  stageStats: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  dealsList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dealName: { color: colors.text, fontSize: 13, flex: 1, marginRight: 8 },
  dealValue: { color: colors.emerald, fontSize: 13, fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '600' },
  emptySubtitle: { color: colors.textMuted, fontSize: 14, textAlign: 'center', maxWidth: 280 },
  errorText: { color: colors.red, fontSize: 14, textAlign: 'center', padding: 20 },
});
