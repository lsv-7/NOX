export interface LineItem {
  name: string;
  size: '15g' | '50g';
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export function parseOrderItems(itemsJson: string | null | undefined): LineItem[] | null {
  if (!itemsJson) return null;
  try {
    const parsed = JSON.parse(itemsJson);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as LineItem[];
    }
  } catch {}
  return null;
}

