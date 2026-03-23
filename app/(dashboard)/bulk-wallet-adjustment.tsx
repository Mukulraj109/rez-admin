import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { apiClient } from '../../services/api/apiClient';

// ---- Types ----

type AdjustType = 'credit' | 'debit';
type CoinType = 'rez' | 'promo' | 'branded';
type Step = 'input' | 'preview' | 'processing' | 'results';

interface PreviewData {
  totalInput: number;
  validUsers: number;
  invalidIds: number;
  notFoundIds: string[];
  noWalletIds: string[];
  frozenWallets: number;
  readyToProcess: number;
}

interface AdjustResult {
  userId: string;
  success: boolean;
  message: string;
}

interface BulkAdjustResponse {
  batchId: string;
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  results: AdjustResult[];
}

// ---- Main Component ----

export default function BulkWalletAdjustmentScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Input state
  const [userIdsText, setUserIdsText] = useState('');
  const [adjustType, setAdjustType] = useState<AdjustType>('credit');
  const [amount, setAmount] = useState('');
  const [coinType, setCoinType] = useState<CoinType>('rez');
  const [reason, setReason] = useState('');

  // Flow state
  const [step, setStep] = useState<Step>('input');
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [results, setResults] = useState<BulkAdjustResponse | null>(null);
  const [processLoading, setProcessLoading] = useState(false);

  const parseUserIds = useCallback((): string[] => {
    return userIdsText
      .split(/[\n,;]+/)
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
  }, [userIdsText]);

  const handlePreview = async () => {
    const ids = parseUserIds();
    if (ids.length === 0) {
      showAlert('Error', 'Please enter at least one user ID');
      return;
    }
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      showAlert('Error', 'Please enter a valid amount');
      return;
    }
    if (!reason.trim()) {
      showAlert('Error', 'Please enter a reason for the adjustment');
      return;
    }

    setPreviewLoading(true);
    try {
      const response = await apiClient.post<{ data: PreviewData }>('admin/user-wallets/bulk-adjust/preview', {
        userIds: ids,
      });
      if (response.success && response.data) {
        setPreviewData(response.data as unknown as PreviewData);
        setStep('preview');
      } else {
        showAlert('Error', response.message || 'Failed to generate preview');
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to generate preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmAndProcess = () => {
    if (!previewData) return;
    const parsedAmount = Number(amount);
    const totalAmount = parsedAmount * previewData.readyToProcess;

    showConfirm(
      'Confirm Bulk Adjustment',
      `You are about to ${adjustType} ${parsedAmount.toFixed(2)} ${coinType.toUpperCase()} coins ${adjustType === 'credit' ? 'to' : 'from'} ${previewData.readyToProcess} users.\n\nTotal amount: ${totalAmount.toFixed(2)} coins\nReason: ${reason.trim()}\n\nThis action cannot be undone.`,
      () => executeBulkAdjust(),
      'Confirm'
    );
  };

  const executeBulkAdjust = async () => {
    setStep('processing');
    setProcessLoading(true);
    setProcessingProgress(0);

    // Simulate progress since we can't get real-time progress from the API
    const progressInterval = setInterval(() => {
      setProcessingProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      const ids = parseUserIds();
      const response = await apiClient.post<{ data: BulkAdjustResponse }>('admin/user-wallets/bulk-adjust', {
        userIds: ids,
        amount: Number(amount),
        type: adjustType,
        reason: reason.trim(),
        coinType,
      });

      clearInterval(progressInterval);
      setProcessingProgress(100);

      if (response.success && response.data) {
        setResults(response.data as unknown as BulkAdjustResponse);
        setStep('results');
      } else {
        showAlert('Error', response.message || 'Bulk adjustment failed');
        setStep('preview');
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      showAlert('Error', err.message || 'Bulk adjustment failed');
      setStep('preview');
    } finally {
      setProcessLoading(false);
    }
  };

  const handleReset = () => {
    setUserIdsText('');
    setAmount('');
    setReason('');
    setAdjustType('credit');
    setCoinType('rez');
    setStep('input');
    setPreviewData(null);
    setResults(null);
    setProcessingProgress(0);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.tint }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Bulk Wallet Adjustment</Text>
          <Text style={styles.headerSubtitle}>
            Credit or debit coins for multiple users
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step Indicator */}
        <View style={[styles.stepIndicator, { backgroundColor: colors.card }]}>
          {(['input', 'preview', 'results'] as Step[]).map((s, i) => {
            const isActive = getStepIndex(step) >= i;
            const labels = ['1. Configure', '2. Preview', '3. Results'];
            return (
              <View key={s} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor: isActive ? colors.tint : colors.gray300,
                    },
                  ]}
                >
                  <Text style={styles.stepDotText}>{i + 1}</Text>
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    { color: isActive ? colors.text : colors.muted },
                  ]}
                >
                  {labels[i]}
                </Text>
                {i < 2 && (
                  <View
                    style={[
                      styles.stepLine,
                      {
                        backgroundColor: getStepIndex(step) > i ? colors.tint : colors.gray300,
                      },
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>

        {/* Step 1: Input */}
        {step === 'input' && (
          <>
            {/* User IDs Input */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="people" size={18} color={colors.info} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>User IDs</Text>
              </View>
              <Text style={[styles.inputHint, { color: colors.icon }]}>
                Paste user IDs, one per line (or comma/semicolon separated)
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                multiline
                numberOfLines={6}
                value={userIdsText}
                onChangeText={setUserIdsText}
                placeholder="Paste user IDs here..."
                placeholderTextColor={colors.muted}
                textAlignVertical="top"
              />
              <Text style={[styles.idCount, { color: colors.icon }]}>
                {parseUserIds().length} user ID{parseUserIds().length !== 1 ? 's' : ''} detected
              </Text>
            </View>

            {/* Adjustment Config */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="settings" size={18} color={colors.purple} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  Adjustment Configuration
                </Text>
              </View>

              {/* Type Toggle */}
              <Text style={[styles.fieldLabel, { color: colors.icon }]}>Type</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    adjustType === 'credit' && { backgroundColor: Colors.light.success, borderColor: Colors.light.success },
                    adjustType !== 'credit' && { borderColor: colors.border },
                  ]}
                  onPress={() => setAdjustType('credit')}
                >
                  <Ionicons
                    name="add-circle"
                    size={16}
                    color={adjustType === 'credit' ? '#fff' : colors.icon}
                  />
                  <Text
                    style={[
                      styles.toggleText,
                      { color: adjustType === 'credit' ? '#fff' : colors.text },
                    ]}
                  >
                    Credit
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    adjustType === 'debit' && { backgroundColor: Colors.light.errorDark, borderColor: Colors.light.errorDark },
                    adjustType !== 'debit' && { borderColor: colors.border },
                  ]}
                  onPress={() => setAdjustType('debit')}
                >
                  <Ionicons
                    name="remove-circle"
                    size={16}
                    color={adjustType === 'debit' ? '#fff' : colors.icon}
                  />
                  <Text
                    style={[
                      styles.toggleText,
                      { color: adjustType === 'debit' ? '#fff' : colors.text },
                    ]}
                  >
                    Debit
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Amount */}
              <Text style={[styles.fieldLabel, { color: colors.icon }]}>Amount</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                value={amount}
                onChangeText={setAmount}
                placeholder="Enter amount (e.g., 50)"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
              />

              {/* Coin Type */}
              <Text style={[styles.fieldLabel, { color: colors.icon }]}>Coin Type</Text>
              <View style={styles.chipRow}>
                {(['rez', 'promo', 'branded'] as CoinType[]).map((ct) => (
                  <TouchableOpacity
                    key={ct}
                    style={[
                      styles.chip,
                      coinType === ct
                        ? { backgroundColor: colors.purpleDark, borderColor: colors.purpleDark }
                        : { borderColor: colors.border },
                    ]}
                    onPress={() => setCoinType(ct)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: coinType === ct ? '#fff' : colors.text },
                      ]}
                    >
                      {ct === 'rez' ? 'Rez Coins' : ct === 'promo' ? 'Promo Coins' : 'Branded Coins'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Reason */}
              <Text style={[styles.fieldLabel, { color: colors.icon }]}>
                Reason <Text style={{ color: colors.errorDark }}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                value={reason}
                onChangeText={setReason}
                placeholder='e.g., "Festival bonus", "Compensation", "Correction"'
                placeholderTextColor={colors.muted}
              />
            </View>

            {/* Preview Button */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                {
                  backgroundColor: colors.tint,
                  opacity: previewLoading ? 0.7 : 1,
                },
              ]}
              onPress={handlePreview}
              disabled={previewLoading}
            >
              {previewLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="eye" size={18} color="#fff" />
                  <Text style={styles.primaryButtonText}>Preview Adjustment</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && previewData && (
          <>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="document-text" size={18} color={colors.info} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  Adjustment Summary
                </Text>
              </View>

              {/* Summary Cards */}
              <View style={styles.summaryGrid}>
                <View style={[styles.summaryCard, { backgroundColor: `${colors.info}10` }]}>
                  <Text style={[styles.summaryValue, { color: colors.info }]}>
                    {previewData.totalInput}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                    Total Input
                  </Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: `${colors.success}10` }]}>
                  <Text style={[styles.summaryValue, { color: colors.successDark }]}>
                    {previewData.readyToProcess}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                    Ready to Process
                  </Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: `${colors.warning}10` }]}>
                  <Text style={[styles.summaryValue, { color: colors.warningDark }]}>
                    {previewData.frozenWallets}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                    Frozen Wallets
                  </Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: `${colors.error}10` }]}>
                  <Text style={[styles.summaryValue, { color: colors.errorDark }]}>
                    {previewData.invalidIds + previewData.notFoundIds.length + previewData.noWalletIds.length}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                    Skipped
                  </Text>
                </View>
              </View>

              {/* Adjustment Details */}
              <View style={[styles.detailsBox, { borderColor: colors.border }]}>
                <DetailRow
                  label="Type"
                  value={adjustType === 'credit' ? 'CREDIT' : 'DEBIT'}
                  valueColor={adjustType === 'credit' ? colors.successDark : colors.errorDark}
                />
                <DetailRow label="Amount per User" value={`${Number(amount).toFixed(2)} coins`} />
                <DetailRow label="Coin Type" value={coinType.toUpperCase()} />
                <DetailRow
                  label="Total Amount"
                  value={`${(Number(amount) * previewData.readyToProcess).toFixed(2)} coins`}
                  valueColor={colors.text}
                />
                <DetailRow label="Reason" value={reason.trim()} />
              </View>

              {/* Warnings */}
              {previewData.notFoundIds.length > 0 && (
                <View style={[styles.warningBox, { backgroundColor: `${colors.warning}10`, borderColor: colors.warningDark }]}>
                  <Ionicons name="warning" size={16} color={colors.warningDark} />
                  <Text style={[styles.warningText, { color: colors.warningDark }]}>
                    {previewData.notFoundIds.length} user(s) not found in the system
                  </Text>
                </View>
              )}
              {previewData.noWalletIds.length > 0 && (
                <View style={[styles.warningBox, { backgroundColor: `${colors.warning}10`, borderColor: colors.warningDark }]}>
                  <Ionicons name="wallet" size={16} color={colors.warningDark} />
                  <Text style={[styles.warningText, { color: colors.warningDark }]}>
                    {previewData.noWalletIds.length} user(s) have no wallet
                  </Text>
                </View>
              )}
            </View>

            {/* Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.border }]}
                onPress={() => setStep('input')}
              >
                <Ionicons name="arrow-back" size={16} color={colors.text} />
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: adjustType === 'credit' ? colors.success : colors.errorDark, flex: 1 }]}
                onPress={handleConfirmAndProcess}
              >
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>
                  Confirm & {adjustType === 'credit' ? 'Credit' : 'Debit'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Step 3a: Processing */}
        {step === 'processing' && (
          <View style={[styles.card, { backgroundColor: colors.card, alignItems: 'center' }]}>
            <ActivityIndicator size="large" color={colors.tint} style={{ marginBottom: 16 }} />
            <Text style={[styles.processingTitle, { color: colors.text }]}>
              Processing Bulk Adjustment...
            </Text>
            <Text style={[styles.processingSubtitle, { color: colors.icon }]}>
              Please do not close this page
            </Text>
            {/* Progress Bar */}
            <View style={[styles.progressBarOuter, { backgroundColor: colors.gray200 }]}>
              <View
                style={[
                  styles.progressBarInner,
                  {
                    backgroundColor: colors.tint,
                    width: `${Math.min(100, processingProgress)}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.icon }]}>
              {Math.round(processingProgress)}%
            </Text>
          </View>
        )}

        {/* Step 3b: Results */}
        {step === 'results' && results && (
          <>
            {/* Summary */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="checkmark-done-circle" size={18} color={colors.success} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Results</Text>
              </View>

              <View style={styles.resultsGrid}>
                <View style={[styles.resultStat, { backgroundColor: `${colors.success}10` }]}>
                  <Ionicons name="checkmark-circle" size={28} color={colors.successDark} />
                  <Text style={[styles.resultStatValue, { color: colors.successDark }]}>
                    {results.successCount}
                  </Text>
                  <Text style={[styles.resultStatLabel, { color: colors.icon }]}>
                    Succeeded
                  </Text>
                </View>
                <View style={[styles.resultStat, { backgroundColor: `${colors.error}10` }]}>
                  <Ionicons name="close-circle" size={28} color={colors.errorDark} />
                  <Text style={[styles.resultStatValue, { color: colors.errorDark }]}>
                    {results.failedCount}
                  </Text>
                  <Text style={[styles.resultStatLabel, { color: colors.icon }]}>Failed</Text>
                </View>
                <View style={[styles.resultStat, { backgroundColor: `${colors.info}10` }]}>
                  <Ionicons name="list" size={28} color={colors.info} />
                  <Text style={[styles.resultStatValue, { color: colors.info }]}>
                    {results.totalProcessed}
                  </Text>
                  <Text style={[styles.resultStatLabel, { color: colors.icon }]}>Total</Text>
                </View>
              </View>

              <View style={[styles.batchIdRow, { borderColor: colors.border }]}>
                <Text style={[styles.batchIdLabel, { color: colors.icon }]}>Batch ID:</Text>
                <Text style={[styles.batchIdValue, { color: colors.text }]} numberOfLines={1}>
                  {results.batchId}
                </Text>
              </View>
            </View>

            {/* Failed Users */}
            {results.failedCount > 0 && (
              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="alert-circle" size={18} color={colors.errorDark} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    Failed Adjustments
                  </Text>
                </View>
                {results.results
                  .filter((r) => !r.success)
                  .map((r, i) => (
                    <View
                      key={`${r.userId}-${i}`}
                      style={[styles.failedRow, { borderBottomColor: colors.border }]}
                    >
                      <Text style={[styles.failedUserId, { color: colors.text }]} numberOfLines={1}>
                        {r.userId}
                      </Text>
                      <Text style={[styles.failedMessage, { color: colors.errorDark }]}>
                        {r.message}
                      </Text>
                    </View>
                  ))}
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.tint, flex: 1 }]}
                onPress={handleReset}
              >
                <Ionicons name="refresh" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>New Adjustment</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---- Detail Row ----

function DetailRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.icon }]}>{label}</Text>
      <Text
        style={[styles.detailValue, { color: valueColor || colors.text }]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

// ---- Helpers ----

function getStepIndex(step: Step): number {
  const steps: Step[] = ['input', 'preview', 'processing', 'results'];
  const idx = steps.indexOf(step);
  // processing and results share the same visual step (2)
  return idx >= 3 ? 2 : idx;
}

// ---- Styles ----

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },

  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    gap: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  stepLine: {
    width: 24,
    height: 2,
    marginHorizontal: 6,
    borderRadius: 1,
  },

  // Cards
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Input
  inputHint: {
    fontSize: 12,
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 120,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 20,
  },
  idCount: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'right',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderRadius: 10,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Buttons
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 16,
  },

  // Summary
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    minWidth: '40%',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },

  // Details
  detailsBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },

  // Warning
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },

  // Processing
  processingTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  processingSubtitle: {
    fontSize: 13,
    marginBottom: 20,
  },
  progressBarOuter: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarInner: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },

  // Results
  resultsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  resultStat: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  resultStatValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  resultStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  batchIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  batchIdLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 6,
  },
  batchIdValue: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
  },

  // Failed
  failedRow: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  failedUserId: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  failedMessage: {
    fontSize: 12,
    marginTop: 2,
  },
});
