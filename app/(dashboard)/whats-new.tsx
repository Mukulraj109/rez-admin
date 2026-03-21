import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Switch,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { apiClient } from '../../services/api/apiClient';
import { showAlert, showConfirm } from '../../utils/alert';
import { format } from 'date-fns';

interface Story {
  _id: string;
  title: string;
  subtitle?: string;
  icon: string;
  storyType?: string;
  validity: { startDate: string; endDate: string; isActive: boolean };
  analytics: { views: number; clicks: number; completions: number };
  metadata?: { sourceType?: string; sourceId?: string };
  createdAt: string;
}

export default function WhatsNewAdminScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await apiClient.get<{ stories: Story[] }>('whats-new/admin/all');
      setStories(res.data?.stories || []);
    } catch {
      showAlert('Error', 'Failed to load stories');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = useCallback(async (story: Story) => {
    try {
      await apiClient.put(`whats-new/admin/${story._id}`, {
        validity: { ...story.validity, isActive: !story.validity.isActive },
      });
      load();
    } catch {
      showAlert('Error', 'Failed to update story');
    }
  }, [load]);

  const deleteStory = useCallback(async (id: string) => {
    const confirmed = await showConfirm('Delete Story', 'Are you sure you want to delete this story?');
    if (!confirmed) return;
    try {
      await apiClient.delete(`whats-new/admin/${id}`);
      load();
    } catch {
      showAlert('Error', 'Failed to delete story');
    }
  }, [load]);

  const activeCount = stories.filter(s => s.validity.isActive).length;

  const renderStory = useCallback(({ item }: { item: Story }) => {
    const isExpired = new Date(item.validity.endDate) < new Date();
    const isEmoji = item.icon && !item.icon.startsWith('http');

    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.iconText}>
              {isEmoji ? item.icon : '🖼️'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              {item.subtitle ? (
                <Text style={[styles.subtitle, { color: colors.tabIconDefault }]} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              ) : null}
            </View>
          </View>
          <Switch
            value={item.validity.isActive}
            onValueChange={() => toggleActive(item)}
            trackColor={{ true: colors.tint }}
          />
        </View>

        {/* Tags */}
        <View style={styles.tagsRow}>
          {item.storyType ? (
            <View style={[styles.tag, { backgroundColor: colors.tint + '20' }]}>
              <Text style={[styles.tagText, { color: colors.tint }]}>
                {item.storyType.replace(/_/g, ' ')}
              </Text>
            </View>
          ) : null}
          {item.metadata?.sourceType === 'campaign' ? (
            <View style={[styles.tag, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.tagText, { color: '#92400E' }]}>Auto-generated</Text>
            </View>
          ) : null}
          {isExpired ? (
            <View style={[styles.tag, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.tagText, { color: '#DC2626' }]}>Expired</Text>
            </View>
          ) : null}
        </View>

        {/* Validity */}
        <Text style={[styles.dateText, { color: colors.tabIconDefault }]}>
          {format(new Date(item.validity.startDate), 'd MMM')} →{' '}
          {format(new Date(item.validity.endDate), 'd MMM yyyy')}
        </Text>

        {/* Analytics */}
        <View style={styles.analyticsRow}>
          {[
            { label: 'Views', value: item.analytics?.views ?? 0, icon: 'eye-outline' as const },
            { label: 'Clicks', value: item.analytics?.clicks ?? 0, icon: 'hand-left-outline' as const },
            { label: 'Completions', value: item.analytics?.completions ?? 0, icon: 'checkmark-circle-outline' as const },
          ].map(({ label, value, icon }) => (
            <View key={label} style={styles.analyticItem}>
              <Ionicons name={icon} size={14} color={colors.tint} />
              <Text style={[styles.analyticValue, { color: colors.tint }]}>{value}</Text>
              <Text style={[styles.analyticLabel, { color: colors.tabIconDefault }]}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Delete */}
        <TouchableOpacity
          onPress={() => deleteStory(item._id)}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={14} color="#EF4444" />
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  }, [colors, toggleActive, deleteStory]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          What's New Stories
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.tabIconDefault }]}>
          {stories.length} stories · {activeCount} active
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={stories}
          keyExtractor={s => s._id}
          renderItem={renderStory}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="sparkles-outline" size={48} color={colors.tabIconDefault} />
              <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
                No stories yet. Create one from campaigns or manually.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 120,
  },
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconText: {
    fontSize: 24,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 11,
    marginTop: 8,
  },
  analyticsRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 8,
  },
  analyticItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  analyticValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  analyticLabel: {
    fontSize: 10,
  },
  deleteBtn: {
    marginTop: 10,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
  },
});
