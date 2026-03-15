import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { showAlert } from '../../utils/alert';
import {
  systemService,
  SystemHealthData,
  ReconciliationResult,
  QueueInfo,
  ScheduledJob,
} from '../../services/api/system';

// ---- Status Badge Component ----

function StatusBadge({ status, label }: { status: 'healthy' | 'degraded' | 'unhealthy' | 'connected' | 'disconnected' | 'active' | 'unknown' | 'disabled'; label?: string }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const statusColors: Record<string, { bg: string; text: string }> = {
    healthy: { bg: colors.successLight2, text: colors.greenDark },
    connected: { bg: colors.successLight2, text: colors.greenDark },
    active: { bg: colors.successLight2, text: colors.greenDark },
    degraded: { bg: Colors.light.warningLight, text: Colors.light.warningDark },
    unknown: { bg: Colors.light.warningLight, text: Colors.light.warningDark },
    disabled: { bg: Colors.light.slate, text: '#64748B' },
    unhealthy: { bg: Colors.light.errorLight, text: Colors.light.errorDark },
    disconnected: { bg: Colors.light.errorLight, text: Colors.light.errorDark },
  };

  const colorSet = statusColors[status] || statusColors.unknown;
  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <View style={[styles.badge, { backgroundColor: colorSet.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: colorSet.text }]} />
      <Text style={[styles.badgeText, { color: colorSet.text }]}>{displayLabel}</Text>
    </View>
  );
}

// ---- Severity Badge ----

function SeverityBadge({ severity }: { severity: string }) {
  const severityColors: Record<string, { bg: string; text: string }> = {
    critical: { bg: Colors.light.errorLight, text: Colors.light.errorDark },
    high: { bg: '#FED7AA', text: '#EA580C' },
    medium: { bg: Colors.light.warningLight, text: Colors.light.warningDark },
    low: { bg: Colors.light.slate, text: '#64748B' },
  };

  const colorSet = severityColors[severity] || severityColors.low;

  return (
    <View style={[styles.badge, { backgroundColor: colorSet.bg }]}>
      <Text style={[styles.badgeText, { color: colorSet.text }]}>
        {severity.toUpperCase()}
      </Text>
    </View>
  );
}

// ---- Info Row ----

function InfoRow({ label, value, valueColor }: { label: string; value: string | number; valueColor?: string }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: Colors.light.icon }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: valueColor || Colors.light.text }]}>{value}</Text>
    </View>
  );
}

// ---- Section Card ----

function SectionCard({ title, icon, iconColor, children, headerRight }: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.card, { backgroundColor: Colors.light.card }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.cardIcon, { backgroundColor: `${iconColor}20` }]}>
            <Ionicons name={icon} size={18} color={iconColor} />
          </View>
          <Text style={[styles.cardTitle, { color: Colors.light.text }]}>{title}</Text>
        </View>
        {headerRight}
      </View>
      {children}
    </View>
  );
}

// ---- Main Component ----

