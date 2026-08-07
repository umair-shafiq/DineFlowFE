export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  categoryId?: number | string;
  outOfStock: boolean;
  availabilityStatus?: 'AVAILABLE' | 'OUT_OF_STOCK';
  image: string;
  imageUrl?: string;
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
  subtotal?: number;
  unitPrice?: number;
}

export interface Order {
  id: string;
  orderId?: number | string;
  orderNumber: string;
  items: OrderItem[];
  total: number;
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  status: 'pending' | 'preparing' | 'completed' | 'cancelled';
  orderStatus?: string;
  createdAt: string;
  tableNumber: string;
  restaurantTableId?: number;
  restaurantTable?: {
    capacity?: number;
    restaurantTableId?: number;
    tableNumber?: string;
    tableStatus?: string;
  };
  customerName?: string;
}
