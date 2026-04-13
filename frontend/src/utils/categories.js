/**
 * Category helpers – derive categories from product names and map icons.
 */

export const CATEGORIES = ['All', 'Phones', 'Laptops', 'Tablets', 'Accessories', 'Audio', 'Displays', 'Storage'];

export const CATEGORY_ICONS = {
  Phones:      '📱',
  Laptops:     '💻',
  Tablets:     '📲',
  Accessories: '⌨️',
  Audio:       '🎧',
  Displays:    '🖥️',
  Storage:     '💾',
  Other:       '📦',
};

const KEYWORD_MAP = {
  Phones:      ['phone', 'mobile', 'smartphone', 'iphone', 'samsung', 'pixel'],
  Laptops:     ['laptop', 'notebook', 'macbook', 'thinkpad', 'chromebook'],
  Tablets:     ['tablet', 'ipad', 'surface'],
  Displays:    ['display', 'monitor', 'screen'],
  Audio:       ['headphone', 'earphone', 'speaker', 'airpod', 'earbud', 'audio', 'mic', 'microphone', 'webcam'],
  Storage:     ['drive', 'ssd', 'hdd', 'usb', 'card', 'storage', 'hub'],
  Accessories: ['keyboard', 'mouse', 'mousepad', 'cable', 'charger', 'adapter', 'lamp', 'desk', 'stand', 'bracket'],
};

/**
 * Map a product name to a category string.
 * @param {string} name
 * @returns {string}
 */
export function getCategoryFor(name = '') {
  const lower = name.toLowerCase();
  for (const [cat, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some(kw => lower.includes(kw))) return cat;
  }
  return 'Accessories';
}
