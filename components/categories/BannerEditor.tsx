import React from 'react';
import { View } from 'react-native';
import { PageConfig } from '../../services/api/categories';
import FormField from './FormField';

interface BannerEditorProps {
  pageConfig: PageConfig;
  setPageConfig: React.Dispatch<React.SetStateAction<PageConfig>>;
  colors: { text: string; icon: string; border: string };
}

const BANNER_FIELDS: Array<{ key: keyof PageConfig['banner']; label: string; placeholder: string }> = [
  { key: 'title', label: 'Title', placeholder: 'Banner title' },
  { key: 'subtitle', label: 'Subtitle', placeholder: 'Banner subtitle' },
  { key: 'discount', label: 'Discount', placeholder: 'e.g. Up to 30% off' },
  { key: 'tag', label: 'Tag', placeholder: 'e.g. HOT DEALS' },
  { key: 'image', label: 'Image URL', placeholder: 'https://...' },
  { key: 'ctaText', label: 'CTA Text', placeholder: 'e.g. Explore Now' },
  { key: 'ctaRoute', label: 'CTA Route', placeholder: '/explore/category/...' },
];

const BannerEditor = React.memo(({ pageConfig, setPageConfig, colors }: BannerEditorProps) => (
  <View>
    {BANNER_FIELDS.map((f) => (
      <FormField
        key={f.key}
        label={f.label}
        value={(pageConfig.banner[f.key] as string) || ''}
        onChangeText={(val) =>
          setPageConfig((p) => ({ ...p, banner: { ...p.banner, [f.key]: val } }))
        }
        placeholder={f.placeholder}
        colors={colors}
      />
    ))}
  </View>
));

BannerEditor.displayName = 'BannerEditor';
export default BannerEditor;
