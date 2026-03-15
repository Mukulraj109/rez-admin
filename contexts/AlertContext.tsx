import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface AlertConfig {
  type: AlertType;
  title: string;
  message: string;
  buttons: AlertButton[];
}

interface AlertContextType {
  showAlert: (title: string, message: string, type?: AlertType) => void;
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText?: string,
    type?: AlertType
  ) => void;
}

const AlertContext = createContext<AlertContextType | null>(null);

// Global ref for non-component usage
let globalAlertRef: AlertContextType | null = null;

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}

// Standalone functions that work outside of components
export function showAlertGlobal(title: string, message: string, type?: AlertType) {
  if (globalAlertRef) {
    globalAlertRef.showAlert(title, message, type);
  }
}

export function showConfirmGlobal(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText?: string,
  type?: AlertType
) {
  if (globalAlertRef) {
    globalAlertRef.showConfirm(title, message, onConfirm, confirmText, type);
  }
}

const ICON_CONFIG: Record<AlertType, { name: keyof typeof Ionicons.glyphMap; color: string; bgColor: string }> = {
  success: { name: 'checkmark-circle', color: '#10B981', bgColor: '#D1FAE5' },
  error: { name: 'close-circle', color: '#EF4444', bgColor: '#FEE2E2' },
  warning: { name: 'warning', color: '#F59E0B', bgColor: '#FEF3C7' },
  info: { name: 'information-circle', color: Colors.light.info, bgColor: Colors.light.infoLighter },
  confirm: { name: 'help-circle', color: '#8B5CF6', bgColor: '#EDE9FE' },
};

function AlertModal({ config, visible, onDismiss }: { config: AlertConfig | null; visible: boolean; onDismiss: () => void }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  }, [onDismiss]);

  if (!config) return null;

  const iconConfig = ICON_CONFIG[config.type];
  const { width } = Dimensions.get('window');
  const modalWidth = Math.min(width - 48, 360);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  backgroundColor: colors.card,
                  width: modalWidth,
                  transform: [
                    {
                      scale: scaleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.85, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* Icon */}
              <View style={[styles.iconCircle, { backgroundColor: iconConfig.bgColor }]}>
                <Ionicons name={iconConfig.name} size={36} color={iconConfig.color} />
              </View>

              {/* Title */}
              <Text style={[styles.title, { color: colors.text }]}>{config.title}</Text>

              {/* Message */}
              <Text style={[styles.message, { color: colors.icon }]}>{config.message}</Text>

              {/* Divider */}
              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Buttons */}
              <View style={[styles.buttonRow, config.buttons.length === 1 && styles.buttonRowSingle]}>
                {config.buttons.map((button, index) => {
                  const isCancel = button.style === 'cancel';
                  const isDestructive = button.style === 'destructive';

                  let btnBg = colors.tint;
                  let btnTextColor = '#FFFFFF';
                  if (isCancel) {
                    btnBg = colorScheme === 'dark' ? '#374151' : '#F1F5F9';
                    btnTextColor = colors.text;
                  } else if (isDestructive) {
                    btnBg = colors.error;
                  } else if (config.type === 'success') {
                    btnBg = '#10B981';
                  } else if (config.type === 'error') {
                    btnBg = colors.error;
                  } else if (config.type === 'info') {
                    btnBg = '#3B82F6';
                  } else if (config.type === 'warning') {
                    btnBg = '#F59E0B';
                  }

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.button,
                        { backgroundColor: btnBg },
                        config.buttons.length > 1 && styles.buttonFlex,
                      ]}
                      onPress={() => {
                        if (button.onPress) button.onPress();
                        handleClose();
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.buttonText, { color: btnTextColor }]}>
                        {button.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const queueRef = useRef<AlertConfig[]>([]);

  const processQueue = useCallback(() => {
    if (queueRef.current.length > 0 && !visible) {
      const next = queueRef.current.shift()!;
      setConfig(next);
      setVisible(true);
    }
  }, [visible]);

  const showAlert = useCallback((title: string, message: string, type?: AlertType) => {
    const alertType = type || inferType(title);
    const newConfig: AlertConfig = {
      type: alertType,
      title,
      message,
      buttons: [{ text: 'OK', style: 'default' }],
    };
    queueRef.current.push(newConfig);
    if (!visible) {
      const next = queueRef.current.shift()!;
      setConfig(next);
      setVisible(true);
    }
  }, [visible]);

  const showConfirm = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText: string = 'Confirm',
    type?: AlertType
  ) => {
    const newConfig: AlertConfig = {
      type: type || 'confirm',
      title,
      message,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: confirmText, style: 'default', onPress: onConfirm },
      ],
    };
    queueRef.current.push(newConfig);
    if (!visible) {
      const next = queueRef.current.shift()!;
      setConfig(next);
      setVisible(true);
    }
  }, [visible]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setConfig(null);
    // Process next in queue after a short delay
    setTimeout(() => {
      if (queueRef.current.length > 0) {
        const next = queueRef.current.shift()!;
        setConfig(next);
        setVisible(true);
      }
    }, 300);
  }, []);

  const contextValue: AlertContextType = { showAlert, showConfirm };

  // Set global ref
  useEffect(() => {
    globalAlertRef = contextValue;
    return () => {
      globalAlertRef = null;
    };
  }, [showAlert, showConfirm]);

  return (
    <AlertContext.Provider value={contextValue}>
      {children}
      <AlertModal config={config} visible={visible} onDismiss={handleDismiss} />
    </AlertContext.Provider>
  );
}

function inferType(title: string): AlertType {
  const lower = title.toLowerCase();
  if (lower.includes('success')) return 'success';
  if (lower.includes('error') || lower.includes('fail')) return 'error';
  if (lower.includes('warning') || lower.includes('caution')) return 'warning';
  return 'info';
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    borderRadius: 20,
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    alignSelf: 'stretch',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'stretch',
  },
  buttonRowSingle: {
    justifyContent: 'center',
  },
  buttonFlex: {
    flex: 1,
  },
  button: {
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
