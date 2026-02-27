/**
 * Theme Context for Admin Panel
 * Provides a consistent color palette for the admin dashboard.
 */

import React, { createContext, useContext } from 'react';

const colors = {
  background: '#FFFFFF',
  card: '#F9FAFB',
  text: '#111827',
  secondaryText: '#6B7280',
  border: '#E5E7EB',
  icon: '#9CA3AF',
  primary: '#C9A962',
  error: '#EF4444',
  success: '#10B981',
};

type ThemeColors = typeof colors;

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors,
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={{ colors, isDark: false }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export default ThemeContext;
