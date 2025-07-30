// Predefined color palette for tags
const TAG_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#EC4899', // Pink
  '#84CC16', // Lime
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#F43F5E', // Rose
  '#A855F7', // Violet
  '#22C55E', // Emerald
  '#EAB308', // Amber
  '#06B6D4', // Sky
  '#F472B6', // Pink
  '#A3E635', // Lime
  '#34D399', // Emerald
  '#FBBF24', // Amber
];

// Function to get a unique color that's not already used
export function getUniqueColor(existingColors: string[]): string {
  // Filter out colors that are already in use
  const availableColors = TAG_COLORS.filter(color => 
    !existingColors.includes(color)
  );
  
  // If we have available colors, use the first one
  if (availableColors.length > 0) {
    return availableColors[0];
  }
  
  // If all predefined colors are used, generate a random color
  return generateRandomColor();
}

// Function to generate a random color that's not in the existing colors
function generateRandomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 60 + Math.floor(Math.random() * 30); // 60-90%
  const lightness = 45 + Math.floor(Math.random() * 20); // 45-65%
  
  // Convert HSL to hex for consistency
  return hslToHex(hue, saturation, lightness);
}

// Convert HSL to Hex
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Function to get all existing tag colors from a list of tags
export function getExistingColors(tags: Array<{ color?: string }>): string[] {
  return tags
    .map(tag => tag.color)
    .filter((color): color is string => !!color);
} 