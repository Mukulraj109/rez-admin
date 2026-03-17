'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity,
  useColorScheme, ActivityIndicator, TextInput, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert } from '../../utils/alert';
import { fraudReportAdminService, FraudReport } from '../../services/api/fraudReports';
import { format } from 'date-fns';

// ============================================
// TYPES & CONSTANTS
// ============================================
type StatusFilter = 'all' | 'new' | 'investigating' | 'resolved' | 'dismissed';
type PriorityFilter = 'all' | 'low' | 'medium' | 'high' | 'critical';
type CategoryFilter = 'all' | 'unauthorized_transaction' | 'account_takeover' | 'phishing' | 'fake_merchant' | 'counterfeit_product' | 'other';

const STATUS_OPTIONS: StatusFilter[] = ['all', 'new', 'investigating', 'resolved', 'dismissed'];
const PRIORITY_OPTIONS: PriorityFilter[] = ['all', 'low', 'medium', 'high', 'critical'];
const CATEGORY_OPTIONS: CategoryFilter[] = [
  'all', 'unauthorized_transaction', 'account_takeover', 'phishing',
  'fake_merchant', 'counterfeit_product', 'other',
];

const STATUS_LABELS: Record<string, string> = {
  all: 'All', new: 'New', investigating: 'Investigating', resolved: 'Resolved', dismissed: 'Dismissed',
};

const PRIORITY_LABELS: Record<string, string> = {
  all: 'All', low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical',
};

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All Categories',
  unauthorized_transaction: 'Unauthorized Txn',
  account_takeover: 'Account Takeover',
  phishing: 'Phishing',
  fake_merchant: 'Fake Merchant',
  counterfeit_product: 'Counterfeit Product',
  other: 'Other',
};

const STATUS_COLORS: Record<string, string> = {
  new: Colors.light.info,
  investigating: Colors.light.warning,
  resolved: Colors.light.success,
  dismissed: Colors.light.mutedDark,
};

