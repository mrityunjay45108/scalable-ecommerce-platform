'use client';

export interface RegionalHeritageItem {
  id: string;
  region: string;
  title: string;
  image: string;
  highlight: string;
  slug: string;
  searchQuery?: string;
  description?: string;
}

export const DEFAULT_REGIONAL_HERITAGE: RegionalHeritageItem[] = [
  {
    id: 'region-north',
    region: 'North India (उत्तर भारत)',
    title: 'Kashmiri Pashmina & Moradabad Brass',
    image: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600',
    highlight: 'Kashmir, Punjab, UP & Uttarakhand',
    slug: 'apparel-fashion',
    searchQuery: 'Kashmir',
  },
  {
    id: 'region-west',
    region: 'West India (पश्चिम भारत)',
    title: 'Jaipuri Bandhani & Kutch Mirrorwork',
    image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600',
    highlight: 'Rajasthan, Gujarat & Maharashtra',
    slug: 'apparel-fashion',
    searchQuery: 'Jaipur',
  },
  {
    id: 'region-south',
    region: 'South India (दक्षिण भारत)',
    title: 'Kanchipuram Silk & Mysore Sandalwood',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600',
    highlight: 'Tamil Nadu, Karnataka, Kerala & AP',
    slug: 'home-living',
    searchQuery: 'Silk',
  },
  {
    id: 'region-east',
    region: 'East India (पूर्व भारत)',
    title: 'Bhagalpuri Tussar, Assam Tea & Madhubani',
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600',
    highlight: 'Bihar, Bengal, Assam & Odisha',
    slug: 'apparel-fashion',
    searchQuery: 'Assam',
  },
];

const STORAGE_KEY = 'swadesh_regional_heritage_v1';

export function getRegionalHeritage(): RegionalHeritageItem[] {
  if (typeof window === 'undefined') {
    return DEFAULT_REGIONAL_HERITAGE;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_REGIONAL_HERITAGE));
      return DEFAULT_REGIONAL_HERITAGE;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_REGIONAL_HERITAGE;
  } catch {
    return DEFAULT_REGIONAL_HERITAGE;
  }
}

export function saveRegionalHeritageItem(item: RegionalHeritageItem): RegionalHeritageItem[] {
  const current = getRegionalHeritage();
  const existingIdx = current.findIndex((i) => i.id === item.id);
  let updated: RegionalHeritageItem[];

  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = item;
  } else {
    updated = [...current, item];
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('regional-heritage-updated'));
  }
  return updated;
}

export function deleteRegionalHeritageItem(id: string): RegionalHeritageItem[] {
  const current = getRegionalHeritage();
  const updated = current.filter((i) => i.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('regional-heritage-updated'));
  }
  return updated;
}

export function resetRegionalHeritage(): RegionalHeritageItem[] {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_REGIONAL_HERITAGE));
    window.dispatchEvent(new Event('regional-heritage-updated'));
  }
  return DEFAULT_REGIONAL_HERITAGE;
}
