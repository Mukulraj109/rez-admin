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
import { systemService, SystemHealthData } from '../../services/api/system';

// ---- Types ----

interface MonitoringMetrics {
  activeUsers: number;
  avgResponseTime: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
  wsConnections: number;
  jobsRunning: number;
  jobsFailed: number;
  jobsPending: number;
  uptime: string;
  uptimeSeconds: number;
  dbStatus: string;
  dbConnections: number;
  redisStatus: string;
  redisEnabled: boolean;
  redisMemory: string | null;
  redisKeys: number;
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
}

interface RecentError {
  id: string;
  message: string;
  timestamp: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  source: string;
}

// ---- KPI Card Component ----

function KPICard({
  title,
  value,
  subtitle,
  icon,
  iconColor,
  trend,
  statusColor,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  trend?: 'up' | 'down' | 'stable';
  statusColor?: string;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
      <View style={styles.kpiHeader}>
        <View style={[styles.kpiIcon, { backgroundColor: `${iconColor}15` }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        {statusColor && (
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        )}
      </View>
      <Text style={[styles.kpiValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.kpiTitle, { color: colors.icon }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.kpiSubtitle, { color: colors.muted }]}>{subtitle}</Text>
      )}
    </View>
  );
}

// ---- Status Badge Component ----

function StatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    healthy: { bg: Colors.light.successLight2, text: Colors.light.greenDark },
    connected: { bg: Colors.light.successLight2, text: Colors.light.greenDark },
    degraded: { bg: Colors.light.warningLight, text: Colors.light.warningDark },
    unhealthy: { bg: Colors.light.errorLight, text: Colors.light.errorDark },
    disconnected: { bg: Colors.light.errorLight, text: Colors.light.errorDark },
  };

  const colorSet = statusColors[status] || statusColors.degraded;
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <View style={[styles.badge, { backgroundColor: colorSet.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: colorSet.text }]} />
      <Text style={[styles.badgeText, { color: colorSet.text }]}>{label}</Text>
    </View>
  );
}

// ---- Section Card ----

function SectionCard({
  title,
  icon,
  iconColor,
  children,
  headerRight,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <View style={[styles.sectionIcon, { backgroundColor: `${iconColor}20` }]}>
            <Ionicons name={icon} size={18} color={iconColor} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        </View>
        {headerRight}
      </View>
      {children}
    </View>
  );
}

// ---- Error Row ----

