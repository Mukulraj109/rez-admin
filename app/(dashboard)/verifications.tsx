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
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TextInput } from 'react-native';
import {
  zoneVerificationsService,
  ZoneVerification,
  VerificationStats,
  VerificationType,
  VerificationStatus,
  UserInfo,
} from '../../services/api/zoneVerifications';
import { Colors } from '../../constants/Colors';
import { format } from 'date-fns';
import { showAlert, showConfirm } from '../../utils/alert';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';
type TypeFilter = 'all' | VerificationType;

const VERIFICATION_TYPES: { value: TypeFilter; label: string; icon: string }[] = [
  { value: 'all', label: 'All Types', icon: 'layers-outline' },
  { value: 'student', label: 'Student', icon: 'school-outline' },
  { value: 'corporate', label: 'Corporate', icon: 'briefcase-outline' },
  { value: 'defence', label: 'Defence', icon: 'shield-outline' },
  { value: 'healthcare', label: 'Healthcare', icon: 'medkit-outline' },
  { value: 'senior', label: 'Senior', icon: 'person-outline' },
  { value: 'teacher', label: 'Teacher', icon: 'book-outline' },
  { value: 'government', label: 'Government', icon: 'business-outline' },
];

export default function VerificationsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [verifications, setVerifications] = useState<ZoneVerification[]>([]);
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedVerification, setSelectedVerification] = useState<ZoneVerification | null>(null);

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailVerification, setDetailVerification] = useState<ZoneVerification | null>(null);

  // Type filter modal
  const [showTypeFilter, setShowTypeFilter] = useState(false);

  useEffect(() => {
    loadData();
    loadStats();
  }, [statusFilter, typeFilter]);

  const loadData = async (pageNum: number = 1, append: boolean = false) => {
    try {
      const data = await zoneVerificationsService.getVerifications(
        pageNum,
        20,
        statusFilter === 'all' ? 'all' : statusFilter,
        typeFilter === 'all' ? undefined : typeFilter
      );

      if (append) {
        setVerifications(prev => [...prev, ...data.verifications]);
      } else {
        setVerifications(data.verifications);
      }

      setHasMore(data.pagination.hasNext);
      setPage(pageNum);
    } catch (error) {
      if (__DEV__) console.error('Failed to load verifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await zoneVerificationsService.getStats();
      setStats(data);
    } catch (error) {
      if (__DEV__) console.error('Failed to load stats:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadData(1), loadStats()]);
    setRefreshing(false);
  }, [statusFilter, typeFilter]);

  const loadMore = () => {
    if (!isLoading && hasMore) {
      loadData(page + 1, true);
    }
  };

  const handleApprove = async (verification: ZoneVerification) => {
    showConfirm(
      'Approve Verification',
      `Are you sure you want to approve this ${verification.verificationType} verification?`,
      async () => {
        try {
          setProcessingId(verification._id);
          await zoneVerificationsService.approveVerification(verification._id);
          showAlert('Success', 'Verification approved successfully');
          await Promise.all([loadData(1), loadStats()]);
        } catch (error: any) {
          showAlert('Error', error.message);
        } finally {
          setProcessingId(null);
        }
      },
      'Approve'
    );
  };

  const handleRejectClick = (verification: ZoneVerification) => {
    setSelectedVerification(verification);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedVerification) return;

    const isRevoke = selectedVerification.status === 'approved';

    if (!isRevoke && !rejectReason.trim()) {
      showAlert('Error', 'Please provide a rejection reason');
      return;
    }

    try {
      setProcessingId(selectedVerification._id);
      if (isRevoke) {
        await zoneVerificationsService.revokeVerification(selectedVerification._id, rejectReason.trim() || undefined);
        showAlert('Success', 'Verification revoked');
      } else {
        await zoneVerificationsService.rejectVerification(selectedVerification._id, rejectReason);
        showAlert('Success', 'Verification rejected');
      }
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedVerification(null);
      await Promise.all([loadData(1), loadStats()]);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRevoke = async (verification: ZoneVerification) => {
    setSelectedVerification(verification);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleReApprove = async (verification: ZoneVerification) => {
    showConfirm(
      'Re-approve Verification',
      `Are you sure you want to re-approve this ${verification.verificationType} verification?`,
      async () => {
        try {
          setProcessingId(verification._id);
          await zoneVerificationsService.reApproveVerification(verification._id);
          showAlert('Success', 'Verification re-approved successfully');
          await Promise.all([loadData(1), loadStats()]);
        } catch (error: any) {
          showAlert('Error', error.message);
        } finally {
          setProcessingId(null);
        }
      },
      'Re-approve'
    );
  };

  const handleViewDetails = (verification: ZoneVerification) => {
    setDetailVerification(verification);
    setShowDetailModal(true);
  };

  const getUserInfo = (verification: ZoneVerification): { name: string; phone: string; email: string } => {
    const user = verification.userId as UserInfo;
    if (typeof user === 'string') {
      return { name: 'Unknown', phone: '-', email: '-' };
    }
    return {
      name: user.fullName || user.profile?.firstName || 'Unknown',
      phone: user.phoneNumber || '-',
      email: user.email || verification.submittedData?.email || '-',
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return colors.success;
      case 'pending': return colors.warning;
      case 'rejected': return colors.error;
      default: return colors.icon;
    }
  };

  const getTypeIcon = (type: string): string => {
    const found = VERIFICATION_TYPES.find(t => t.value === type);
    return found?.icon || 'document-outline';
  };

  const getTypeLabel = (type: string): string => {
    const found = VERIFICATION_TYPES.find(t => t.value === type);
    return found?.label || type;
  };

  const renderStatsCard = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.warning + '20' }]}>
          <Text style={[styles.statValue, { color: colors.warning }]}>{stats.pending}</Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.success + '20' }]}>
          <Text style={[styles.statValue, { color: colors.success }]}>{stats.approved}</Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>Approved</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.error + '20' }]}>
          <Text style={[styles.statValue, { color: colors.error }]}>{stats.rejected}</Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>Rejected</Text>
        </View>
      </View>
    );
  };

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {/* Status Filters */}
      <View style={styles.statusFilters}>
        {(['pending', 'approved', 'rejected', 'all'] as StatusFilter[]).map(status => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterChip,
              { backgroundColor: statusFilter === status ? colors.tint : colors.card },
            ]}
            onPress={() => {
              setStatusFilter(status);
              setIsLoading(true);
            }}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: statusFilter === status ? colors.card : colors.text },
              ]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Type Filter Button */}
      <TouchableOpacity
        style={[styles.typeFilterButton, { backgroundColor: colors.card }]}
        onPress={() => setShowTypeFilter(true)}
      >
        <Ionicons name={getTypeIcon(typeFilter) as any} size={18} color={colors.tint} />
        <Text style={[styles.typeFilterText, { color: colors.text }]}>
          {typeFilter === 'all' ? 'All Types' : getTypeLabel(typeFilter)}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.icon} />
      </TouchableOpacity>
    </View>
  );

  const renderVerificationItem = ({ item }: { item: ZoneVerification }) => {
    const userInfo = getUserInfo(item);
    const isProcessing = processingId === item._id;

    return (
      <TouchableOpacity
        style={[styles.verificationCard, { backgroundColor: colors.card }]}
        onPress={() => handleViewDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.typeIcon, { backgroundColor: colors.tint + '20' }]}>
            <Ionicons name={getTypeIcon(item.verificationType) as any} size={20} color={colors.tint} />
          </View>
          <View style={styles.cardHeaderInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>{userInfo.name}</Text>
            <Text style={[styles.userPhone, { color: colors.icon }]}>{userInfo.phone}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="document-text-outline" size={14} color={colors.icon} />
            <Text style={[styles.detailText, { color: colors.icon }]}>
              {getTypeLabel(item.verificationType)} Verification
            </Text>
          </View>
          {item.submittedData?.instituteName && (
            <View style={styles.detailRow}>
              <Ionicons name="business-outline" size={14} color={colors.icon} />
              <Text style={[styles.detailText, { color: colors.icon }]}>
                {item.submittedData.instituteName}
              </Text>
            </View>
          )}
          {item.submittedData?.email && (
            <View style={styles.detailRow}>
              <Ionicons name="mail-outline" size={14} color={colors.icon} />
              <Text style={[styles.detailText, { color: colors.icon }]}>
                {item.submittedData.email}
              </Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.icon} />
            <Text style={[styles.detailText, { color: colors.icon }]}>
              {format(new Date(item.createdAt), 'MMM d, yyyy h:mm a')}
            </Text>
          </View>
        </View>

        {/* Document Preview */}
        {item.submittedData?.documentUrl && (
          <View style={styles.documentPreview}>
            <Image
              source={{ uri: item.submittedData.documentUrl }}
              style={styles.documentThumbnail}
              resizeMode="cover"
            />
            <Text style={[styles.documentLabel, { color: colors.icon }]}>Document attached</Text>
          </View>
        )}

        {/* Action Buttons */}
        {item.status === 'pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.success }]}
              onPress={() => handleApprove(item)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={colors.card} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={16} color={colors.card} />
                  <Text style={styles.actionButtonText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.error }]}
              onPress={() => handleRejectClick(item)}
              disabled={isProcessing}
            >
              <Ionicons name="close" size={16} color={colors.card} />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Revoke button for approved */}
        {item.status === 'approved' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.error }]}
              onPress={() => handleRevoke(item)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={colors.card} />
              ) : (
                <>
                  <Ionicons name="ban" size={16} color={colors.card} />
                  <Text style={styles.actionButtonText}>Revoke</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Re-approve button for rejected */}
        {item.status === 'rejected' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.success }]}
              onPress={() => handleReApprove(item)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={colors.card} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={16} color={colors.card} />
                  <Text style={styles.actionButtonText}>Re-approve</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Rejection Reason */}
        {item.status === 'rejected' && item.rejectionReason && (
          <View style={[styles.rejectionBox, { backgroundColor: colors.error + '10' }]}>
            <Text style={[styles.rejectionLabel, { color: colors.error }]}>Rejection Reason:</Text>
            <Text style={[styles.rejectionText, { color: colors.text }]}>{item.rejectionReason}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading && verifications.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderStatsCard()}
      {renderFilters()}

      <FlatList
        data={verifications}
        renderItem={renderVerificationItem}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          hasMore ? <ActivityIndicator style={{ padding: 20 }} color={colors.tint} /> : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              No verifications found
            </Text>
          </View>
        }
      />

      {/* Reject Modal */}
      <Modal visible={showRejectModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {selectedVerification?.status === 'approved' ? 'Revoke Verification' : 'Reject Verification'}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.icon }]}>
              {selectedVerification?.status === 'approved'
                ? 'Provide an optional reason for revoking this verification.'
                : 'Please provide a reason for rejection. This will be shown to the user.'}
            </Text>
            <TextInput
              style={[styles.reasonInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Enter rejection reason..."
              placeholderTextColor={colors.icon}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setSelectedVerification(null);
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.error }]}
                onPress={handleRejectConfirm}
              >
                <Text style={[styles.modalButtonText, { color: colors.card }]}>
                  {selectedVerification?.status === 'approved' ? 'Revoke' : 'Reject'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Type Filter Modal */}
      <Modal visible={showTypeFilter} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTypeFilter(false)}
        >
          <View style={[styles.typeFilterModal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Filter by Type</Text>
            {VERIFICATION_TYPES.map(type => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeFilterOption,
                  typeFilter === type.value && { backgroundColor: colors.tint + '20' },
                ]}
                onPress={() => {
                  setTypeFilter(type.value);
                  setShowTypeFilter(false);
                  setIsLoading(true);
                }}
              >
                <Ionicons name={type.icon as any} size={20} color={typeFilter === type.value ? colors.tint : colors.icon} />
                <Text style={[styles.typeFilterOptionText, { color: typeFilter === type.value ? colors.tint : colors.text }]}>
                  {type.label}
                </Text>
                {typeFilter === type.value && (
                  <Ionicons name="checkmark" size={20} color={colors.tint} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.detailModalOverlay}>
          <View style={[styles.detailModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.detailModalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>
                Verification Details
              </Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color={colors.icon} />
              </TouchableOpacity>
            </View>

            {detailVerification && (
              <ScrollView style={styles.detailModalBody} showsVerticalScrollIndicator={false}>
                {/* User Info */}
                <View style={styles.detailSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>User Information</Text>
                  <View style={[styles.infoCard, { backgroundColor: colors.background }]}>
                    <View style={styles.infoRow}>
                      <Ionicons name="person-outline" size={18} color={colors.icon} />
                      <View style={styles.infoContent}>
                        <Text style={[styles.infoLabel, { color: colors.icon }]}>Name</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                          {getUserInfo(detailVerification).name}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="call-outline" size={18} color={colors.icon} />
                      <View style={styles.infoContent}>
                        <Text style={[styles.infoLabel, { color: colors.icon }]}>Phone</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                          {getUserInfo(detailVerification).phone}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="mail-outline" size={18} color={colors.icon} />
                      <View style={styles.infoContent}>
                        <Text style={[styles.infoLabel, { color: colors.icon }]}>Email</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                          {getUserInfo(detailVerification).email}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Verification Info */}
                <View style={styles.detailSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Verification Info</Text>
                  <View style={[styles.infoCard, { backgroundColor: colors.background }]}>
                    <View style={styles.infoRow}>
                      <Ionicons name="document-text-outline" size={18} color={colors.icon} />
                      <View style={styles.infoContent}>
                        <Text style={[styles.infoLabel, { color: colors.icon }]}>Type</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                          {getTypeLabel(detailVerification.verificationType)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="flag-outline" size={18} color={colors.icon} />
                      <View style={styles.infoContent}>
                        <Text style={[styles.infoLabel, { color: colors.icon }]}>Status</Text>
                        <Text style={[styles.infoValue, { color: getStatusColor(detailVerification.status) }]}>
                          {detailVerification.status.charAt(0).toUpperCase() + detailVerification.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                    {detailVerification.submittedData?.documentType && (
                      <View style={styles.infoRow}>
                        <Ionicons name="folder-outline" size={18} color={colors.icon} />
                        <View style={styles.infoContent}>
                          <Text style={[styles.infoLabel, { color: colors.icon }]}>Document Type</Text>
                          <Text style={[styles.infoValue, { color: colors.text }]}>
                            {detailVerification.submittedData.documentType}
                          </Text>
                        </View>
                      </View>
                    )}
                    {detailVerification.submittedData?.instituteName && (
                      <View style={styles.infoRow}>
                        <Ionicons name="business-outline" size={18} color={colors.icon} />
                        <View style={styles.infoContent}>
                          <Text style={[styles.infoLabel, { color: colors.icon }]}>Institution</Text>
                          <Text style={[styles.infoValue, { color: colors.text }]}>
                            {detailVerification.submittedData.instituteName}
                          </Text>
                        </View>
                      </View>
                    )}
                    <View style={styles.infoRow}>
                      <Ionicons name="calendar-outline" size={18} color={colors.icon} />
                      <View style={styles.infoContent}>
                        <Text style={[styles.infoLabel, { color: colors.icon }]}>Submitted</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                          {format(new Date(detailVerification.createdAt), 'MMMM d, yyyy h:mm a')}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Document Image */}
                {detailVerification.submittedData?.documentUrl && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Uploaded Document</Text>
                    <Image
                      source={{ uri: detailVerification.submittedData.documentUrl }}
                      style={styles.documentImage}
                      resizeMode="contain"
                    />
                  </View>
                )}

                {/* Rejection Reason */}
                {detailVerification.status === 'rejected' && detailVerification.rejectionReason && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.sectionTitle, { color: colors.error }]}>Rejection Reason</Text>
                    <View style={[styles.rejectionBox, { backgroundColor: colors.error + '10' }]}>
                      <Text style={[styles.rejectionText, { color: colors.text }]}>
                        {detailVerification.rejectionReason}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Actions for pending */}
                {detailVerification.status === 'pending' && (
                  <View style={styles.detailActions}>
                    <TouchableOpacity
                      style={[styles.detailActionButton, { backgroundColor: colors.success }]}
                      onPress={() => {
                        setShowDetailModal(false);
                        handleApprove(detailVerification);
                      }}
                    >
                      <Ionicons name="checkmark" size={20} color={colors.card} />
                      <Text style={styles.detailActionText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.detailActionButton, { backgroundColor: colors.error }]}
                      onPress={() => {
                        setShowDetailModal(false);
                        handleRejectClick(detailVerification);
                      }}
                    >
                      <Ionicons name="close" size={20} color={colors.card} />
                      <Text style={styles.detailActionText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Revoke for approved */}
                {detailVerification.status === 'approved' && (
                  <View style={styles.detailActions}>
                    <TouchableOpacity
                      style={[styles.detailActionButton, { backgroundColor: colors.error }]}
                      onPress={() => {
                        setShowDetailModal(false);
                        handleRevoke(detailVerification);
                      }}
                    >
                      <Ionicons name="ban" size={20} color={colors.card} />
                      <Text style={styles.detailActionText}>Revoke Verification</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Re-approve for rejected */}
                {detailVerification.status === 'rejected' && (
                  <View style={styles.detailActions}>
                    <TouchableOpacity
                      style={[styles.detailActionButton, { backgroundColor: colors.success }]}
                      onPress={() => {
                        setShowDetailModal(false);
                        handleReApprove(detailVerification);
                      }}
                    >
                      <Ionicons name="checkmark" size={20} color={colors.card} />
                      <Text style={styles.detailActionText}>Re-approve</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.tint }]}
              onPress={() => setShowDetailModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
    gap: 8,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  statusFilters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  typeFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  typeFilterText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  verificationCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userPhone: {
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cardDetails: {
    marginTop: 12,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
  },
  documentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  documentThumbnail: {
    width: 60,
    height: 40,
    borderRadius: 6,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  documentLabel: {
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    color: Colors.light.card,
    fontWeight: '600',
    fontSize: 14,
  },
  rejectionBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  rejectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 13,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontWeight: '600',
  },
  typeFilterModal: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
  },
  typeFilterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 12,
  },
  typeFilterOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  detailModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailModalBody: {
    maxHeight: 500,
  },
  detailSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoCard: {
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  documentImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  detailActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  detailActionText: {
    color: Colors.light.card,
    fontWeight: '600',
    fontSize: 16,
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: Colors.light.card,
    fontWeight: '600',
    fontSize: 16,
  },
});
