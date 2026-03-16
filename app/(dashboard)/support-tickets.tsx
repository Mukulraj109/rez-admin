'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity,
  useColorScheme, ActivityIndicator, TextInput, ScrollView, useWindowDimensions,
  Image, Linking, Modal, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import {
  supportAdminService,
  SupportTicketItem,
  SupportStatistics,
} from '../../services/api/support';
import { useAdminSocket } from '../../hooks/useAdminSocket';
import { format } from 'date-fns';

// ============================================
// TYPES & CONSTANTS
// ============================================
type StatusFilter = 'all' | 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
type PriorityFilter = 'all' | 'low' | 'medium' | 'high' | 'urgent';

const STATUS_OPTIONS: StatusFilter[] = ['all', 'open', 'in_progress', 'waiting_customer', 'resolved', 'closed'];
const PRIORITY_OPTIONS: PriorityFilter[] = ['all', 'low', 'medium', 'high', 'urgent'];

const STATUS_LABELS: Record<string, string> = {
  all: 'All',
  open: 'Open',
  in_progress: 'In Progress',
  waiting_customer: 'Waiting',
  resolved: 'Resolved',
  closed: 'Closed',
};

const PRIORITY_LABELS: Record<string, string> = {
  all: 'All',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

const STATUS_COLORS: Record<string, string> = {
  open: Colors.light.info,
  in_progress: Colors.light.warning,
  waiting_customer: Colors.light.purple,
  resolved: Colors.light.success,
  closed: Colors.light.secondaryText,
};

const PRIORITY_COLORS: Record<string, string> = {
  low: Colors.light.secondaryText,
  medium: Colors.light.info,
  high: Colors.light.warning,
  urgent: Colors.light.error,
};

interface AgentOption {
  _id: string;
  fullName: string;
  email: string;
  openTickets: number;
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function SupportTicketsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { width } = useWindowDimensions();
  const isWideScreen = width >= 900;

  // Socket
  const { connected: socketConnected, on: socketOn, off: socketOff, emit: socketEmit } = useAdminSocket();

  // Data
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [stats, setStats] = useState<SupportStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const LIMIT = 20;

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Chat panel
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const chatScrollRef = useRef<ScrollView>(null);

  // Agents list (for assign dropdown)
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);

  // Resolve modal
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveNote, setResolveNote] = useState('');
  const [adjustWallet, setAdjustWallet] = useState(false);
  const [walletAmount, setWalletAmount] = useState('');
  const [walletType, setWalletType] = useState<'credit' | 'debit'>('credit');
  const [walletReason, setWalletReason] = useState('');
  const [resolveLoading, setResolveLoading] = useState(false);

  // Typing
  const [userTyping, setUserTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const agentTypingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitRef = useRef<boolean>(false);

  // New ticket indicator
  const [newTicketAlert, setNewTicketAlert] = useState(false);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  // Reload on filter changes
  useEffect(() => {
    setPage(1);
    loadTickets(1);
  }, [statusFilter, priorityFilter, debouncedSearch]);

  // Load stats + agents on mount
  useEffect(() => {
    loadStats();
    loadAgents();
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socketConnected) return;

    const handleNewTicket = (data: any) => {
      console.log('📨 [AdminSupport] New ticket event:', data);
      setNewTicketAlert(true);
      loadTickets(1);
      loadStats();
      setTimeout(() => setNewTicketAlert(false), 5000);
    };

    const handleMessageReceived = (data: any) => {
      console.log('📨 [AdminSupport] Message received event:', data?.ticketId, 'selected:', selectedTicket?._id, 'match:', data?.ticketId === selectedTicket?._id);
      // If this message is for the currently selected ticket, add it
      if (selectedTicket && data.ticketId === selectedTicket._id) {
        setSelectedTicket(prev => {
          if (!prev) return prev;
          const msg = data.message;
          const alreadyExists = prev.messages.some((m: any) => m._id === msg.id || m.message === msg.content);
          if (alreadyExists) return prev;
          return {
            ...prev,
            messages: [...prev.messages, {
              sender: msg.sender || 'user',
              senderType: msg.senderType || msg.sender || 'user',
              message: msg.content || msg.message,
              timestamp: msg.timestamp,
              isRead: false,
            }],
          };
        });
        setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
      // Refresh ticket list for unread indicators
      loadTickets(page);
    };

    const handleUserTypingStart = () => {
      setUserTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setUserTyping(false), 4000);
    };

    const handleUserTypingStop = () => {
      setUserTyping(false);
    };

    const handleMessagesRead = (data: any) => {
      // User read our messages — update isRead to true (blue ticks)
      if (data?.readBy === 'user' && selectedTicket && data?.ticketId === selectedTicket._id) {
        setSelectedTicket(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map((m: any) =>
              (m.senderType === 'agent' || m.senderType === 'admin') ? { ...m, isRead: true } : m
            ),
          };
        });
      }
    };

    socketOn('support_new_ticket', handleNewTicket);
    socketOn('support_message_received', handleMessageReceived);
    socketOn('support_user_typing_start', handleUserTypingStart);
    socketOn('support_user_typing_stop', handleUserTypingStop);
    socketOn('support_messages_read', handleMessagesRead);

    return () => {
      socketOff('support_new_ticket', handleNewTicket);
      socketOff('support_message_received', handleMessageReceived);
      socketOff('support_user_typing_start', handleUserTypingStart);
      socketOff('support_user_typing_stop', handleUserTypingStop);
      socketOff('support_messages_read', handleMessagesRead);
    };
  }, [socketConnected, selectedTicket?._id, page]);

  // Clear typing indicator when ticket changes
  useEffect(() => {
    setUserTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [selectedTicket?._id]);

  // Join ticket room when selecting a ticket
  useEffect(() => {
    if (selectedTicket && socketConnected) {
      socketEmit('join-support-ticket', selectedTicket._id);
    }
  }, [selectedTicket?._id, socketConnected]);

  // DATA LOADING
  const loadTickets = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) setIsLoading(true);
      const data = await supportAdminService.listTickets({
        page: pageNum,
        limit: LIMIT,
        status: statusFilter === 'all' ? undefined : statusFilter,
        priority: priorityFilter === 'all' ? undefined : priorityFilter,
        search: debouncedSearch || undefined,
      });

      if (append) {
        setTickets(prev => [...prev, ...data.tickets]);
      } else {
        setTickets(data.tickets);
      }
      setTotalPages(data.pages);
      setPage(pageNum);
    } catch (error: any) {
      console.error('Failed to load tickets:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const loadStats = async () => {
    const data = await supportAdminService.getStatistics();
    if (data) setStats(data);
  };

  const loadAgents = async () => {
    try {
      const data = await supportAdminService.getAgents();
      if (data) setAgents(data);
    } catch (err) {
      console.error('Failed to load agents:', err);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadTickets(1), loadStats(), loadAgents()]);
    setRefreshing(false);
  }, [statusFilter, priorityFilter, debouncedSearch]);

  const loadMore = () => {
    if (!isLoading && page < totalPages) {
      loadTickets(page + 1, true);
    }
  };

  // ACTIONS
  const openTicketChat = async (ticket: SupportTicketItem) => {
    setSelectedTicket(ticket);
    setReplyText('');
    setDetailLoading(true);
    const fresh = await supportAdminService.getTicket(ticket._id);
    if (fresh) setSelectedTicket(fresh);
    setDetailLoading(false);
    // Mark user messages as read by agent (triggers blue double ticks on user side)
    supportAdminService.markAsRead(ticket._id);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: false }), 200);
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setReplySending(true);
    try {
      const success = await supportAdminService.replyToTicket(selectedTicket._id, replyText.trim());
      if (success) {
        // Optimistically add to chat
        setSelectedTicket(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: [...prev.messages, {
              sender: 'admin',
              senderType: 'agent',
              message: replyText.trim(),
              timestamp: new Date().toISOString(),
              isRead: true,
            }],
          };
        });
        setReplyText('');
        setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
        loadTickets(page);
        loadStats();
      } else {
        showAlert('Error', 'Failed to send reply.');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to send reply.');
    } finally {
      setReplySending(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!selectedTicket) return;

    // Show resolve modal for resolve action
    if (newStatus === 'resolved') {
      setResolveNote('');
      setAdjustWallet(false);
      setWalletAmount('');
      setWalletType('credit');
      setWalletReason('');
      setShowResolveModal(true);
      return;
    }

    try {
      const result = await supportAdminService.updateStatus(selectedTicket._id, newStatus);
      if (result.success) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : prev);
        loadTickets(page);
        loadStats();
      } else {
        showAlert('Error', 'Failed to update status.');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to update status.');
    }
  };

  const handleResolveConfirm = async () => {
    if (!selectedTicket) return;
    if (!resolveNote.trim()) {
      showAlert('Error', 'Resolution note is required.');
      return;
    }
    if (adjustWallet) {
      const amt = Number(walletAmount);
      if (!amt || amt <= 0 || amt > 100000) {
        showAlert('Error', 'Enter a valid wallet amount (1 - 100,000).');
        return;
      }
      if (!walletReason.trim()) {
        showAlert('Error', 'Wallet adjustment reason is required.');
        return;
      }
    }
    setResolveLoading(true);
    try {
      const options: any = { resolution: resolveNote.trim() };
      if (adjustWallet) {
        options.walletAdjustment = {
          amount: Number(walletAmount),
          type: walletType,
          reason: walletReason.trim(),
        };
      }
      const result = await supportAdminService.updateStatus(selectedTicket._id, 'resolved', options);
      if (result.success) {
        setSelectedTicket(prev => prev ? { ...prev, status: 'resolved' } : prev);
        loadTickets(page);
        loadStats();
        setShowResolveModal(false);
        if (result.walletResult?.success) {
          showAlert('Resolved', `Ticket resolved. Wallet ${walletType}ed ${walletAmount} NC.`);
        } else if (result.walletResult && !result.walletResult.success) {
          showAlert('Partially Done', `Ticket resolved, but wallet adjustment failed: ${result.walletResult.error}`);
        } else {
          showAlert('Resolved', 'Ticket resolved successfully.');
        }
      } else {
        showAlert('Error', 'Failed to resolve ticket.');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to resolve ticket.');
    } finally {
      setResolveLoading(false);
    }
  };

  const handleAssign = async (agentId: string) => {
    if (!selectedTicket) return;
    setAssignLoading(true);
    try {
      const success = await supportAdminService.assignTicket(selectedTicket._id, agentId);
      if (success) {
        const agent = agents.find(a => a._id === agentId);
        setSelectedTicket(prev => prev ? {
          ...prev,
          assignedTo: { _id: agentId, fullName: agent?.fullName || 'Agent' },
          status: 'in_progress',
        } : prev);
        setShowAssignDropdown(false);
        loadTickets(page);
      } else {
        showAlert('Error', 'Failed to assign ticket.');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to assign ticket.');
    } finally {
      setAssignLoading(false);
    }
  };

  // Handle agent typing emit (debounced to avoid flooding)
  const handleReplyTextChange = (text: string) => {
    setReplyText(text);
    if (selectedTicket && socketConnected) {
      const isTyping = text.length > 0;
      // Only emit if state changed
      if (isTyping !== lastTypingEmitRef.current) {
        lastTypingEmitRef.current = isTyping;
        socketEmit('support-agent-typing', { ticketId: selectedTicket._id, isTyping });
      }
      // Auto-stop after 3 seconds of no change
      if (agentTypingDebounceRef.current) clearTimeout(agentTypingDebounceRef.current);
      if (isTyping) {
        agentTypingDebounceRef.current = setTimeout(() => {
          lastTypingEmitRef.current = false;
          socketEmit('support-agent-typing', { ticketId: selectedTicket._id, isTyping: false });
        }, 3000);
      }
    }
  };

  // HELPERS
  const getStatusColor = (status: string) => STATUS_COLORS[status] || colors.mutedDark;
  const getPriorityColor = (priority: string) => PRIORITY_COLORS[priority] || colors.mutedDark;

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, h:mm a');
    } catch {
      return dateStr;
    }
  };

  const formatShortDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d');
    } catch {
      return dateStr;
    }
  };

  // ============================================
  // RENDERERS
  // ============================================

  const renderStatsCards = () => {
    if (!stats) return null;
    const cards = [
      { label: 'Total', value: stats.total, color: colors.navy },
      { label: 'Open', value: stats.openCount, color: colors.info },
      { label: 'Active', value: stats.inProgressCount, color: colors.warning },
      { label: 'Rating', value: stats.averageRating ? stats.averageRating.toFixed(1) : 'N/A', color: colors.success },
    ];
    return (
      <View style={styles.statsRow}>
        {cards.map((card, idx) => (
          <View key={idx} style={[styles.statCard, { backgroundColor: `${card.color}10`, borderColor: `${card.color}30` }]}>
            <Text style={[styles.statValue, { color: card.color }]}>{card.value}</Text>
            <Text style={[styles.statLabel, { color: card.color }]}>{card.label}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search tickets..."
          placeholderTextColor={colors.icon}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.icon} />
          </TouchableOpacity>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollRow}>
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
    </View>
  );

  const renderTicketItem = ({ item }: { item: SupportTicketItem }) => {
    const isSelected = selectedTicket?._id === item._id;
    const statusColor = getStatusColor(item.status);

    return (
      <TouchableOpacity
        style={[
          styles.ticketItem,
          { backgroundColor: isSelected ? `${colors.tint}15` : colors.card, borderColor: isSelected ? colors.tint : colors.border },
        ]}
        onPress={() => openTicketChat(item)}
      >
        <View style={styles.ticketItemHeader}>
          <Text style={[styles.ticketItemNumber, { color: colors.tint }]}>#{item.ticketNumber}</Text>
          <View style={[styles.miniStatusBadge, { backgroundColor: `${statusColor}20` }]}>
            <View style={[styles.miniStatusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.miniStatusText, { color: statusColor }]}>
              {STATUS_LABELS[item.status] || item.status}
            </Text>
          </View>
        </View>
        <Text style={[styles.ticketItemSubject, { color: colors.text }]} numberOfLines={1}>
          {item.subject}
        </Text>
        <View style={styles.ticketItemMeta}>
          <Text style={[styles.ticketItemMetaText, { color: colors.icon }]} numberOfLines={1}>
            {item.user?.fullName || item.user?.phoneNumber || 'User'}
          </Text>
          <Text style={[styles.ticketItemMetaText, { color: colors.icon }]}>
            {formatShortDate(item.updatedAt)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ============================================
  // CHAT PANEL
  // ============================================
  const renderChatPanel = () => {
    if (!selectedTicket) {
      return (
        <View style={[styles.chatPanelEmpty, { backgroundColor: colors.background }]}>
          <Ionicons name="chatbubbles-outline" size={64} color={colors.icon} />
          <Text style={[styles.chatPanelEmptyTitle, { color: colors.text }]}>
            Select a ticket
          </Text>
          <Text style={[styles.chatPanelEmptySubtitle, { color: colors.icon }]}>
            Choose a ticket from the list to view the conversation
          </Text>
        </View>
      );
    }

    const statusColor = getStatusColor(selectedTicket.status);
    const priorityColor = getPriorityColor(selectedTicket.priority);

    return (
      <View style={[styles.chatPanel, { backgroundColor: colors.background }]}>
        {/* Chat Header */}
        <View style={[styles.chatHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {/* Top row: ticket info + close */}
          <View style={styles.chatHeaderTop}>
            {!isWideScreen && (
              <TouchableOpacity onPress={() => setSelectedTicket(null)} style={styles.chatBackBtn}>
                <Ionicons name="arrow-back" size={22} color={colors.text} />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <View style={styles.chatHeaderTitleRow}>
                <Text style={[styles.chatHeaderTitle, { color: colors.text }]}>
                  #{selectedTicket.ticketNumber}
                </Text>
                <View style={[styles.miniStatusBadge, { backgroundColor: `${statusColor}20` }]}>
                  <View style={[styles.miniStatusDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.miniStatusText, { color: statusColor }]}>
                    {STATUS_LABELS[selectedTicket.status] || selectedTicket.status}
                  </Text>
                </View>
                <View style={[styles.miniStatusBadge, { backgroundColor: `${priorityColor}20` }]}>
                  <Text style={[styles.miniStatusText, { color: priorityColor }]}>
                    {PRIORITY_LABELS[selectedTicket.priority] || selectedTicket.priority}
                  </Text>
                </View>
              </View>
              <Text style={[styles.chatHeaderSubtitle, { color: colors.icon }]} numberOfLines={1}>
                {selectedTicket.subject} — {selectedTicket.user?.fullName || selectedTicket.user?.phoneNumber || 'User'}
              </Text>
              {/* Tags */}
              {selectedTicket.tags && selectedTicket.tags.length > 0 && (
                <View style={styles.tagsRow}>
                  {selectedTicket.tags.map((tag, i) => (
                    <View key={i} style={[styles.tagChip, { backgroundColor: `${colors.tint}15` }]}>
                      <Text style={[styles.tagChipText, { color: colors.tint }]}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Actions row */}
          <View style={styles.chatHeaderActions}>
            {/* Assign button */}
            <View style={{ position: 'relative' }}>
              <TouchableOpacity
                style={[styles.chatActionBtn, { backgroundColor: `${colors.info}10`, borderColor: `${colors.info}30` }]}
                onPress={() => setShowAssignDropdown(!showAssignDropdown)}
              >
                <Ionicons name="person-add-outline" size={14} color={colors.info} />
                <Text style={[styles.chatActionBtnText, { color: colors.info }]}>
                  {selectedTicket.assignedTo?.fullName || 'Assign'}
                </Text>
              </TouchableOpacity>
              {showAssignDropdown && (
                <View style={[styles.assignDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {agents.map(agent => (
                    <TouchableOpacity
                      key={agent._id}
                      style={[styles.assignDropdownItem, { borderBottomColor: colors.border }]}
                      onPress={() => handleAssign(agent._id)}
                      disabled={assignLoading}
                    >
                      <Text style={[styles.assignDropdownName, { color: colors.text }]}>{agent.fullName}</Text>
                      <Text style={[styles.assignDropdownMeta, { color: colors.icon }]}>
                        {agent.openTickets} open
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {agents.length === 0 && (
                    <Text style={[styles.assignDropdownMeta, { color: colors.icon, padding: 12 }]}>
                      No agents available
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Status buttons */}
            {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
              <TouchableOpacity
                style={[styles.chatActionBtn, { backgroundColor: `${colors.success}10`, borderColor: `${colors.success}30` }]}
                onPress={() => handleStatusUpdate('resolved')}
              >
                <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
                <Text style={[styles.chatActionBtnText, { color: colors.success }]}>Resolve</Text>
              </TouchableOpacity>
            )}
            {selectedTicket.status !== 'closed' && (
              <TouchableOpacity
                style={[styles.chatActionBtn, { backgroundColor: `${colors.error}10`, borderColor: `${colors.error}30` }]}
                onPress={async () => {
                  const confirmed = await showConfirm('Close Ticket', 'Are you sure?');
                  if (confirmed) handleStatusUpdate('closed');
                }}
              >
                <Ionicons name="close-circle-outline" size={14} color={colors.error} />
                <Text style={[styles.chatActionBtnText, { color: colors.error }]}>Close</Text>
              </TouchableOpacity>
            )}
            {(selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') && (
              <TouchableOpacity
                style={[styles.chatActionBtn, { backgroundColor: `${colors.info}10`, borderColor: `${colors.info}30` }]}
                onPress={() => handleStatusUpdate('in_progress')}
              >
                <Ionicons name="refresh-outline" size={14} color={colors.info} />
                <Text style={[styles.chatActionBtnText, { color: colors.info }]}>Reopen</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Messages Thread */}
        {detailLoading ? (
          <View style={styles.chatLoadingContainer}>
            <ActivityIndicator size="small" color={colors.tint} />
          </View>
        ) : (
          <ScrollView
            ref={chatScrollRef}
            style={styles.chatMessages}
            contentContainerStyle={styles.chatMessagesContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Ticket-level attachments (screenshots, evidence) */}
            {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
              <View style={styles.ticketAttachmentsContainer}>
                <Text style={[styles.ticketAttachmentsLabel, { color: colors.icon }]}>
                  Attachments ({selectedTicket.attachments.length})
                </Text>
                <View style={styles.ticketAttachmentsGrid}>
                  {selectedTicket.attachments.map((url, attIdx) => (
                    <TouchableOpacity key={attIdx} onPress={() => Linking.openURL(url)}>
                      <Image source={{ uri: url }} style={styles.ticketAttachmentImage} resizeMode="cover" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {(selectedTicket.messages || []).map((msg, idx) => {
              const isAdmin = msg.senderType === 'admin' || msg.senderType === 'agent';
              const isSystem = msg.senderType === 'system';

              if (isSystem) {
                return (
                  <View key={idx} style={styles.systemMsg}>
                    <Text style={[styles.systemMsgText, { color: colors.icon }]}>{msg.message}</Text>
                  </View>
                );
              }

              return (
                <View
                  key={idx}
                  style={[
                    styles.chatBubbleRow,
                    isAdmin ? styles.chatBubbleRowRight : styles.chatBubbleRowLeft,
                  ]}
                >
                  {!isAdmin && (
                    <View style={[styles.chatAvatar, { backgroundColor: colors.border }]}>
                      <Ionicons name="person" size={14} color={colors.secondaryText} />
                    </View>
                  )}
                  <View
                    style={[
                      styles.chatBubble,
                      isAdmin ? styles.chatBubbleAdmin : styles.chatBubbleUser,
                    ]}
                  >
                    {/* Message attachments (images) */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <View style={styles.msgAttachments}>
                        {msg.attachments.map((url, attIdx) => (
                          <TouchableOpacity key={attIdx} onPress={() => Linking.openURL(url)}>
                            <Image source={{ uri: url }} style={styles.msgAttachmentImage} resizeMode="cover" />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    <Text style={[
                      styles.chatBubbleText,
                      isAdmin ? styles.chatBubbleTextAdmin : { color: colors.text },
                    ]}>
                      {msg.message}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={[
                        styles.chatBubbleTime,
                        isAdmin ? styles.chatBubbleTimeAdmin : { color: colors.icon },
                      ]}>
                        {formatDate(msg.timestamp)}
                      </Text>
                      {isAdmin && (
                        msg.isRead ? (
                          <Ionicons name="checkmark-done" size={13} color="#53BDEB" />
                        ) : (
                          <Ionicons name="checkmark-done" size={13} color="rgba(255, 255, 255, 0.5)" />
                        )
                      )}
                    </View>
                  </View>
                  {isAdmin && (
                    <View style={[styles.chatAvatar, { backgroundColor: colors.navy }]}>
                      <Ionicons name="headset" size={14} color={colors.card} />
                    </View>
                  )}
                </View>
              );
            })}

            {(selectedTicket.messages || []).length === 0 && (
              <View style={styles.chatEmpty}>
                <Text style={[styles.chatEmptyText, { color: colors.icon }]}>No messages yet.</Text>
              </View>
            )}

            {/* User typing indicator */}
            {userTyping && (
              <View style={[styles.chatBubbleRow, styles.chatBubbleRowLeft]}>
                <View style={[styles.chatAvatar, { backgroundColor: colors.border }]}>
                  <Ionicons name="person" size={14} color={colors.secondaryText} />
                </View>
                <View style={[styles.chatBubble, styles.chatBubbleUser]}>
                  <View style={styles.typingDots}>
                    <View style={[styles.typingDot, { backgroundColor: colors.icon }]} />
                    <View style={[styles.typingDot, { backgroundColor: colors.icon, opacity: 0.6 }]} />
                    <View style={[styles.typingDot, { backgroundColor: colors.icon, opacity: 0.3 }]} />
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* Reply Input */}
        {selectedTicket.status !== 'closed' && (
          <View style={[styles.chatInputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <TextInput
              style={[styles.chatInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
              placeholder="Type your reply..."
              placeholderTextColor={colors.icon}
              value={replyText}
              onChangeText={handleReplyTextChange}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[styles.chatSendBtn, { backgroundColor: replyText.trim() ? colors.navy : colors.border }]}
              onPress={handleReply}
              disabled={replySending || !replyText.trim()}
            >
              {replySending ? (
                <ActivityIndicator size="small" color={colors.card} />
              ) : (
                <Ionicons name="send" size={18} color={replyText.trim() ? colors.card : colors.icon} />
              )}
            </TouchableOpacity>
          </View>
        )}

        {selectedTicket.status === 'closed' && (
          <View style={[styles.chatClosedBanner, { backgroundColor: colors.secondaryText + '15' }]}>
            <Ionicons name="lock-closed" size={16} color={colors.secondaryText} />
            <Text style={[styles.chatClosedText, { color: colors.secondaryText }]}>This ticket is closed</Text>
          </View>
        )}
      </View>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  if (isLoading && tickets.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  // Mobile: show either list or chat
  if (!isWideScreen && selectedTicket) {
    return renderChatPanel();
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Support Tickets</Text>
          {socketConnected && (
            <View style={styles.socketBadge}>
              <View style={styles.socketDot} />
              <Text style={styles.socketText}>Live</Text>
            </View>
          )}
        </View>
        {newTicketAlert && (
          <View style={styles.newTicketBadge}>
            <Ionicons name="notifications" size={14} color={colors.card} />
            <Text style={styles.newTicketBadgeText}>New ticket!</Text>
          </View>
        )}
      </View>

      {renderStatsCards()}

      <View style={styles.mainContent}>
        {/* Left: Ticket list */}
        <View style={[styles.listPanel, isWideScreen && styles.listPanelWide]}>
          {renderFilters()}
          <FlatList
            data={tickets}
            renderItem={renderTicketItem}
            keyExtractor={item => item._id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color={colors.icon} />
                <Text style={[styles.emptyText, { color: colors.icon }]}>No tickets found</Text>
              </View>
            }
          />
        </View>

        {/* Right: Chat panel (wide screen only) */}
        {isWideScreen && (
          <View style={styles.chatPanelWide}>
            {renderChatPanel()}
          </View>
        )}
      </View>

      {/* Resolve Ticket Modal */}
      <Modal visible={showResolveModal} transparent animationType="fade" onRequestClose={() => setShowResolveModal(false)}>
        <View style={resolveStyles.backdrop}>
          <View style={[resolveStyles.modal, { backgroundColor: colors.card }]}>
            <View style={resolveStyles.modalHeader}>
              <Text style={[resolveStyles.modalTitle, { color: colors.text }]}>Resolve Ticket</Text>
              <TouchableOpacity onPress={() => setShowResolveModal(false)}>
                <Ionicons name="close" size={22} color={colors.icon} />
              </TouchableOpacity>
            </View>

            <ScrollView style={resolveStyles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Resolution Note */}
              <Text style={[resolveStyles.label, { color: colors.text }]}>Resolution Note *</Text>
              <TextInput
                style={[resolveStyles.textArea, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder="Describe how the issue was resolved..."
                placeholderTextColor={colors.icon}
                value={resolveNote}
                onChangeText={setResolveNote}
                multiline
                numberOfLines={4}
                maxLength={2000}
              />

              {/* Wallet Adjustment Toggle */}
              <View style={resolveStyles.toggleRow}>
                <Text style={[resolveStyles.label, { color: colors.text, marginBottom: 0 }]}>Adjust User Wallet</Text>
                <Switch value={adjustWallet} onValueChange={setAdjustWallet} />
              </View>

              {adjustWallet && (
                <View style={[resolveStyles.walletSection, { borderColor: colors.border }]}>
                  {/* Type */}
                  <View style={resolveStyles.typeRow}>
                    <TouchableOpacity
                      style={[resolveStyles.typeBtn, walletType === 'credit' && { backgroundColor: Colors.light.success + '20', borderColor: Colors.light.success }]}
                      onPress={() => setWalletType('credit')}
                    >
                      <Ionicons name="add-circle" size={16} color={walletType === 'credit' ? Colors.light.success : colors.icon} />
                      <Text style={[resolveStyles.typeBtnText, walletType === 'credit' && { color: Colors.light.success }]}>Credit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[resolveStyles.typeBtn, walletType === 'debit' && { backgroundColor: Colors.light.error + '20', borderColor: Colors.light.error }]}
                      onPress={() => setWalletType('debit')}
                    >
                      <Ionicons name="remove-circle" size={16} color={walletType === 'debit' ? Colors.light.error : colors.icon} />
                      <Text style={[resolveStyles.typeBtnText, walletType === 'debit' && { color: Colors.light.error }]}>Debit</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Amount */}
                  <Text style={[resolveStyles.label, { color: colors.text }]}>Amount (NC)</Text>
                  <TextInput
                    style={[resolveStyles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                    placeholder="0"
                    placeholderTextColor={colors.icon}
                    value={walletAmount}
                    onChangeText={setWalletAmount}
                    keyboardType="numeric"
                  />

                  {/* Reason */}
                  <Text style={[resolveStyles.label, { color: colors.text }]}>Reason *</Text>
                  <TextInput
                    style={[resolveStyles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                    placeholder="Reason for adjustment"
                    placeholderTextColor={colors.icon}
                    value={walletReason}
                    onChangeText={setWalletReason}
                    maxLength={200}
                  />
                </View>
              )}
            </ScrollView>

            {/* Actions */}
            <View style={resolveStyles.modalFooter}>
              <TouchableOpacity style={[resolveStyles.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowResolveModal(false)}>
                <Text style={[resolveStyles.cancelBtnText, { color: colors.secondaryText }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[resolveStyles.confirmBtn, { backgroundColor: Colors.light.success, opacity: resolveLoading ? 0.6 : 1 }]}
                onPress={handleResolveConfirm}
                disabled={resolveLoading}
              >
                {resolveLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={resolveStyles.confirmBtnText}>Resolve Ticket</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Resolve Modal Styles
const resolveStyles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modal: {
    width: '100%', maxWidth: 480, borderRadius: 16, maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: { padding: 20 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  textArea: {
    borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14,
    minHeight: 100, textAlignVertical: 'top', marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  walletSection: {
    borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 12,
  },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd',
  },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: '#666' },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, marginBottom: 12,
  },
  modalFooter: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: '#eee',
  },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },
  confirmBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center',
  },
  confirmBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  socketBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${Colors.light.success}15`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  socketDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.light.success },
  socketText: { fontSize: 11, fontWeight: '600', color: Colors.light.success },
  newTicketBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.light.error, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  newTicketBadgeText: { fontSize: 12, fontWeight: '600', color: Colors.light.card },

  // Stats
  statsRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8,
  },
  statCard: {
    flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 10, fontWeight: '500', marginTop: 2 },

  // Filters
  filtersContainer: { paddingHorizontal: 12, paddingBottom: 8 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10,
    borderRadius: 10, marginBottom: 8, borderWidth: 1,
  },
  searchInput: { flex: 1, height: 38, marginLeft: 6, fontSize: 14 },
  filterScrollRow: { marginBottom: 6 },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 6,
  },
  filterChipText: { fontSize: 12, fontWeight: '500' },

  // Main content split
  mainContent: { flex: 1, flexDirection: 'row' },
  listPanel: { flex: 1 },
  listPanelWide: { flex: 0, width: 380, borderRightWidth: 1, borderRightColor: Colors.light.border },
  chatPanelWide: { flex: 1 },

  // Ticket list items
  listContent: { padding: 12, paddingTop: 4 },
  ticketItem: {
    padding: 12, borderRadius: 10, marginBottom: 6, borderWidth: 1,
  },
  ticketItemHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
  },
  ticketItemNumber: { fontSize: 12, fontWeight: '700' },
  ticketItemSubject: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  ticketItemMeta: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  ticketItemMetaText: { fontSize: 11 },

  // Mini status badge
  miniStatusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  miniStatusDot: { width: 6, height: 6, borderRadius: 3 },
  miniStatusText: { fontSize: 10, fontWeight: '600' },

  // Chat panel
  chatPanel: { flex: 1, flexDirection: 'column' },
  chatPanelEmpty: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40,
  },
  chatPanelEmptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  chatPanelEmptySubtitle: { fontSize: 14, marginTop: 8, textAlign: 'center' },

  // Chat header
  chatHeader: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  chatHeaderTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  chatBackBtn: { marginRight: 10 },
  chatHeaderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  chatHeaderTitle: { fontSize: 16, fontWeight: '700' },
  chatHeaderSubtitle: { fontSize: 13, marginTop: 2 },
  chatHeaderActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chatActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
  },
  chatActionBtnText: { fontSize: 12, fontWeight: '600' },

  // Assign dropdown
  assignDropdown: {
    position: 'absolute', top: 36, left: 0, zIndex: 100,
    borderWidth: 1, borderRadius: 10, width: 220,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 8,
  },
  assignDropdownItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1,
  },
  assignDropdownName: { fontSize: 13, fontWeight: '600' },
  assignDropdownMeta: { fontSize: 11 },

  // Chat messages
  chatLoadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chatMessages: { flex: 1 },
  chatMessagesContent: { padding: 16, paddingBottom: 8 },
  chatEmpty: { padding: 40, alignItems: 'center' },
  chatEmptyText: { fontSize: 14 },

  // System message
  systemMsg: {
    alignSelf: 'center', backgroundColor: Colors.light.background, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 12, marginBottom: 10,
  },
  systemMsgText: { fontSize: 12, fontStyle: 'italic' },

  // Chat bubbles
  chatBubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10, gap: 8 },
  chatBubbleRowLeft: { justifyContent: 'flex-start' },
  chatBubbleRowRight: { justifyContent: 'flex-end' },
  chatAvatar: {
    width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
  },
  chatBubble: { maxWidth: '70%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  chatBubbleUser: {
    backgroundColor: Colors.light.background, borderBottomLeftRadius: 4,
  },
  chatBubbleAdmin: {
    backgroundColor: Colors.light.navy, borderBottomRightRadius: 4,
  },
  chatBubbleText: { fontSize: 14, lineHeight: 20 },
  chatBubbleTextAdmin: { color: Colors.light.card },
  chatBubbleTime: { fontSize: 10, marginTop: 4 },
  chatBubbleTimeAdmin: { color: 'rgba(255,255,255,0.6)' },

  // Typing dots
  typingDots: { flexDirection: 'row', gap: 4, paddingVertical: 4 },
  typingDot: { width: 8, height: 8, borderRadius: 4 },

  // Chat input
  chatInputContainer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1,
  },
  chatInput: {
    flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, minHeight: 44, maxHeight: 120, textAlignVertical: 'top',
  },
  chatSendBtn: {
    width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center',
  },

  // Closed banner
  chatClosedBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12,
  },
  chatClosedText: { fontSize: 13, fontWeight: '500' },

  // Tags
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  tagChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  tagChipText: { fontSize: 10, fontWeight: '600' },

  // Ticket-level attachments
  ticketAttachmentsContainer: {
    backgroundColor: Colors.light.background, borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: Colors.light.border,
  },
  ticketAttachmentsLabel: { fontSize: 11, fontWeight: '600', marginBottom: 8 },
  ticketAttachmentsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ticketAttachmentImage: { width: 120, height: 90, borderRadius: 8 },

  // Message-level attachments
  msgAttachments: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  msgAttachmentImage: { width: 160, height: 120, borderRadius: 8 },

  // Empty state
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { marginTop: 12, fontSize: 16 },
});