export default function SystemHealthScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [triggeringRecon, setTriggeringRecon] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadAllData();

    // Auto-refresh every 30 seconds
    intervalRef.current = setInterval(() => {
      loadAllData(true);
    }, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const loadAllData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [health, recon] = await Promise.all([
        systemService.getHealth(),
        systemService.getReconciliation(),
      ]);
      setHealthData(health);
      setReconciliation(recon);
    } catch (error: any) {
      console.error('Failed to load system health:', error.message);
      if (!silent) {
        showAlert('Error', 'Failed to load system health data.');
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData(true);
    setRefreshing(false);
  }, []);

  const handleTriggerReconciliation = async () => {
    setTriggeringRecon(true);
    try {
      const result = await systemService.triggerReconciliation();
      setReconciliation(result);
      showAlert('Success', 'Reconciliation completed successfully.');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to trigger reconciliation.');
    } finally {
      setTriggeringRecon(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.icon }]}>Loading system health...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>System Health</Text>
          <Text style={[styles.headerSubtitle, { color: colors.icon }]}>
            Auto-refreshes every 30s
          </Text>
        </View>
        {healthData && (
          <StatusBadge status={healthData.overallStatus} />
        )}
      </View>

      {/* Server Status */}
      {healthData && (
        <SectionCard title="Server Status" icon="server" iconColor={colors.info}>
          <InfoRow label="Uptime" value={healthData.server.uptimeFormatted} />
          <InfoRow
            label="Memory (Heap)"
            value={`${healthData.server.memory.heapUsedMB} MB / ${healthData.server.memory.heapTotalMB} MB`}
          />
          <InfoRow label="RSS Memory" value={`${healthData.server.memory.rssMB} MB`} />
          <InfoRow
            label="System Memory"
            value={`${healthData.server.freeMemoryGB} GB free / ${healthData.server.totalMemoryGB} GB`}
          />
          <InfoRow label="CPU Usage" value={`${healthData.server.cpuUsagePercent}%`} />
          <InfoRow label="CPU Cores" value={healthData.server.cpuCores} />
          <InfoRow label="Node.js" value={healthData.server.nodeVersion} />
          <InfoRow label="Platform" value={healthData.server.platform} />
          <InfoRow label="PID" value={healthData.server.pid} />
        </SectionCard>
      )}

      {/* Database Status */}
      {healthData && (
        <SectionCard
          title="Database (MongoDB)"
          icon="layers"
          iconColor={colors.success}
          headerRight={<StatusBadge status={healthData.database.status as any} />}
        >
          <InfoRow label="Status" value={healthData.database.status} />
          <InfoRow label="Connections" value={healthData.database.connectionCount} />
          <InfoRow label="Host" value={healthData.database.host} />
          <InfoRow label="Database" value={healthData.database.name} />
        </SectionCard>
      )}

      {/* Redis Status */}
      {healthData && (
        <SectionCard
          title="Redis"
          icon="flash"
          iconColor={colors.error}
          headerRight={
            <StatusBadge
              status={!healthData.redis.enabled ? 'disabled' : healthData.redis.status as any}
              label={!healthData.redis.enabled ? 'Disabled' : undefined}
            />
          }
        >
          <InfoRow label="Status" value={healthData.redis.enabled ? healthData.redis.status : 'Disabled'} />
          {healthData.redis.memory && (
            <InfoRow label="Memory Used" value={healthData.redis.memory} />
          )}
          <InfoRow label="Keys (DB Size)" value={healthData.redis.dbSize} />
        </SectionCard>
      )}

      {/* Queue Health */}
      {healthData?.queues && (
        <SectionCard
          title="Queue Health"
          icon="list"
          iconColor={colors.purple}
          headerRight={<StatusBadge status={healthData.queues.overall as any} />}
        >
          {/* Table header */}
          <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.tableHeaderCell, styles.tableNameCol, { color: colors.icon }]}>Queue</Text>
            <Text style={[styles.tableHeaderCell, styles.tableNumCol, { color: colors.icon }]}>Wait</Text>
            <Text style={[styles.tableHeaderCell, styles.tableNumCol, { color: colors.icon }]}>Active</Text>
            <Text style={[styles.tableHeaderCell, styles.tableNumCol, { color: colors.icon }]}>Done</Text>
            <Text style={[styles.tableHeaderCell, styles.tableNumCol, { color: colors.icon }]}>Fail</Text>
            <Text style={[styles.tableHeaderCell, styles.tableStatusCol, { color: colors.icon }]}>Status</Text>
          </View>
          {healthData.queues.queues.map((queue: QueueInfo, index: number) => (
            <View
              key={queue.name}
              style={[
                styles.tableRow,
                index < healthData.queues.queues.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <Text style={[styles.tableCell, styles.tableNameCol, { color: colors.text }]} numberOfLines={1}>
                {queue.name}
              </Text>
              <Text style={[styles.tableCell, styles.tableNumCol, { color: colors.text }]}>
                {queue.status === 'disabled' ? '-' : queue.waiting ?? 0}
              </Text>
              <Text style={[styles.tableCell, styles.tableNumCol, { color: colors.text }]}>
                {queue.status === 'disabled' ? '-' : queue.active ?? 0}
              </Text>
              <Text style={[styles.tableCell, styles.tableNumCol, { color: colors.text }]}>
                {queue.status === 'disabled' ? '-' : queue.completed ?? 0}
              </Text>
              <Text style={[styles.tableCell, styles.tableNumCol, { color: (queue.failed ?? 0) > 0 ? colors.errorDark : colors.text }]}>
                {queue.status === 'disabled' ? '-' : queue.failed ?? 0}
              </Text>
              <View style={[styles.tableStatusCol, { justifyContent: 'center' }]}>
                <StatusBadge status={queue.status as any} />
              </View>
            </View>
          ))}
        </SectionCard>
      )}

      {/* Scheduled Jobs */}
      {healthData?.jobs && (
        <SectionCard title="Scheduled Jobs" icon="time" iconColor={colors.warning}>
          {healthData.jobs.map((job: ScheduledJob, index: number) => (
            <View
              key={job.name}
              style={[
                styles.jobRow,
                index < healthData.jobs.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <View style={styles.jobMain}>
                <View style={styles.jobNameRow}>
                  <Text style={[styles.jobName, { color: colors.text }]}>{job.name}</Text>
                  <StatusBadge status={job.status as any} />
                </View>
                <Text style={[styles.jobDesc, { color: colors.icon }]}>{job.description}</Text>
              </View>
              <View style={styles.jobMeta}>
                <View style={styles.jobMetaRow}>
                  <Ionicons name="repeat" size={12} color={colors.icon} />
                  <Text style={[styles.jobMetaText, { color: colors.icon }]}>{job.scheduleHuman}</Text>
                </View>
                {job.lastRun && (
                  <View style={styles.jobMetaRow}>
                    <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                    <Text style={[styles.jobMetaText, { color: colors.icon }]}>
                      Last: {formatTimestamp(job.lastRun)}
                    </Text>
                  </View>
                )}
                {!job.lastRun && (
                  <View style={styles.jobMetaRow}>
                    <Ionicons name="help-circle" size={12} color={colors.icon} />
                    <Text style={[styles.jobMetaText, { color: colors.icon }]}>No run recorded</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </SectionCard>
      )}

      {/* Reconciliation */}
      <SectionCard
        title="Reconciliation"
        icon="shield-checkmark"
        iconColor="#06B6D4"
        headerRight={
          <TouchableOpacity
            style={[styles.runButton, triggeringRecon && styles.runButtonDisabled]}
            onPress={handleTriggerReconciliation}
            disabled={triggeringRecon}
          >
            {triggeringRecon ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <>
                <Ionicons name="play" size={14} color={colors.card} />
                <Text style={styles.runButtonText}>Run Now</Text>
              </>
            )}
          </TouchableOpacity>
        }
      >
        {reconciliation && reconciliation.hasResults ? (
          <>
            <View style={styles.reconSummaryGrid}>
              <View style={[styles.reconStat, { backgroundColor: `${colors.info}10` }]}>
                <Text style={[styles.reconStatValue, { color: colors.info }]}>
                  {reconciliation.summary?.totalDiscrepancies ?? 0}
                </Text>
                <Text style={[styles.reconStatLabel, { color: colors.icon }]}>Discrepancies</Text>
              </View>
              <View style={[styles.reconStat, { backgroundColor: `${colors.errorLight}10` }]}>
                <Text style={[styles.reconStatValue, { color: colors.errorDark }]}>
                  {reconciliation.summary?.criticalCount ?? 0}
                </Text>
                <Text style={[styles.reconStatLabel, { color: colors.icon }]}>Critical</Text>
              </View>
              <View style={[styles.reconStat, { backgroundColor: `${colors.warningLight}10` }]}>
                <Text style={[styles.reconStatValue, { color: '#EA580C' }]}>
                  {reconciliation.summary?.highCount ?? 0}
                </Text>
                <Text style={[styles.reconStatLabel, { color: colors.icon }]}>High</Text>
              </View>
              <View style={[styles.reconStat, { backgroundColor: `${colors.warning}10` }]}>
                <Text style={[styles.reconStatValue, { color: colors.warning }]}>
                  {formatCurrency(reconciliation.summary?.totalDifferenceAmount ?? 0)}
                </Text>
                <Text style={[styles.reconStatLabel, { color: colors.icon }]}>Total Diff</Text>
              </View>
            </View>

            <InfoRow
              label="Users Checked"
              value={reconciliation.usersChecked ?? 0}
            />
            <InfoRow
              label="Duration"
              value={reconciliation.duration ? `${reconciliation.duration}ms` : 'N/A'}
            />
            <InfoRow
              label="Last Run"
              value={reconciliation.timestamp ? formatTimestamp(reconciliation.timestamp) : 'N/A'}
            />

            {/* Show discrepancy breakdown if any */}
            {reconciliation.discrepancies && reconciliation.discrepancies.length > 0 && (
              <View style={styles.discrepancySection}>
                <Text style={[styles.discrepancyTitle, { color: colors.text }]}>
                  Discrepancy Breakdown
                </Text>
                {/* Table header */}
                <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.tableHeaderCell, { flex: 2, color: colors.icon }]}>Type</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1, color: colors.icon }]}>Diff</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1, color: colors.icon }]}>Severity</Text>
                </View>
                {reconciliation.discrepancies.slice(0, 20).map((disc, idx) => (
                  <View
                    key={`${disc.userId}-${disc.type}-${idx}`}
                    style={[
                      styles.tableRow,
                      idx < Math.min(reconciliation.discrepancies!.length, 20) - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.tableCell, { flex: 2, color: colors.text }]} numberOfLines={1}>
                      {formatDiscrepancyType(disc.type)}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1, color: colors.text }]}>
                      {formatCurrency(disc.difference)}
                    </Text>
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <SeverityBadge severity={disc.severity} />
                    </View>
                  </View>
                ))}
                {reconciliation.discrepancies.length > 20 && (
                  <Text style={[styles.moreText, { color: colors.icon }]}>
                    ...and {reconciliation.discrepancies.length - 20} more
                  </Text>
                )}
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={40} color={colors.icon} />
            <Text style={[styles.emptyStateText, { color: colors.icon }]}>
              {reconciliation?.message || 'No reconciliation results available. Click "Run Now" to trigger.'}
            </Text>
          </View>
        )}
      </SectionCard>

      {/* Last updated timestamp */}
      {healthData && (
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.icon }]}>
            Last updated: {formatTimestamp(healthData.timestamp)}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// ---- Helpers ----

