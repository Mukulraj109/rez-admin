import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { exploreService, Video, VideoStats, ExploreStats } from '../../services/api/explore';
import { showAlert, showConfirm } from '../../utils/alert';

type TabType = 'videos' | 'reviews' | 'comparisons';
type VideoStatusFilter = 'all' | 'published' | 'unpublished' | 'featured' | 'trending' | 'pending';

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('videos');

  // Stats
  const [exploreStats, setExploreStats] = useState<ExploreStats | null>(null);
  const [videoStats, setVideoStats] = useState<VideoStats | null>(null);

  // Videos state
  const [videos, setVideos] = useState<Video[]>([]);
  const [videoFilter, setVideoFilter] = useState<VideoStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [processingVideo, setProcessingVideo] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  // New video form
  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    videoUrl: '',
    thumbnail: '',
    isPublished: false,
    isFeatured: false,
    isTrending: false,
  });

  useEffect(() => {
    loadStats();
    loadData();
  }, [videoFilter, searchQuery]);

  const loadStats = async () => {
    try {
      const [explore, video] = await Promise.all([
        exploreService.getStats(),
        exploreService.getVideoStats()
      ]);
      setExploreStats(explore);
      setVideoStats(video);
    } catch (error: any) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadData = async (pageNum: number = 1, append: boolean = false) => {
    try {
      let status: string | undefined;
      let featured: boolean | undefined;
      let trending: boolean | undefined;

      switch (videoFilter) {
        case 'published':
          status = 'published';
          break;
        case 'unpublished':
          status = 'unpublished';
          break;
        case 'featured':
          featured = true;
          break;
        case 'trending':
          trending = true;
          break;
        case 'pending':
          status = 'pending';
          break;
      }

      const data = await exploreService.getVideos(
        pageNum,
        20,
        status,
        undefined,
        featured,
        trending,
        searchQuery || undefined
      );

      if (append) {
        setVideos(prev => [...prev, ...data.videos]);
      } else {
        setVideos(data.videos);
      }

      setHasMore(data.pagination.current < data.pagination.pages);
      setPage(pageNum);
    } catch (error: any) {
      console.error('Failed to load videos:', error);
      showAlert('Error', error.message || 'Failed to load videos');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadStats(), loadData(1)]);
    setRefreshing(false);
  }, [videoFilter, searchQuery]);

  const loadMore = () => {
    if (!isLoading && hasMore) {
      loadData(page + 1, true);
    }
  };

  // Video actions
  const handleTogglePublish = async (video: Video) => {
    try {
      setProcessingVideo(video.id);
      await exploreService.togglePublished(video.id, !video.isPublished);
      showAlert('Success', `Video ${video.isPublished ? 'unpublished' : 'published'} successfully`);
      await loadData(1);
      await loadStats();
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setProcessingVideo(null);
    }
  };

  const handleToggleFeatured = async (video: Video) => {
    try {
      setProcessingVideo(video.id);
      await exploreService.toggleFeatured(video.id, !video.isFeatured);
      showAlert('Success', `Video ${video.isFeatured ? 'unfeatured' : 'featured'} successfully`);
      await loadData(1);
      await loadStats();
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setProcessingVideo(null);
    }
  };

  const handleToggleTrending = async (video: Video) => {
    try {
      setProcessingVideo(video.id);
      await exploreService.toggleTrending(video.id, !video.isTrending);
      showAlert('Success', `Video ${video.isTrending ? 'removed from trending' : 'marked as trending'}`);
      await loadData(1);
      await loadStats();
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setProcessingVideo(null);
    }
  };

  const handleDeleteVideo = async (video: Video) => {
    showConfirm(
      'Delete Video',
      `Are you sure you want to delete "${video.title}"? This action cannot be undone.`,
      async () => {
        try {
          setProcessingVideo(video.id);
          await exploreService.deleteVideo(video.id);
          showAlert('Success', 'Video deleted successfully');
          await loadData(1);
          await loadStats();
        } catch (error: any) {
          showAlert('Error', error.message);
        } finally {
          setProcessingVideo(null);
        }
      },
      'Delete'
    );
  };

  const handleCreateVideo = async () => {
    if (!newVideo.title.trim() || !newVideo.videoUrl.trim()) {
      showAlert('Error', 'Title and Video URL are required');
      return;
    }

    try {
      setIsLoading(true);
      await exploreService.createVideo({
        title: newVideo.title,
        description: newVideo.description,
        videoUrl: newVideo.videoUrl,
        thumbnail: newVideo.thumbnail,
        isPublished: newVideo.isPublished,
        isFeatured: newVideo.isFeatured,
        isTrending: newVideo.isTrending,
      });
      showAlert('Success', 'Video created successfully');
      setShowAddModal(false);
      setNewVideo({
        title: '',
        description: '',
        videoUrl: '',
        thumbnail: '',
        isPublished: false,
        isFeatured: false,
        isTrending: false,
      });
      await loadData(1);
      await loadStats();
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Render stats cards
  const renderStatsCards = () => (
    <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.background }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {videoStats?.total || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Videos</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.background }]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>
            {videoStats?.published || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Published</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.background }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>
            {videoStats?.featured || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Featured</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.background }]}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>
            {videoStats?.trending || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Trending</Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.background }]}>
          <Text style={[styles.statValue, { color: '#8B5CF6' }]}>
            {formatNumber(videoStats?.totalViews || 0)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Views</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.background }]}>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>
            {videoStats?.pending || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.background }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {exploreStats?.reviews.featured || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Featured Reviews</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.background }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {exploreStats?.deals.active || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active Deals</Text>
        </View>
      </View>
    </View>
  );

  // Render filter chips
  const renderFilterChips = () => {
    const filters: { key: VideoStatusFilter; label: string }[] = [
      { key: 'all', label: 'All' },
      { key: 'published', label: 'Published' },
      { key: 'unpublished', label: 'Unpublished' },
      { key: 'featured', label: 'Featured' },
      { key: 'trending', label: 'Trending' },
      { key: 'pending', label: 'Pending' },
    ];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map(filter => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterChip,
              { backgroundColor: videoFilter === filter.key ? colors.tint : colors.card },
            ]}
            onPress={() => setVideoFilter(filter.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: videoFilter === filter.key ? '#FFF' : colors.textSecondary },
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  // Render video card
  const renderVideoCard = ({ item }: { item: Video }) => {
    const isProcessing = processingVideo === item.id;

    return (
      <View style={[styles.videoCard, { backgroundColor: colors.card }]}>
        <View style={styles.videoHeader}>
          {item.thumbnail ? (
            <Image source={{ uri: item.thumbnail }} style={styles.videoThumbnail} />
          ) : (
            <View style={[styles.videoThumbnailPlaceholder, { backgroundColor: colors.border }]}>
              <Ionicons name="videocam" size={24} color={colors.textSecondary} />
            </View>
          )}
          <View style={styles.videoInfo}>
            <Text style={[styles.videoTitle, { color: colors.text }]} numberOfLines={2}>
              {item.title}
            </Text>
            {item.creator && (
              <Text style={[styles.videoCreator, { color: colors.textSecondary }]}>
                by {item.creator.name}
              </Text>
            )}
            <View style={styles.videoBadges}>
              {item.isPublished && (
                <View style={[styles.badge, { backgroundColor: '#10B981' }]}>
                  <Text style={styles.badgeText}>Published</Text>
                </View>
              )}
              {item.isFeatured && (
                <View style={[styles.badge, { backgroundColor: '#F59E0B' }]}>
                  <Text style={styles.badgeText}>Featured</Text>
                </View>
              )}
              {item.isTrending && (
                <View style={[styles.badge, { backgroundColor: '#EF4444' }]}>
                  <Text style={styles.badgeText}>Trending</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.videoStats}>
          <View style={styles.videoStatItem}>
            <Ionicons name="eye" size={14} color={colors.textSecondary} />
            <Text style={[styles.videoStatText, { color: colors.textSecondary }]}>
              {formatNumber(item.analytics.views)}
            </Text>
          </View>
          <View style={styles.videoStatItem}>
            <Ionicons name="heart" size={14} color={colors.textSecondary} />
            <Text style={[styles.videoStatText, { color: colors.textSecondary }]}>
              {formatNumber(item.analytics.likes)}
            </Text>
          </View>
          <View style={styles.videoStatItem}>
            <Ionicons name="chatbubble" size={14} color={colors.textSecondary} />
            <Text style={[styles.videoStatText, { color: colors.textSecondary }]}>
              {formatNumber(item.analytics.comments)}
            </Text>
          </View>
        </View>

        {isProcessing ? (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="small" color={colors.tint} />
          </View>
        ) : (
          <View style={styles.videoActions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: item.isPublished ? '#FEE2E2' : '#D1FAE5' }]}
              onPress={() => handleTogglePublish(item)}
            >
              <Ionicons
                name={item.isPublished ? 'eye-off' : 'eye'}
                size={16}
                color={item.isPublished ? '#EF4444' : '#10B981'}
              />
              <Text style={{ color: item.isPublished ? '#EF4444' : '#10B981', fontSize: 12, marginLeft: 4 }}>
                {item.isPublished ? 'Unpublish' : 'Publish'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: item.isFeatured ? '#FEF3C7' : colors.border }]}
              onPress={() => handleToggleFeatured(item)}
            >
              <Ionicons
                name={item.isFeatured ? 'star' : 'star-outline'}
                size={16}
                color={item.isFeatured ? '#F59E0B' : colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: item.isTrending ? '#FEE2E2' : colors.border }]}
              onPress={() => handleToggleTrending(item)}
            >
              <Ionicons
                name="flame"
                size={16}
                color={item.isTrending ? '#EF4444' : colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.border }]}
              onPress={() => {
                setSelectedVideo(item);
                setShowDetailModal(true);
              }}
            >
              <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}
              onPress={() => handleDeleteVideo(item)}
            >
              <Ionicons name="trash" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Add Video Modal
  const renderAddModal = () => (
    <Modal visible={showAddModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add New Video</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Enter video title"
              placeholderTextColor={colors.textSecondary}
              value={newVideo.title}
              onChangeText={(text) => setNewVideo(prev => ({ ...prev, title: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Enter description"
              placeholderTextColor={colors.textSecondary}
              value={newVideo.description}
              onChangeText={(text) => setNewVideo(prev => ({ ...prev, description: text }))}
              multiline
              numberOfLines={3}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Video URL (Cloudinary) *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="https://res.cloudinary.com/..."
              placeholderTextColor={colors.textSecondary}
              value={newVideo.videoUrl}
              onChangeText={(text) => setNewVideo(prev => ({ ...prev, videoUrl: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Thumbnail URL</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="https://res.cloudinary.com/..."
              placeholderTextColor={colors.textSecondary}
              value={newVideo.thumbnail}
              onChangeText={(text) => setNewVideo(prev => ({ ...prev, thumbnail: text }))}
            />

            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setNewVideo(prev => ({ ...prev, isPublished: !prev.isPublished }))}
              >
                <Ionicons
                  name={newVideo.isPublished ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={newVideo.isPublished ? colors.tint : colors.textSecondary}
                />
                <Text style={[styles.checkboxLabel, { color: colors.text }]}>Publish immediately</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setNewVideo(prev => ({ ...prev, isFeatured: !prev.isFeatured }))}
              >
                <Ionicons
                  name={newVideo.isFeatured ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={newVideo.isFeatured ? '#F59E0B' : colors.textSecondary}
                />
                <Text style={[styles.checkboxLabel, { color: colors.text }]}>Mark as Featured</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setNewVideo(prev => ({ ...prev, isTrending: !prev.isTrending }))}
              >
                <Ionicons
                  name={newVideo.isTrending ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={newVideo.isTrending ? '#EF4444' : colors.textSecondary}
                />
                <Text style={[styles.checkboxLabel, { color: colors.text }]}>Mark as Trending</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.border }]}
              onPress={() => setShowAddModal(false)}
            >
              <Text style={{ color: colors.text }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.tint }]}
              onPress={handleCreateVideo}
            >
              <Text style={{ color: '#FFF', fontWeight: '600' }}>Create Video</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Detail Modal
  const renderDetailModal = () => {
    if (!selectedVideo) return null;

    return (
      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Video Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedVideo.thumbnail && (
                <Image source={{ uri: selectedVideo.thumbnail }} style={styles.detailThumbnail} />
              )}

              <Text style={[styles.detailTitle, { color: colors.text }]}>{selectedVideo.title}</Text>

              {selectedVideo.description && (
                <Text style={[styles.detailDescription, { color: colors.textSecondary }]}>
                  {selectedVideo.description}
                </Text>
              )}

              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Status:</Text>
                <View style={styles.detailBadges}>
                  {selectedVideo.isPublished && (
                    <View style={[styles.badge, { backgroundColor: '#10B981' }]}>
                      <Text style={styles.badgeText}>Published</Text>
                    </View>
                  )}
                  {selectedVideo.isFeatured && (
                    <View style={[styles.badge, { backgroundColor: '#F59E0B' }]}>
                      <Text style={styles.badgeText}>Featured</Text>
                    </View>
                  )}
                  {selectedVideo.isTrending && (
                    <View style={[styles.badge, { backgroundColor: '#EF4444' }]}>
                      <Text style={styles.badgeText}>Trending</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Views:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {formatNumber(selectedVideo.analytics.views)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Likes:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {formatNumber(selectedVideo.analytics.likes)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Content Type:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedVideo.contentType}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Created:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {new Date(selectedVideo.createdAt).toLocaleDateString()}
                </Text>
              </View>

              {selectedVideo.creator && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Creator:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedVideo.creator.name}
                  </Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Video URL:</Text>
                <Text style={[styles.detailValue, { color: colors.tint }]} numberOfLines={2}>
                  {selectedVideo.videoUrl}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
                onPress={() => setShowDetailModal(false)}
              >
                <Text style={{ color: colors.text }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Explore Management</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.tint }]}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addBtnText}>Add Video</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {renderStatsCards()}

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search videos..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filters */}
      {renderFilterChips()}

      {/* Videos List */}
      {isLoading && videos.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={videos}
          keyExtractor={item => item.id}
          renderItem={renderVideoCard}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="videocam-off-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No videos found</Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.tint }]}
                onPress={() => setShowAddModal(true)}
              >
                <Text style={styles.emptyBtnText}>Add your first video</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Modals */}
      {renderAddModal()}
      {renderDetailModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  statsContainer: {
    padding: 16,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterContainer: {
    marginBottom: 12,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  videoCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  videoHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  videoThumbnail: {
    width: 80,
    height: 60,
    borderRadius: 8,
  },
  videoThumbnailPlaceholder: {
    width: 80,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  videoCreator: {
    fontSize: 12,
    marginBottom: 6,
  },
  videoBadges: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  videoStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  videoStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoStatText: {
    fontSize: 12,
  },
  videoActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  processingOverlay: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
  emptyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyBtnText: {
    color: '#FFF',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  checkboxRow: {
    marginTop: 16,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxLabel: {
    fontSize: 14,
  },
  detailThumbnail: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  detailDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  detailBadges: {
    flexDirection: 'row',
    gap: 4,
  },
});
