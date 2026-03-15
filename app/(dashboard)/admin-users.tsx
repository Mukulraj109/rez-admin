'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity,
  useColorScheme, ActivityIndicator, TextInput, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { adminUsersService, AdminUser, CreateAdminData } from '../../services/api/adminUsers';
import { format } from 'date-fns';

export default function AdminUsersScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateAdminData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
  });
  const [creating, setCreating] = useState(false);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAdmin, setEditAdmin] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', phoneNumber: '' });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      setIsLoading(true);
      const data = await adminUsersService.listAdmins();
      setAdmins(data);
    } catch (error) {
      console.error('Failed to load admins:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAdmins();
  }, []);

  const validateCreateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!createForm.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email)) errors.email = 'Invalid email';
    if (!createForm.password) errors.password = 'Password is required';
    else if (createForm.password.length < 8) errors.password = 'Min 8 characters';
    if (!createForm.firstName.trim()) errors.firstName = 'First name is required';
    if (!createForm.lastName.trim()) errors.lastName = 'Last name is required';
    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateCreateForm()) return;
    setCreating(true);
    try {
      const result = await adminUsersService.createAdmin(createForm);
      if (result) {
        showAlert('Success', 'Admin user created successfully.');
        setShowCreateModal(false);
        setCreateForm({ email: '', password: '', firstName: '', lastName: '', phoneNumber: '' });
        setCreateErrors({});
        loadAdmins();
      } else {
        showAlert('Error', 'Failed to create admin user. Email may already exist.');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to create admin.');
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async () => {
    if (!editAdmin) return;
    setEditing(true);
    try {
      const result = await adminUsersService.updateAdmin(editAdmin._id, editForm);
      if (result) {
        showAlert('Success', 'Admin user updated.');
        setShowEditModal(false);
        setEditAdmin(null);
        loadAdmins();
      } else {
        showAlert('Error', 'Failed to update admin user.');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to update admin.');
    } finally {
      setEditing(false);
    }
  };

  const handleToggleActive = async (admin: AdminUser) => {
    if (admin.isActive) {
      const confirmed = await showConfirm(
        'Deactivate Admin',
        `Are you sure you want to deactivate ${admin.fullName}? Their open tickets will be unassigned.`
      );
      if (!confirmed) return;
      const success = await adminUsersService.deactivateAdmin(admin._id);
      if (success) {
        showAlert('Success', 'Admin deactivated.');
        loadAdmins();
      } else {
        showAlert('Error', 'Failed to deactivate admin.');
      }
    } else {
      const result = await adminUsersService.updateAdmin(admin._id, { isActive: true });
      if (result) {
        showAlert('Success', 'Admin reactivated.');
        loadAdmins();
      } else {
        showAlert('Error', 'Failed to reactivate admin.');
      }
    }
  };

  const openEditModal = (admin: AdminUser) => {
    setEditAdmin(admin);
    setEditForm({
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      phoneNumber: admin.phoneNumber,
    });
    setShowEditModal(true);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy h:mm a');
    } catch {
      return dateStr;
    }
  };

  const renderAdminItem = ({ item }: { item: AdminUser }) => (
    <View style={[styles.adminCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.adminCardHeader}>
        <View style={styles.adminInfo}>
          <View style={[styles.adminAvatar, { backgroundColor: item.isActive ? colors.navy : colors.icon }]}>
            <Text style={styles.adminAvatarText}>
              {item.firstName?.charAt(0)?.toUpperCase() || 'A'}{item.lastName?.charAt(0)?.toUpperCase() || ''}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.adminName, { color: colors.text }]}>{item.fullName}</Text>
            <Text style={[styles.adminEmail, { color: colors.icon }]}>{item.email}</Text>
            {item.phoneNumber ? (
              <Text style={[styles.adminPhone, { color: colors.icon }]}>{item.phoneNumber}</Text>
            ) : null}
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.isActive ? colors.success + '15' : colors.error + '15' }]}>
          <View style={[styles.statusDot, { backgroundColor: item.isActive ? colors.success : colors.error }]} />
          <Text style={[styles.statusText, { color: item.isActive ? colors.success : colors.error }]}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.adminMeta}>
        <View style={styles.adminMetaItem}>
          <Ionicons name="ticket-outline" size={14} color={colors.icon} />
          <Text style={[styles.adminMetaText, { color: colors.icon }]}>
            {item.assignedTickets} open tickets
          </Text>
        </View>
        <View style={styles.adminMetaItem}>
          <Ionicons name="log-in-outline" size={14} color={colors.icon} />
          <Text style={[styles.adminMetaText, { color: colors.icon }]}>
            Last login: {formatDate(item.lastLogin)}
          </Text>
        </View>
        <View style={styles.adminMetaItem}>
          <Ionicons name="calendar-outline" size={14} color={colors.icon} />
          <Text style={[styles.adminMetaText, { color: colors.icon }]}>
            Created: {formatDate(item.createdAt)}
          </Text>
        </View>
      </View>

      <View style={styles.adminActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.info + '10', borderColor: colors.info + '30' }]}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="create-outline" size={16} color={colors.info} />
          <Text style={[styles.actionBtnText, { color: colors.info }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            { backgroundColor: item.isActive ? colors.error + '10' : colors.success + '10', borderColor: item.isActive ? colors.error + '30' : colors.success + '30' },
          ]}
          onPress={() => handleToggleActive(item)}
        >
          <Ionicons
            name={item.isActive ? 'close-circle-outline' : 'checkmark-circle-outline'}
            size={16}
            color={item.isActive ? colors.error : colors.success}
          />
          <Text style={[styles.actionBtnText, { color: item.isActive ? colors.error : colors.success }]}>
            {item.isActive ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Create Modal
  const renderCreateModal = () => (
    <Modal visible={showCreateModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create Admin User</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={24} color={colors.icon} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* First Name */}
            <Text style={[styles.inputLabel, { color: colors.text }]}>First Name *</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: createErrors.firstName ? colors.error : colors.border, backgroundColor: colors.background }]}
              placeholder="First name"
              placeholderTextColor={colors.icon}
              value={createForm.firstName}
              onChangeText={v => setCreateForm(f => ({ ...f, firstName: v }))}
            />
            {createErrors.firstName && <Text style={styles.errorText}>{createErrors.firstName}</Text>}

            {/* Last Name */}
            <Text style={[styles.inputLabel, { color: colors.text }]}>Last Name *</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: createErrors.lastName ? colors.error : colors.border, backgroundColor: colors.background }]}
              placeholder="Last name"
              placeholderTextColor={colors.icon}
              value={createForm.lastName}
              onChangeText={v => setCreateForm(f => ({ ...f, lastName: v }))}
            />
            {createErrors.lastName && <Text style={styles.errorText}>{createErrors.lastName}</Text>}

            {/* Email */}
            <Text style={[styles.inputLabel, { color: colors.text }]}>Email *</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: createErrors.email ? colors.error : colors.border, backgroundColor: colors.background }]}
              placeholder="admin@example.com"
              placeholderTextColor={colors.icon}
              value={createForm.email}
              onChangeText={v => setCreateForm(f => ({ ...f, email: v }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {createErrors.email && <Text style={styles.errorText}>{createErrors.email}</Text>}

            {/* Password */}
            <Text style={[styles.inputLabel, { color: colors.text }]}>Password *</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: createErrors.password ? colors.error : colors.border, backgroundColor: colors.background }]}
              placeholder="Min 8 characters"
              placeholderTextColor={colors.icon}
              value={createForm.password}
              onChangeText={v => setCreateForm(f => ({ ...f, password: v }))}
              secureTextEntry
            />
            {createErrors.password && <Text style={styles.errorText}>{createErrors.password}</Text>}

            {/* Phone */}
            <Text style={[styles.inputLabel, { color: colors.text }]}>Phone Number</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Optional"
              placeholderTextColor={colors.icon}
              value={createForm.phoneNumber}
              onChangeText={v => setCreateForm(f => ({ ...f, phoneNumber: v }))}
              keyboardType="phone-pad"
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.border }]}
              onPress={() => setShowCreateModal(false)}
            >
              <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.navy }]}
              onPress={handleCreate}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator size="small" color={colors.card} />
              ) : (
                <Text style={[styles.modalBtnText, { color: colors.card }]}>Create Admin</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Edit Modal
  const renderEditModal = () => {
    if (!editAdmin) return null;
    return (
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Admin</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={colors.icon} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>First Name</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={editForm.firstName}
                onChangeText={v => setEditForm(f => ({ ...f, firstName: v }))}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Last Name</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={editForm.lastName}
                onChangeText={v => setEditForm(f => ({ ...f, lastName: v }))}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Email</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={editForm.email}
                onChangeText={v => setEditForm(f => ({ ...f, email: v }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Phone Number</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={editForm.phoneNumber}
                onChangeText={v => setEditForm(f => ({ ...f, phoneNumber: v }))}
                keyboardType="phone-pad"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.navy }]}
                onPress={handleEdit}
                disabled={editing}
              >
                {editing ? (
                  <ActivityIndicator size="small" color={colors.card} />
                ) : (
                  <Text style={[styles.modalBtnText, { color: colors.card }]}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (isLoading && admins.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Admin Users</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            setCreateForm({ email: '', password: '', firstName: '', lastName: '', phoneNumber: '' });
            setCreateErrors({});
            setShowCreateModal(true);
          }}
        >
          <Ionicons name="add" size={18} color={colors.card} />
          <Text style={styles.addBtnText}>Add Admin</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: `${colors.navy}10`, borderColor: `${colors.navy}30` }]}>
          <Text style={[styles.summaryValue, { color: colors.navy }]}>{admins.length}</Text>
          <Text style={[styles.summaryLabel, { color: colors.navy }]}>Total</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.success + '10', borderColor: colors.success + '30' }]}>
          <Text style={[styles.summaryValue, { color: colors.success }]}>{admins.filter(a => a.isActive).length}</Text>
          <Text style={[styles.summaryLabel, { color: colors.success }]}>Active</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.error + '10', borderColor: colors.error + '30' }]}>
          <Text style={[styles.summaryValue, { color: colors.error }]}>{admins.filter(a => !a.isActive).length}</Text>
          <Text style={[styles.summaryLabel, { color: colors.error }]}>Inactive</Text>
        </View>
      </View>

      <FlatList
        data={admins}
        renderItem={renderAdminItem}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>No admin users found</Text>
          </View>
        }
      />

      {renderCreateModal()}
      {renderEditModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.light.navy, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
  },
  addBtnText: { color: Colors.light.card, fontWeight: '600', fontSize: 13 },

  // Summary
  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  summaryCard: {
    flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center',
  },
  summaryValue: { fontSize: 20, fontWeight: '700' },
  summaryLabel: { fontSize: 11, fontWeight: '500', marginTop: 2 },

  // List
  listContent: { padding: 16, paddingTop: 4 },

  // Admin card
  adminCard: { padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1 },
  adminCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  adminInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  adminAvatar: {
    width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center',
  },
  adminAvatarText: { color: Colors.light.card, fontSize: 16, fontWeight: '700' },
  adminName: { fontSize: 15, fontWeight: '700' },
  adminEmail: { fontSize: 13, marginTop: 2 },
  adminPhone: { fontSize: 12, marginTop: 1 },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },

  adminMeta: { marginTop: 12, gap: 4 },
  adminMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  adminMetaText: { fontSize: 12 },

  adminActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
  },
  actionBtnText: { fontSize: 12, fontWeight: '600' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20,
  },
  modalContent: { borderRadius: 16, maxHeight: '80%' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.light.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: { paddingHorizontal: 20, paddingVertical: 12 },
  modalFooter: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: Colors.light.border,
  },
  modalBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center',
  },
  modalBtnText: { fontWeight: '600', fontSize: 14 },

  // Inputs
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, minHeight: 44,
  },
  errorText: { color: Colors.light.error, fontSize: 11, marginTop: 4 },

  // Empty
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { marginTop: 12, fontSize: 16 },
});
