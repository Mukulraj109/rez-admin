import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface BulkAction {
  label: string;
  icon: string;
  color?: string;
  onPress: () => void;
  disabled?: boolean;
}

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  actions: BulkAction[];
  isAllSelected: boolean;
}

/**
 * BulkActionBar
 *
 * A shared bar component that appears at the bottom of the screen when items
 * are selected in a list. Provides "Select All" / "Clear" toggle, selected
 * count badge, and a row of action buttons.
 *
 * Usage:
 * ```tsx
 * <BulkActionBar
 *   selectedCount={selected.size}
 *   totalCount={items.length}
 *   onSelectAll={() => setSelected(new Set(items.map(i => i._id)))}
 *   onClearSelection={() => setSelected(new Set())}
 *   isAllSelected={selected.size === items.length}
 *   actions={[
 *     { label: 'Delete', icon: 'trash-outline', color: colors.error, onPress: handleBulkDelete },
 *     { label: 'Approve', icon: 'checkmark-circle-outline', color: Colors.light.green, onPress: handleBulkApprove },
 *   ]}
 * />
 * ```
 */
const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  actions,
  isAllSelected,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Don't render if nothing is selected
  if (selectedCount === 0) return null;

  const colors = isDark ? Colors.dark : Colors.light;
  const bgColor = Colors.light.card;
  const borderColor = Colors.light.border;
  const textColor = Colors.light.text;
  const mutedColor = Colors.light.secondaryText;

  return (
    <View style={[styles.container, { backgroundColor: bgColor, borderTopColor: borderColor }]}>
      {/* Left: count + select/clear */}
      <View style={styles.leftSection}>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{selectedCount}</Text>
        </View>
        <Text style={[styles.selectedLabel, { color: textColor }]}>
          selected
        </Text>
        <TouchableOpacity
          style={[styles.toggleBtn, { borderColor }]}
          onPress={isAllSelected ? onClearSelection : onSelectAll}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isAllSelected ? 'close-circle-outline' : 'checkmark-done-outline'}
            size={16}
            color={mutedColor}
          />
          <Text style={[styles.toggleText, { color: mutedColor }]}>
            {isAllSelected ? 'Clear' : `All (${totalCount})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Right: action buttons */}
      <View style={styles.actionsRow}>
        {actions.map((action, index) => {
          const actionColor = action.color || Colors.light.info;
          return (
            <TouchableOpacity
              key={`${action.label}-${index}`}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: actionColor + '15',
                  borderColor: actionColor + '40',
                  opacity: action.disabled ? 0.5 : 1,
                },
              ]}
              onPress={action.onPress}
              disabled={action.disabled}
              activeOpacity={0.7}
            >
              <Ionicons
                name={action.icon as any}
                size={16}
                color={actionColor}
              />
              <Text style={[styles.actionLabel, { color: actionColor }]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default React.memo(BulkActionBar);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 100,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    backgroundColor: Colors.light.info,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countText: {
    color: Colors.light.card,
    fontSize: 13,
    fontWeight: '700',
  },
  selectedLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 4,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
