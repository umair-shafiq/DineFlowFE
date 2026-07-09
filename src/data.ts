import { MenuItem, Category, Modifier, Order } from './types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Appetizers' },
  { id: 'cat-2', name: 'Main Course' },
  { id: 'cat-3', name: 'Desserts' },
  { id: 'cat-4', name: 'Drinks' }
];

export const INITIAL_MODIFIERS: Modifier[] = [
  { id: 'mod-1', name: 'Extra Truffle Shavings', price: 6.50, category: 'Add-ons' },
  { id: 'mod-2', name: 'Gluten-Free Bun', price: 2.00, category: 'Dietary' },
  { id: 'mod-3', name: 'Extra Cheese', price: 1.50, category: 'Add-ons' },
  { id: 'mod-4', name: 'Double Patty', price: 5.50, category: 'Add-ons' },
  { id: 'mod-5', name: 'Aged Cheddar Melt', price: 2.50, category: 'Add-ons' },
  { id: 'mod-6', name: 'Ice Level: No Ice', price: 0.00, category: 'Preferences' },
  { id: 'mod-7', name: 'Ice Level: Extra Ice', price: 0.00, category: 'Preferences' },
  { id: 'mod-8', name: 'Sweetness: Half Sweet', price: 0.00, category: 'Preferences' }
];

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  {
    id: 'item-1',
    name: 'Truffle Mushroom Risotto',
    price: 24.00,
    category: 'Main Course',
    outOfStock: false,
    image: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=600&q=80',
    description: 'Creamy Arborio rice slow-cooked with white truffle oil, wild forest mushrooms, and shaved Reggiano.',
    modifiers: ['mod-1']
  },
  {
    id: 'item-2',
    name: 'Wagyu Beef Sliders',
    price: 18.50,
    category: 'Appetizers',
    outOfStock: true,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    description: 'Three mini Wagyu beef patties on toasted brioche with truffle aioli, caramelized onions, and aged white cheddar.',
    modifiers: ['mod-2', 'mod-3', 'mod-4', 'mod-5']
  },
  {
    id: 'item-3',
    name: 'Matcha Lava Cake',
    price: 12.00,
    category: 'Desserts',
    outOfStock: false,
    image: 'https://images.unsplash.com/photo-1534432182912-63863115e106?auto=format&fit=crop&w=600&q=80',
    description: 'Decadent green tea molten cake with a warm flowing white chocolate matcha center, served with vanilla bean ice cream.'
  },
  {
    id: 'item-4',
    name: 'Artisan Bread Basket',
    price: 8.00,
    category: 'Appetizers',
    outOfStock: false,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
    description: 'Selection of warm sourdough, seeded rye, and french baguette rolls. Served with whipped sea salt butter and herb pesto.'
  },
  {
    id: 'item-5',
    name: 'Wild Salmon Fillet',
    price: 28.00,
    category: 'Main Course',
    outOfStock: false,
    image: 'https://images.unsplash.com/photo-1485921325833-c519f76c4927?auto=format&fit=crop&w=600&q=80',
    description: 'Pan-seared crisp-skin wild king salmon served over asparagus spears, roasted fingerling potatoes, and lemon-dill butter.'
  },
  {
    id: 'item-6',
    name: 'Negroni Sbagliato',
    price: 14.00,
    category: 'Drinks',
    outOfStock: false,
    image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=600&q=80',
    description: 'A sparkling twist on the classic Negroni, made with equal parts sweet vermouth, Campari, and crisp Prosecco.',
    modifiers: ['mod-6', 'mod-7', 'mod-8']
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'order-1',
    orderNumber: '1001',
    items: [
      {
        id: 'oi-1',
        menuItemId: 'item-1',
        name: 'Truffle Mushroom Risotto',
        quantity: 1,
        price: 30.50, // Base 24.00 + 6.50 modifier
        selectedModifiers: [
          { id: 'mod-1', name: 'Extra Truffle Shavings', price: 6.50 }
        ]
      },
      {
        id: 'oi-2',
        menuItemId: 'item-6',
        name: 'Negroni Sbagliato',
        quantity: 2,
        price: 14.00,
        selectedModifiers: [
          { id: 'mod-6', name: 'Ice Level: No Ice', price: 0.00 }
        ]
      }
    ],
    total: 58.50,
    status: 'completed',
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(), // 4 hours ago
    tableNumber: 'Tab 12',
    customerName: 'Marcus Aurelius'
  },
  {
    id: 'order-2',
    orderNumber: '1002',
    items: [
      {
        id: 'oi-3',
        menuItemId: 'item-5',
        name: 'Wild Salmon Fillet',
        quantity: 2,
        price: 28.00,
        selectedModifiers: []
      },
      {
        id: 'oi-4',
        menuItemId: 'item-3',
        name: 'Matcha Lava Cake',
        quantity: 1,
        price: 12.00,
        selectedModifiers: []
      }
    ],
    total: 68.00,
    status: 'preparing',
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(), // 30 mins ago
    tableNumber: 'Tab 04',
    customerName: 'Socrates'
  },
  {
    id: 'order-3',
    orderNumber: '1003',
    items: [
      {
        id: 'oi-5',
        menuItemId: 'item-4',
        name: 'Artisan Bread Basket',
        quantity: 1,
        price: 8.00,
        selectedModifiers: []
      },
      {
        id: 'oi-6',
        menuItemId: 'item-1',
        name: 'Truffle Mushroom Risotto',
        quantity: 1,
        price: 24.00,
        selectedModifiers: []
      }
    ],
    total: 32.00,
    status: 'pending',
    createdAt: new Date(Date.now() - 10 * 60000).toISOString(), // 10 mins ago
    tableNumber: 'Tab 07',
    customerName: 'Seneca'
  },
  {
    id: 'order-4',
    orderNumber: '1004',
    items: [
      {
        id: 'oi-7',
        menuItemId: 'item-6',
        name: 'Negroni Sbagliato',
        quantity: 3,
        price: 14.00,
        selectedModifiers: []
      }
    ],
    total: 42.00,
    status: 'cancelled',
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
    tableNumber: 'Bar 02',
    customerName: 'Zeno'
  }
];

// Helper to load items
export function loadData<T>(key: string, initial: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error reading localStorage key ' + key, e);
  }
  return initial;
}

// Helper to save items
export function saveData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error writing localStorage key ' + key, e);
  }
}