const PRIORITY_COLORS: Record<string, string> = {
  low: Colors.light.mutedDark,
  medium: Colors.light.info,
  high: Colors.light.warning,
  critical: Colors.light.error,
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function FraudReportsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Data
  const [reports, setReports] = useState<FraudReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const LIMIT = 20;

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<FraudReport | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Note input
  const [noteText, setNoteText] = useState('');
  const [noteSending, setNoteSending] = useState(false);

  // Status update modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusReportId, setStatusReportId] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Priority update modal
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [priorityReportId, setPriorityReportId] = useState<string | null>(null);
  const [priorityUpdating, setPriorityUpdating] = useState(false);

  // Reload on filter changes
  useEffect(() => {
    setPage(1);
    loadReports(1);
  }, [statusFilter, priorityFilter, categoryFilter]);

  // DATA LOADING
  const loadReports = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) setIsLoading(true);
      const data = await fraudReportAdminService.list({
        page: pageNum,
        limit: LIMIT,
        status: statusFilter === 'all' ? undefined : statusFilter,
        priority: priorityFilter === 'all' ? undefined : priorityFilter,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
      });

      if (append) {
        setReports(prev => [...prev, ...data.reports]);
      } else {
        setReports(data.reports);
      }
      setTotalPages(data.pages);
      setTotalCount(data.total);
      setPage(pageNum);
    } catch (error: any) {
      if (__DEV__) console.error('Failed to load fraud reports:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReports(1);
    setRefreshing(false);
  }, [statusFilter, priorityFilter, categoryFilter]);

  const loadMore = () => {
    if (!isLoading && page < totalPages) {
      loadReports(page + 1, true);
    }
  };

  // ACTIONS
  const openReportDetail = async (report: FraudReport) => {
    setSelectedReport(report);
    setNoteText('');
    setShowDetailModal(true);
    setDetailLoading(true);
    const fresh = await fraudReportAdminService.getById(report._id);
    if (fresh) setSelectedReport(fresh);
    setDetailLoading(false);
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || !selectedReport) {
      showAlert('Error', 'Please enter a note.');
      return;
    }
    setNoteSending(true);
    try {
      const success = await fraudReportAdminService.addNote(selectedReport._id, noteText.trim());
      if (success) {
        showAlert('Success', 'Note added successfully.');
        setNoteText('');
        const fresh = await fraudReportAdminService.getById(selectedReport._id);
        if (fresh) setSelectedReport(fresh);
      } else {
        showAlert('Error', 'Failed to add note.');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to add note.');
    } finally {
      setNoteSending(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!statusReportId) return;
    setStatusUpdating(true);
    try {
      const success = await fraudReportAdminService.updateStatus(statusReportId, newStatus);
      if (success) {
        showAlert('Success', `Status updated to ${STATUS_LABELS[newStatus] || newStatus}.`);
        setShowStatusModal(false);
        setStatusReportId(null);
        if (selectedReport && selectedReport._id === statusReportId) {
          const fresh = await fraudReportAdminService.getById(statusReportId);
          if (fresh) setSelectedReport(fresh);
        }
        loadReports(1);
      } else {
        showAlert('Error', 'Failed to update status.');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to update status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handlePriorityUpdate = async (newPriority: string) => {
    if (!priorityReportId) return;
    setPriorityUpdating(true);
    try {
      const success = await fraudReportAdminService.updatePriority(priorityReportId, newPriority);
      if (success) {
        showAlert('Success', `Priority updated to ${PRIORITY_LABELS[newPriority] || newPriority}.`);
        setShowPriorityModal(false);
        setPriorityReportId(null);
        if (selectedReport && selectedReport._id === priorityReportId) {
          const fresh = await fraudReportAdminService.getById(priorityReportId);
          if (fresh) setSelectedReport(fresh);
        }
        loadReports(1);
      } else {
        showAlert('Error', 'Failed to update priority.');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to update priority.');
    } finally {
      setPriorityUpdating(false);
    }
  };

  // HELPERS
  const getStatusColor = (status: string) => STATUS_COLORS[status] || colors.mutedDark;
  const getPriorityColor = (priority: string) => PRIORITY_COLORS[priority] || colors.mutedDark;

  const formatDate = (dateStr: string) => {
    try { return format(new Date(dateStr), 'MMM d, yyyy h:mm a'); } catch { return dateStr; }
  };

  const formatShortDate = (dateStr: string) => {
    try { return format(new Date(dateStr), 'MMM d, yyyy'); } catch { return dateStr; }
  };

  const truncate = (str: string, len: number) => str.length > len ? str.slice(0, len) + '...' : str;

  // RENDERERS
  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {/* Status filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollRow}>
        <Text style={[styles.filterLabel, { color: colors.icon }]}>Status:</Text>
        {STATUS_OPTIONS.map(status => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterChip,
              { backgroundColor: statusFilter === status ? (STATUS_COLORS[status] || colors.tint) : colors.card },
            ]}
            onPress={() => setStatusFilter(status)}
          >
            <Text style={[
              styles.filterChipText,
              { color: statusFilter === status ? colors.card : colors.text },
            ]}>
              {STATUS_LABELS[status]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Priority filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollRow}>
        <Text style={[styles.filterLabel, { color: colors.icon }]}>Priority:</Text>
        {PRIORITY_OPTIONS.map(prio => (
          <TouchableOpacity
            key={prio}
            style={[
              styles.filterChip,
              { backgroundColor: priorityFilter === prio ? (PRIORITY_COLORS[prio] || colors.navy) : colors.card },
            ]}
            onPress={() => setPriorityFilter(prio)}
          >
            <Text style={[
              styles.filterChipText,
              { color: priorityFilter === prio ? colors.card : colors.text },
            ]}>
              {prio === 'all' ? 'All Priority' : PRIORITY_LABELS[prio]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollRow}>
        <Text style={[styles.filterLabel, { color: colors.icon }]}>Category:</Text>
        {CATEGORY_OPTIONS.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.filterChip,
              { backgroundColor: categoryFilter === cat ? colors.navy : colors.card },
            ]}
            onPress={() => setCategoryFilter(cat)}
          >
            <Text style={[
              styles.filterChipText,
              { color: categoryFilter === cat ? colors.card : colors.text },
            ]}>
              {CATEGORY_LABELS[cat]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderReportItem = ({ item }: { item: FraudReport }) => {
    const statusColor = getStatusColor(item.status);
    const priorityColor = getPriorityColor(item.priority);

    return (
      <TouchableOpacity
        style={[styles.reportCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => openReportDetail(item)}
      >
        {/* Header: user + badges */}
        <View style={styles.reportHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.reportUser, { color: colors.text }]}>
              {item.user?.fullName || item.user?.phoneNumber || 'Unknown User'}
            </Text>
            <Text style={[styles.reportCategory, { color: colors.icon }]}>
              {CATEGORY_LABELS[item.category] || item.category}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <View style={[styles.badge, { backgroundColor: `${statusColor}20` }]}>
              <Text style={[styles.badgeText, { color: statusColor }]}>
                {STATUS_LABELS[item.status] || item.status}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: `${priorityColor}20` }]}>
              <Text style={[styles.badgeText, { color: priorityColor }]}>
                {PRIORITY_LABELS[item.priority] || item.priority}
              </Text>
            </View>
          </View>
        </View>

        {/* Description */}
        <Text style={[styles.reportDescription, { color: colors.secondaryText }]} numberOfLines={2}>
          {item.description}
        </Text>

        {/* Footer */}
        <View style={styles.reportFooter}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={13} color={colors.icon} />
            <Text style={[styles.dateText, { color: colors.icon }]}>
              {formatShortDate(item.createdAt)}
            </Text>
          </View>
          {item.evidence?.length > 0 && (
            <View style={styles.detailRow}>
              <Ionicons name="attach-outline" size={13} color={colors.icon} />
              <Text style={[styles.dateText, { color: colors.icon }]}>
                {item.evidence.length} evidence
              </Text>
            </View>
          )}
          {item.internalNotes?.length > 0 && (
            <View style={styles.detailRow}>
              <Ionicons name="chatbox-ellipses-outline" size={13} color={colors.icon} />
              <Text style={[styles.dateText, { color: colors.icon }]}>
                {item.internalNotes.length} notes
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <View style={[styles.paginationRow, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.pageBtn, { backgroundColor: page > 1 ? colors.tint : colors.border }]}
          onPress={() => { if (page > 1) loadReports(page - 1); }}
          disabled={page <= 1}
        >
          <Ionicons name="chevron-back" size={18} color={page > 1 ? colors.card : colors.icon} />
        </TouchableOpacity>
        <Text style={[styles.pageText, { color: colors.text }]}>
          Page {page} of {totalPages}
        </Text>
        <TouchableOpacity
          style={[styles.pageBtn, { backgroundColor: page < totalPages ? colors.tint : colors.border }]}
          onPress={() => { if (page < totalPages) loadReports(page + 1); }}
          disabled={page >= totalPages}
        >
          <Ionicons name="chevron-forward" size={18} color={page < totalPages ? colors.card : colors.icon} />
        </TouchableOpacity>
      </View>
    );
  };

  // DETAIL MODAL
  const renderDetailModal = () => {
    if (!selectedReport) return null;
    const statusColor = getStatusColor(selectedReport.status);
    const priorityColor = getPriorityColor(selectedReport.priority);

    return (
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Fraud Report</Text>
                <Text style={[styles.modalSubtitle, { color: colors.icon }]}>
                  {CATEGORY_LABELS[selectedReport.category] || selectedReport.category}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color={colors.icon} />
              </TouchableOpacity>
            </View>

            {/* Badges */}
            <View style={styles.metaRow}>
              <View style={[styles.badge, { backgroundColor: `${statusColor}20` }]}>
                <Text style={[styles.badgeText, { color: statusColor }]}>
                  {STATUS_LABELS[selectedReport.status] || selectedReport.status}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: `${priorityColor}20` }]}>
                <Text style={[styles.badgeText, { color: priorityColor }]}>
                  {PRIORITY_LABELS[selectedReport.priority] || selectedReport.priority}
                </Text>
              </View>
            </View>

            <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
              {/* Reporter info */}
              <View style={styles.metaInfoRow}>
                <Text style={[styles.metaLabel, { color: colors.icon }]}>Reporter: </Text>
                <Text style={[styles.metaValue, { color: colors.text }]}>
                  {selectedReport.user?.fullName || selectedReport.user?.phoneNumber || 'Unknown'}
                </Text>
              </View>
              {selectedReport.assignedTo?.fullName && (
                <View style={styles.metaInfoRow}>
                  <Text style={[styles.metaLabel, { color: colors.icon }]}>Assigned To: </Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>
                    {selectedReport.assignedTo.fullName}
                  </Text>
                </View>
              )}
              <View style={styles.metaInfoRow}>
                <Text style={[styles.metaLabel, { color: colors.icon }]}>Created: </Text>
                <Text style={[styles.metaValue, { color: colors.text }]}>
                  {formatDate(selectedReport.createdAt)}
                </Text>
              </View>
              <View style={styles.metaInfoRow}>
                <Text style={[styles.metaLabel, { color: colors.icon }]}>Updated: </Text>
                <Text style={[styles.metaValue, { color: colors.text }]}>
                  {formatDate(selectedReport.updatedAt)}
                </Text>
              </View>

              {/* Description */}
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
              <Text style={[styles.descriptionText, { color: colors.text }]}>
                {selectedReport.description}
              </Text>

              {/* Evidence */}
              {selectedReport.evidence?.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Evidence ({selectedReport.evidence.length})
                  </Text>
                  {selectedReport.evidence.map((url, idx) => (
                    <View key={idx} style={[styles.evidenceItem, { backgroundColor: `${colors.info}10`, borderColor: colors.border }]}>
                      <Ionicons name="link-outline" size={14} color={colors.info} />
                      <Text style={[styles.evidenceText, { color: colors.info }]} numberOfLines={1}>
                        {url}
                      </Text>
                    </View>
                  ))}
                </>
              )}

              {/* Resolution */}
              {selectedReport.resolution && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Resolution</Text>
                  <View style={[styles.resolutionBox, { backgroundColor: `${colors.success}10`, borderColor: colors.success }]}>
                    <Text style={[styles.resolutionText, { color: colors.text }]}>
                      {selectedReport.resolution}
                    </Text>
                  </View>
                </>
              )}

              {/* Internal Notes */}
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Internal Notes ({selectedReport.internalNotes?.length || 0})
              </Text>
              {detailLoading ? (
                <ActivityIndicator size="small" color={colors.tint} style={{ marginVertical: 12 }} />
              ) : (
                <>
                  {(selectedReport.internalNotes || []).map((note, idx) => (
                    <View key={idx} style={[styles.noteItem, { borderColor: colors.border }]}>
                      <View style={styles.noteHeader}>
                        <Ionicons name="person-circle-outline" size={14} color={colors.icon} />
                        <Text style={[styles.noteSender, { color: colors.text }]}>
                          {note.addedBy?.fullName || 'Admin'}
                        </Text>
                        <Text style={[styles.noteTime, { color: colors.icon }]}>
                          {formatDate(note.addedAt)}
                        </Text>
                      </View>
                      <Text style={[styles.noteText, { color: colors.text }]}>{note.note}</Text>
                    </View>
                  ))}
                  {(selectedReport.internalNotes || []).length === 0 && (
                    <Text style={[styles.emptyText, { color: colors.icon, marginTop: 4 }]}>
                      No internal notes yet.
                    </Text>
                  )}
                </>
              )}

              {/* Add note input */}
              <View style={[styles.noteInputContainer, { borderTopColor: colors.border }]}>
                <TextInput
                  style={[styles.noteInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  placeholder="Add internal note..."
                  placeholderTextColor={colors.icon}
                  value={noteText}
                  onChangeText={setNoteText}
                  multiline
                  numberOfLines={3}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, { backgroundColor: noteText.trim() ? colors.navy : colors.border }]}
                  onPress={handleAddNote}
                  disabled={noteSending || !noteText.trim()}
                >
                  {noteSending ? (
                    <ActivityIndicator size="small" color={colors.card} />
                  ) : (
                    <Ionicons name="send" size={18} color={noteText.trim() ? colors.card : colors.icon} />
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Action buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.navy }]}
                onPress={() => {
                  setStatusReportId(selectedReport._id);
                  setShowStatusModal(true);
                }}
              >
                <Ionicons name="swap-horizontal" size={16} color={colors.card} />
                <Text style={styles.actionButtonText}>Change Status</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.info }]}
                onPress={() => {
                  setPriorityReportId(selectedReport._id);
                  setShowPriorityModal(true);
                }}
              >
                <Ionicons name="flag-outline" size={16} color={colors.card} />
                <Text style={styles.actionButtonText}>Set Priority</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // STATUS MODAL
  const renderStatusModal = () => (
    <Modal visible={showStatusModal} transparent animationType="slide">
      <View style={styles.pickerModalOverlay}>
        <View style={[styles.pickerModalContent, { backgroundColor: colors.card }]}>
          <View style={styles.pickerModalHeader}>
            <Ionicons name="swap-horizontal" size={24} color={colors.tint} />
            <Text style={[styles.pickerModalTitle, { color: colors.text }]}>Update Status</Text>
          </View>
          <View style={{ gap: 8 }}>
            {(['new', 'investigating', 'resolved', 'dismissed'] as string[]).map(s => {
              const sc = getStatusColor(s);
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusOption, { backgroundColor: `${sc}15`, borderColor: sc }]}
                  onPress={() => handleStatusUpdate(s)}
                  disabled={statusUpdating}
                >
                  {statusUpdating ? (
                    <ActivityIndicator size="small" color={sc} />
                  ) : (
                    <>
                      <View style={[styles.statusDot, { backgroundColor: sc }]} />
                      <Text style={[styles.statusOptionText, { color: colors.text }]}>
                        {STATUS_LABELS[s] || s}
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color={colors.icon} />
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.border, marginTop: 16 }]}
            onPress={() => { setShowStatusModal(false); setStatusReportId(null); }}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // PRIORITY MODAL
  const renderPriorityModal = () => (
    <Modal visible={showPriorityModal} transparent animationType="slide">
      <View style={styles.pickerModalOverlay}>
        <View style={[styles.pickerModalContent, { backgroundColor: colors.card }]}>
          <View style={styles.pickerModalHeader}>
            <Ionicons name="flag-outline" size={24} color={colors.warning} />
            <Text style={[styles.pickerModalTitle, { color: colors.text }]}>Set Priority</Text>
          </View>
          <View style={{ gap: 8 }}>
            {(['low', 'medium', 'high', 'critical'] as string[]).map(p => {
              const pc = getPriorityColor(p);
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.statusOption, { backgroundColor: `${pc}15`, borderColor: pc }]}
                  onPress={() => handlePriorityUpdate(p)}
                  disabled={priorityUpdating}
                >
                  {priorityUpdating ? (
                    <ActivityIndicator size="small" color={pc} />
                  ) : (
                    <>
                      <View style={[styles.statusDot, { backgroundColor: pc }]} />
                      <Text style={[styles.statusOptionText, { color: colors.text }]}>
                        {PRIORITY_LABELS[p] || p}
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color={colors.icon} />
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.border, marginTop: 16 }]}
            onPress={() => { setShowPriorityModal(false); setPriorityReportId(null); }}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // LOADING STATE
  if (isLoading && reports.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Fraud Reports</Text>
          <Text style={[styles.headerSubtitle, { color: colors.icon }]}>
            {totalCount} total report{totalCount !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {renderFilters()}

      <FlatList
        data={reports}
        renderItem={renderReportItem}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoading && reports.length > 0
            ? <ActivityIndicator style={{ padding: 20 }} color={colors.tint} />
            : renderPagination()
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="shield-checkmark-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>No fraud reports found</Text>
          </View>
        }
      />

      {renderDetailModal()}
      {renderStatusModal()}
      {renderPriorityModal()}
    </View>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },

  // Filters
  filtersContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  filterScrollRow: { marginBottom: 8 },
  filterLabel: { fontSize: 12, fontWeight: '600', alignSelf: 'center', marginRight: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8,
  },
  filterChipText: { fontSize: 13, fontWeight: '500' },

  // Report list items
  listContent: { padding: 16, paddingTop: 4 },
  reportCard: {
    padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1,
  },
  reportHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  reportUser: { fontSize: 15, fontWeight: '600' },
  reportCategory: { fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  reportDescription: { fontSize: 13, lineHeight: 19, marginTop: 10 },
  reportFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.light.border,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 11 },

  // Pagination
  paginationRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 16, gap: 16, borderTopWidth: 1,
  },
  pageBtn: {
    width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center',
  },
  pageText: { fontSize: 13, fontWeight: '500' },

  // Modal - Detail
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalSubtitle: { fontSize: 14, marginTop: 4 },
  metaRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10,
  },
  detailScroll: { maxHeight: 450, marginBottom: 10 },
  metaInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  metaLabel: { fontSize: 12, fontWeight: '500' },
  metaValue: { fontSize: 12, fontWeight: '600' },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  descriptionText: { fontSize: 13, lineHeight: 20 },

  // Evidence
  evidenceItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 6,
  },
  evidenceText: { fontSize: 12, flex: 1 },

  // Resolution
  resolutionBox: {
    padding: 12, borderRadius: 8, borderWidth: 1,
  },
  resolutionText: { fontSize: 13, lineHeight: 19 },

  // Notes
  noteItem: {
    padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1,
  },
  noteHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  noteSender: { fontSize: 12, fontWeight: '600' },
  noteTime: { fontSize: 10, marginLeft: 'auto' },
  noteText: { fontSize: 13, lineHeight: 19 },

  // Note input
  noteInputContainer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingTop: 12, marginTop: 8, borderTopWidth: 1,
  },
  noteInput: {
    flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, minHeight: 44, maxHeight: 100, textAlignVertical: 'top',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center',
  },

  // Modal actions
  modalActions: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, gap: 4,
  },
  actionButtonText: { color: Colors.light.card, fontWeight: '600', fontSize: 13 },

  // Picker modals (status / priority)
  pickerModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20,
  },
  pickerModalContent: { borderRadius: 16, padding: 20 },
  pickerModalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16,
  },
  pickerModalTitle: { fontSize: 18, fontWeight: '600' },
  statusOption: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12,
    borderWidth: 1, gap: 10,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusOptionText: {
    flex: 1, fontSize: 15, fontWeight: '500', textTransform: 'capitalize',
  },
  cancelButton: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelButtonText: { fontWeight: '600', fontSize: 16 },

  // Empty state
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { marginTop: 12, fontSize: 16 },
});
