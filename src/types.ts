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
  orderType?: 'DINE_IN' | 'TAKEAWAY';
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

export type UserRole = 'ADMIN' | 'WAITER' | 'CHEF';

export type TableStatus = 'FREE' | 'OCCUPIED' | 'RESERVED' | string;

export interface RestaurantTable {
  restaurantTableId: number;
  id?: number | string;
  tableNumber: string;
  capacity: number;
  tableStatus: TableStatus;
}

export interface User {
  userId: number;
  id?: string;
  fullName: string;
  email: string;
  userRole: UserRole;
  userStatus: boolean;
  createdAt?: string;
  password?: string;
}

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface Reservation {
  reservationId: number;
  id?: number | string;
  customerName: string;
  customerPhone: string;
  numberOfGuests: number;
  reservationDateTime: string;
  restaurantTableId?: number;
  restaurantTable?: RestaurantTable;
  status: ReservationStatus;
  createdAt?: string;
}

export interface AuthUser {
  token: string;
  email: string;
  userRole: UserRole;
  fullName?: string;
  userId?: number;
}

export interface ReservationRequestDto {
  restaurantTableId?: number;
  customerName?: string;
  customerPhone?: string;
  numberOfGuests?: number;
  reservationDateTime?: string;
}

export type PaymentStatus = 'UNPAID' | 'PAID' | string;
export type PaymentMethod = 'CASH' | 'CARD' | 'ONLINE' | string;

export interface InvoiceOrderItem {
  orderItemId?: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  menuItem: {
    id: number | string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    availabilityStatus?: string;
    category?: {
      id?: number | string;
      name: string;
    };
  };
}

export interface InvoiceOrder {
  orderId?: number;
  orderNumber?: string;
  orderStatus?: string;
  orderType?: 'DINE_IN' | 'TAKEAWAY' | string;
  createdAt?: string;
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  restaurantTable?: {
    restaurantTableId?: number;
    tableNumber?: string;
    capacity?: number;
    tableStatus?: string;
  };
  orderItems?: InvoiceOrderItem[];
}

export interface Invoice {
  invoiceId: number;
  id?: number | string;
  invoiceNumber: string;
  createdAt: string;
  paymentStatus: PaymentStatus;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  order: InvoiceOrder;
}

export interface PaymentRecord {
  paymentId?: number;
  invoiceId: number;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  paidAt?: string;
}

export interface RecordPaymentPayload {
  amountPaid: number;
  paymentMethod: 'CASH' | 'CARD' | 'ONLINE' | string;
}

export type KitchenItemStatus = 'PENDING' | 'COOKING' | 'READY';

export interface KitchenOrderItem {
  orderItemId: number;
  menuItemName: string;
  quantity: number;
  itemStatus: KitchenItemStatus;
}

export interface KitchenOrder {
  orderId: number;
  orderNumber: string;
  orderType?: 'DINE_IN' | 'TAKEAWAY' | string;
  tableNumber: string;
  createdAt: string;
  items: KitchenOrderItem[];
}

