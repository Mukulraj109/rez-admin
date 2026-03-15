import React from 'react';
import { View } from 'react-native';
import { PageConfig } from '../../services/api/categories';
import ColorInput from './ColorInput';
import IconInput from './IconInput';
import { Colors } from '@/constants/Colors';

interface ThemeEditorProps {
  pageConfig: PageConfig;
  setPageConfig: React.Dispatch<React.SetStateAction<PageConfig>>;
  colors: typeof Colors.light;
}

const ThemeEditor = React.memo(({ pageConfig, setPageConfig, colors }: ThemeEditorProps) => {
  const { theme } = pageConfig;

  const updateTheme = (field: string, value: any) => {
    setPageConfig((p) => ({ ...p, theme: { ...p.theme, [field]: value } }));
  };

  const updateGradient = (index: number, value: string) => {
    const gc = [...(theme.gradientColors || ['', '', ''])];
    gc[index] = value;
    setPageConfig((p) => ({ ...p, theme: { ...p.theme, gradientColors: gc } }));
  };

  return (
    <View>
      <ColorInput
        label="Primary Color"
        value={theme.primaryColor}
        onChange={(v) => updateTheme('primaryColor', v)}
        placeholder={colors.navy}
        colors={colors}
      />
      <ColorInput
        label="Gradient Color 1"
        value={theme.gradientColors?.[0] || ''}
        onChange={(v) => updateGradient(0, v)}
        placeholder={colors.navy}
        colors={colors}
      />
      <ColorInput
        label="Gradient Color 2"
        value={theme.gradientColors?.[1] || ''}
        onChange={(v) => updateGradient(1, v)}
        placeholder="#2d5a7b"
        colors={colors}
      />
      <ColorInput
        label="Gradient Color 3"
        value={theme.gradientColors?.[2] || ''}
        onChange={(v) => updateGradient(2, v)}
        placeholder="#3d7aab"
        colors={colors}
      />
      <ColorInput
        label="Accent Color"
        value={theme.accentColor || ''}
        onChange={(v) => updateTheme('accentColor', v)}
        placeholder="#FF6B35"
        colors={colors}
      />
      <ColorInput
        label="Background Color"
        value={theme.backgroundColor || ''}
        onChange={(v) => updateTheme('backgroundColor', v)}
        placeholder="#F5F5F5"
        colors={colors}
      />
      <IconInput
        label="Icon Name"
        value={theme.icon}
        onChange={(v) => updateTheme('icon', v)}
        placeholder="grid"
        colors={colors}
      />
    </View>
  );
});

ThemeEditor.displayName = 'ThemeEditor';
export default ThemeEditor;
