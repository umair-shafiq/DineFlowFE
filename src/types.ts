export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  outOfStock: boolean;
  image: string;
  description: string;
  modifiers?: string[]; // IDs of ModifierGroup or specific Modifier IDs
}

export interface Category {
  id: string;
  name: string;
}

export interface Modifier {
  id: string;
  name: string;
  price: number;
  category: string; // e.g. "Toppings", "Sauces", "Doneness"
}

export interface OrderItem {
  id: string; // Unique for this specific order item (due to modifiers)
  menuItemId: string;
  name: string;
  quantity: number;
  price: number; // Base price + active modifiers
  selectedModifiers: {
    id: string;
    name: string;
    price: number;
  }[];
}

export interface Order {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'preparing' | 'completed' | 'cancelled';
  createdAt: string;
  tableNumber: string;
  customerName?: string;
}