function formatTimestamp(ts: string): string {
  try {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

function formatCurrency(amount: number): string {
  if (amount >= 100000) {
    return `Rs ${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `Rs ${(amount / 1000).toFixed(1)}K`;
  }
  return `Rs ${amount.toFixed(2)}`;
}

function formatDiscrepancyType(type: string): string {
  const typeMap: Record<string, string> = {
    purchase_vs_cashback: 'Purchase vs Cashback',
    wallet_vs_transactions: 'Wallet vs Transactions',
    order_vs_wallet_deduction: 'Order vs Wallet',
    order_vs_merchant_settlement: 'Order vs Settlement',
  };
  return typeMap[type] || type;
}

// ---- Styles ----

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Card
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },

  // Table
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    marginBottom: 2,
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tableCell: {
    fontSize: 13,
  },
  tableNameCol: {
    flex: 2,
  },
  tableNumCol: {
    flex: 1,
    textAlign: 'center',
  },
  tableStatusCol: {
    flex: 1.2,
    alignItems: 'flex-end',
  },

  // Job rows
  jobRow: {
    paddingVertical: 12,
  },
  jobMain: {
    marginBottom: 6,
  },
  jobNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  jobName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  jobDesc: {
    fontSize: 12,
  },
  jobMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  jobMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  jobMetaText: {
    fontSize: 11,
  },

  // Run button
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.cyan,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  runButtonDisabled: {
    opacity: 0.6,
  },
  runButtonText: {
    color: Colors.light.card,
    fontSize: 12,
    fontWeight: '600',
  },

  // Reconciliation
  reconSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  reconStat: {
    flex: 1,
    minWidth: '40%',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  reconStatValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  reconStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },

  // Discrepancy section
  discrepancySection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  discrepancyTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  moreText: {
    textAlign: 'center',
    fontSize: 12,
    paddingVertical: 8,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyStateText: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 11,
  },
});