function ErrorRow({ error }: { error: RecentError }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const severityColors: Record<string, string> = {
    critical: Colors.light.errorDark,
    high: '#EA580C',
    medium: Colors.light.warningDark,
    low: Colors.light.muted,
  };

  return (
    <View style={[styles.errorRow, { borderBottomColor: colors.border }]}>
      <View style={styles.errorLeft}>
        <View style={[styles.severityDot, { backgroundColor: severityColors[error.severity] || colors.muted }]} />
        <View style={styles.errorContent}>
          <Text style={[styles.errorMessage, { color: colors.text }]} numberOfLines={2}>
            {error.message}
          </Text>
          <Text style={[styles.errorMeta, { color: colors.icon }]}>
            {error.source} -- {formatTimestamp(error.timestamp)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ---- Main Component ----

export default function SystemMonitoringScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [metrics, setMetrics] = useState<MonitoringMetrics | null>(null);
  const [recentErrors, setRecentErrors] = useState<RecentError[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefreshSeconds, setAutoRefreshSeconds] = useState(10);
  const [countdown, setCountdown] = useState(10);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadMetrics();

    // Auto-refresh every 10 seconds
    intervalRef.current = setInterval(() => {
      loadMetrics(true);
    }, autoRefreshSeconds * 1000);

    // Countdown timer
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? autoRefreshSeconds : prev - 1));
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [autoRefreshSeconds]);

  const loadMetrics = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const health = await systemService.getHealth();
      const mapped = mapHealthToMetrics(health);
      setMetrics(mapped);

      // Generate recent errors from queue and job data
      const errors = generateRecentErrors(health);
      setRecentErrors(errors);
      setCountdown(autoRefreshSeconds);
    } catch (error: any) {
      if (__DEV__) console.error('Failed to load monitoring data:', error.message);
      if (!silent) {
        showAlert('Error', 'Failed to load monitoring data.');
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const mapHealthToMetrics = (health: SystemHealthData): MonitoringMetrics => {
    // Calculate job stats from health data
    let jobsRunning = 0;
    let jobsFailed = 0;
    let jobsPending = 0;

    if (health.queues?.queues) {
      health.queues.queues.forEach((q) => {
        jobsRunning += q.active || 0;
        jobsFailed += q.failed || 0;
        jobsPending += q.waiting || 0;
      });
    }

    // Estimate active users from system load (heuristic)
    const activeUsersEstimate = Math.max(0, Math.round(
      (health.server.memory.heapUsedMB / 10) + (health.server.cpuUsagePercent * 2)
    ));

    // Estimate avg response time from CPU/memory load
    const avgResponseTime = Math.round(
      20 + (health.server.cpuUsagePercent * 1.5) + (health.server.memory.heapUsedMB * 0.05)
    );

    // Calculate error rate from queue failures
    const totalQueueJobs = health.queues?.queues?.reduce(
      (sum, q) => sum + (q.completed || 0) + (q.failed || 0) + (q.active || 0),
      0
    ) || 1;
    const totalFailed = health.queues?.queues?.reduce(
      (sum, q) => sum + (q.failed || 0),
      0
    ) || 0;
    const errorRate = totalQueueJobs > 0 ? Number(((totalFailed / totalQueueJobs) * 100).toFixed(2)) : 0;

    return {
      activeUsers: activeUsersEstimate,
      avgResponseTime,
      errorRate,
      cpuUsage: health.server.cpuUsagePercent,
      memoryUsage: health.server.memory.heapUsedMB > 0 && health.server.memory.heapTotalMB > 0
        ? Number(((health.server.memory.heapUsedMB / health.server.memory.heapTotalMB) * 100).toFixed(1))
        : 0,
      heapUsedMB: health.server.memory.heapUsedMB,
      heapTotalMB: health.server.memory.heapTotalMB,
      rssMB: health.server.memory.rssMB,
      wsConnections: 0, // WebSocket data not available from health endpoint
      jobsRunning,
      jobsFailed,
      jobsPending,
      uptime: health.server.uptimeFormatted,
      uptimeSeconds: health.server.uptime,
      dbStatus: health.database.status,
      dbConnections: health.database.connectionCount,
      redisStatus: health.redis.status,
      redisEnabled: health.redis.enabled,
      redisMemory: health.redis.memory,
      redisKeys: health.redis.dbSize,
      overallStatus: health.overallStatus,
    };
  };

  const generateRecentErrors = (health: SystemHealthData): RecentError[] => {
    const errors: RecentError[] = [];
    let idx = 0;

    // Check for unhealthy queues
    if (health.queues?.queues) {
      health.queues.queues.forEach((q) => {
        if (q.status === 'unhealthy') {
          errors.push({
            id: `queue-${idx++}`,
            message: `Queue "${q.name}" is unhealthy${q.error ? ': ' + q.error : ''}`,
            timestamp: health.timestamp,
            severity: 'high',
            source: 'Queue Service',
          });
        }
        if ((q.failed || 0) > 0) {
          errors.push({
            id: `queue-fail-${idx++}`,
            message: `Queue "${q.name}" has ${q.failed} failed jobs`,
            timestamp: health.timestamp,
            severity: (q.failed || 0) > 10 ? 'critical' : 'medium',
            source: 'Queue Service',
          });
        }
      });
    }

    // Check Redis
    if (health.redis.enabled && health.redis.status !== 'connected') {
      errors.push({
        id: `redis-${idx++}`,
        message: 'Redis is disconnected. Caching and rate limiting may be affected.',
        timestamp: health.timestamp,
        severity: 'critical',
        source: 'Redis',
      });
    }

    // Check database
    if (health.database.status !== 'connected') {
      errors.push({
        id: `db-${idx++}`,
        message: `Database is ${health.database.status}. Service may be impacted.`,
        timestamp: health.timestamp,
        severity: 'critical',
        source: 'MongoDB',
      });
    }

    // Check high CPU
    if (health.server.cpuUsagePercent > 80) {
      errors.push({
        id: `cpu-${idx++}`,
        message: `CPU usage is at ${health.server.cpuUsagePercent.toFixed(1)}% - consider scaling.`,
        timestamp: health.timestamp,
        severity: health.server.cpuUsagePercent > 95 ? 'critical' : 'high',
        source: 'Server',
      });
    }

    // Check high memory
    const heapUsagePercent = health.server.memory.heapTotalMB > 0
      ? (health.server.memory.heapUsedMB / health.server.memory.heapTotalMB) * 100
      : 0;
    if (heapUsagePercent > 85) {
      errors.push({
        id: `mem-${idx++}`,
        message: `Heap memory usage is at ${heapUsagePercent.toFixed(1)}% (${health.server.memory.heapUsedMB}MB / ${health.server.memory.heapTotalMB}MB)`,
        timestamp: health.timestamp,
        severity: heapUsagePercent > 95 ? 'critical' : 'high',
        source: 'Server',
      });
    }

    // Check stale jobs
    if (health.jobs) {
      health.jobs.forEach((job) => {
        if (job.status === 'unknown') {
          errors.push({
            id: `job-${idx++}`,
            message: `Scheduled job "${job.name}" has unknown status`,
            timestamp: health.timestamp,
            severity: 'low',
            source: 'Scheduler',
          });
        }
      });
    }

    return errors.slice(0, 10);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMetrics(true);
    setRefreshing(false);
  }, []);

  const getStatusColor = (value: number, thresholds: { warn: number; critical: number }) => {
    if (value >= thresholds.critical) return Colors.light.errorDark;
    if (value >= thresholds.warn) return Colors.light.warningDark;
    return Colors.light.greenDark;
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.icon }]}>Loading monitoring data...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
      }
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>System Monitoring</Text>
          <Text style={[styles.headerSubtitle, { color: colors.icon }]}>
            Auto-refreshes every {autoRefreshSeconds}s (next in {countdown}s)
          </Text>
        </View>
        {metrics && <StatusBadge status={metrics.overallStatus} />}
      </View>

      {/* Uptime Banner */}
      {metrics && (
        <View style={[styles.uptimeBanner, { backgroundColor: colors.card }]}>
          <View style={styles.uptimeLeft}>
            <Ionicons name="timer-outline" size={20} color={colors.success} />
            <View style={styles.uptimeText}>
              <Text style={[styles.uptimeLabel, { color: colors.icon }]}>Uptime</Text>
              <Text style={[styles.uptimeValue, { color: colors.text }]}>{metrics.uptime}</Text>
            </View>
          </View>
          <View style={styles.uptimeRight}>
            <TouchableOpacity
              style={[styles.refreshButton, { borderColor: colors.border }]}
              onPress={onRefresh}
            >
              <Ionicons name="refresh" size={16} color={colors.tint} />
              <Text style={[styles.refreshText, { color: colors.tint }]}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* KPI Grid */}
      {metrics && (
        <View style={styles.kpiGrid}>
          <KPICard
            title="Est. Active Users"
            value={metrics.activeUsers}
            icon="people"
            iconColor={Colors.light.info}
            subtitle="Based on load"
          />
          <KPICard
            title="Avg Response"
            value={`${metrics.avgResponseTime}ms`}
            icon="speedometer"
            iconColor={Colors.light.success}
            statusColor={getStatusColor(metrics.avgResponseTime, { warn: 200, critical: 500 })}
          />
          <KPICard
            title="Error Rate"
            value={`${metrics.errorRate}%`}
            icon="warning"
            iconColor={Colors.light.error}
            statusColor={getStatusColor(metrics.errorRate, { warn: 2, critical: 5 })}
          />
          <KPICard
            title="CPU Usage"
            value={`${metrics.cpuUsage.toFixed(1)}%`}
            icon="hardware-chip"
            iconColor={Colors.light.purple}
            statusColor={getStatusColor(metrics.cpuUsage, { warn: 70, critical: 90 })}
          />
          <KPICard
            title="Memory (Heap)"
            value={`${metrics.memoryUsage}%`}
            icon="server"
            iconColor={Colors.light.cyan}
            subtitle={`${metrics.heapUsedMB}/${metrics.heapTotalMB}MB`}
            statusColor={getStatusColor(metrics.memoryUsage, { warn: 75, critical: 90 })}
          />
          <KPICard
            title="RSS Memory"
            value={`${metrics.rssMB}MB`}
            icon="albums"
            iconColor={Colors.light.orange}
          />
          <KPICard
            title="DB Connections"
            value={metrics.dbConnections}
            icon="layers"
            iconColor={Colors.light.success}
            statusColor={metrics.dbStatus === 'connected' ? Colors.light.greenDark : Colors.light.errorDark}
          />
          <KPICard
            title="Redis Keys"
            value={metrics.redisEnabled ? metrics.redisKeys : 'N/A'}
            icon="flash"
            iconColor={Colors.light.errorDark}
            subtitle={metrics.redisMemory || undefined}
            statusColor={
              !metrics.redisEnabled
                ? Colors.light.muted
                : metrics.redisStatus === 'connected'
                ? Colors.light.greenDark
                : Colors.light.errorDark
            }
          />
        </View>
      )}

      {/* Background Jobs */}
      {metrics && (
        <SectionCard title="Background Jobs" icon="git-branch" iconColor={Colors.light.purple}>
          <View style={styles.jobsGrid}>
            <View style={[styles.jobStat, { backgroundColor: `${Colors.light.success}10` }]}>
              <Text style={[styles.jobStatValue, { color: Colors.light.greenDark }]}>
                {metrics.jobsRunning}
              </Text>
              <Text style={[styles.jobStatLabel, { color: colors.icon }]}>Running</Text>
            </View>
            <View style={[styles.jobStat, { backgroundColor: `${Colors.light.warning}10` }]}>
              <Text style={[styles.jobStatValue, { color: Colors.light.warningDark }]}>
                {metrics.jobsPending}
              </Text>
              <Text style={[styles.jobStatLabel, { color: colors.icon }]}>Pending</Text>
            </View>
            <View style={[styles.jobStat, { backgroundColor: `${Colors.light.error}10` }]}>
              <Text style={[styles.jobStatValue, { color: Colors.light.errorDark }]}>
                {metrics.jobsFailed}
              </Text>
              <Text style={[styles.jobStatLabel, { color: colors.icon }]}>Failed</Text>
            </View>
          </View>
        </SectionCard>
      )}

      {/* Service Status */}
      {metrics && (
        <SectionCard title="Service Status" icon="shield-checkmark" iconColor={Colors.light.info}>
          <View style={[styles.serviceRow, { borderBottomColor: colors.border }]}>
            <View style={styles.serviceInfo}>
              <Ionicons name="server" size={16} color={Colors.light.info} />
              <Text style={[styles.serviceName, { color: colors.text }]}>Node.js Server</Text>
            </View>
            <StatusBadge status="healthy" />
          </View>
          <View style={[styles.serviceRow, { borderBottomColor: colors.border }]}>
            <View style={styles.serviceInfo}>
              <Ionicons name="layers" size={16} color={Colors.light.success} />
              <Text style={[styles.serviceName, { color: colors.text }]}>MongoDB</Text>
            </View>
            <StatusBadge status={metrics.dbStatus === 'connected' ? 'healthy' : 'unhealthy'} />
          </View>
          <View style={[styles.serviceRow, { borderBottomColor: colors.border }]}>
            <View style={styles.serviceInfo}>
              <Ionicons name="flash" size={16} color={Colors.light.errorDark} />
              <Text style={[styles.serviceName, { color: colors.text }]}>Redis</Text>
            </View>
            {metrics.redisEnabled ? (
              <StatusBadge status={metrics.redisStatus === 'connected' ? 'healthy' : 'unhealthy'} />
            ) : (
              <View style={[styles.badge, { backgroundColor: Colors.light.slate }]}>
                <Text style={[styles.badgeText, { color: '#64748B' }]}>Disabled</Text>
              </View>
            )}
          </View>
          <View style={styles.serviceRow}>
            <View style={styles.serviceInfo}>
              <Ionicons name="git-branch" size={16} color={Colors.light.purple} />
              <Text style={[styles.serviceName, { color: colors.text }]}>Queue Service</Text>
            </View>
            <StatusBadge
              status={
                metrics.jobsFailed > 10 ? 'unhealthy' :
                metrics.jobsFailed > 0 ? 'degraded' : 'healthy'
              }
            />
          </View>
        </SectionCard>
      )}

      {/* Recent Errors/Alerts */}
      <SectionCard
        title="Recent Alerts"
        icon="alert-circle"
        iconColor={Colors.light.error}
        headerRight={
          <Text style={[styles.alertCount, { color: colors.icon }]}>
            {recentErrors.length} issue{recentErrors.length !== 1 ? 's' : ''}
          </Text>
        }
      >
        {recentErrors.length > 0 ? (
          recentErrors.map((error) => <ErrorRow key={error.id} error={error} />)
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={40} color={Colors.light.success} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              No issues detected. All systems running normally.
            </Text>
          </View>
        )}
      </SectionCard>

      {/* Quick Links */}
      <SectionCard title="Quick Links" icon="link" iconColor={Colors.light.info}>
        <TouchableOpacity
          style={[styles.quickLink, { borderBottomColor: colors.border }]}
          onPress={() => router.push('/(dashboard)/system-health')}
        >
          <View style={styles.quickLinkLeft}>
            <Ionicons name="pulse" size={16} color={Colors.light.cyan} />
            <Text style={[styles.quickLinkText, { color: colors.text }]}>
              Detailed System Health
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.icon} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickLink, { borderBottomColor: colors.border }]}
          onPress={() => router.push('/(dashboard)/gamification-economy')}
        >
          <View style={styles.quickLinkLeft}>
            <Ionicons name="stats-chart" size={16} color={Colors.light.success} />
            <Text style={[styles.quickLinkText, { color: colors.text }]}>
              Economy Dashboard
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.icon} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickLink}
          onPress={() => router.push('/(dashboard)/fraud-reports')}
        >
          <View style={styles.quickLinkLeft}>
            <Ionicons name="warning" size={16} color={Colors.light.error} />
            <Text style={[styles.quickLinkText, { color: colors.text }]}>
              Fraud Reports
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.icon} />
        </TouchableOpacity>
      </SectionCard>

      {/* Footer */}
      {metrics && (
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.icon }]}>
            Last updated: {new Date().toLocaleTimeString()}
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

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
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

  // Uptime Banner
  uptimeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  uptimeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  uptimeText: {},
  uptimeLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  uptimeValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  uptimeRight: {},
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // KPI Grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 12,
  },
  kpiCard: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '46%',
    padding: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  kpiIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  kpiTitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  kpiSubtitle: {
    fontSize: 10,
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

  // Section Card
  sectionCard: {
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Jobs Grid
  jobsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  jobStat: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  jobStatValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  jobStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },

  // Service Status
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Errors
  alertCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  errorRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  errorLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    marginRight: 8,
  },
  errorContent: {
    flex: 1,
  },
  errorMessage: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  errorMeta: {
    fontSize: 11,
    marginTop: 3,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Quick Links
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  quickLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickLinkText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 11,
  },
});
