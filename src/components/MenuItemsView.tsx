import React, { useState } from 'react';
import { MenuItem, Category, Modifier } from '../types';
import { Plus, Edit2, Trash2, X, AlertTriangle, Image as ImageIcon } from 'lucide-react';

interface MenuItemsViewProps {
  items: MenuItem[];
  categories: Category[];
  modifiers: Modifier[];
  searchQuery: string;
  onItemsChange: (updatedItems: MenuItem[]) => void;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (isOpen: boolean) => void;
}

// Quick sample gourmet image bank for the auto-fill feature
const SAMPLE_IMAGES = [
  { name: 'Steak/Meat', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80' },
  { name: 'Pasta/Risotto', url: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=600&q=80' },
  { name: 'Burger/Slider', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80' },
  { name: 'Salad', url: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=600&q=80' },
  { name: 'Dessert/Cake', url: 'https://images.unsplash.com/photo-1534432182912-63863115e106?auto=format&fit=crop&w=600&q=80' },
  { name: 'Seafood/Salmon', url: 'https://images.unsplash.com/photo-1485921325833-c519f76c4927?auto=format&fit=crop&w=600&q=80' },
  { name: 'Drink/Cocktail', url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=600&q=80' },
  { name: 'Pizza', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80' }
];

export default function MenuItemsView({
  items,
  categories,
  modifiers,
  searchQuery,
  onItemsChange,
  isAddModalOpen,
  setIsAddModalOpen
}: MenuItemsViewProps) {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  
  // State for Editing
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOutOfStock, setFormOutOfStock] = useState(false);
  const [formModifiers, setFormModifiers] = useState<string[]>([]);

  // Validation/Error feedback
  const [validationError, setValidationError] = useState('');

  // Handle open modal for creating
  const openAddModal = () => {
    setFormName('');
    // Default to first category if available
    setFormCategory(categories[0]?.name || 'Main Course');
    setFormPrice('');
    setFormImage('');
    setFormDescription('');
    setFormOutOfStock(false);
    setFormModifiers([]);
    setValidationError('');
    setIsAddModalOpen(true);
  };

  // Handle open modal for editing
  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormPrice(item.price.toString());
    setFormImage(item.image);
    setFormDescription(item.description || '');
    setFormOutOfStock(item.outOfStock);
    setFormModifiers(item.modifiers || []);
    setValidationError('');
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingItem(null);
  };

  // Quick helper to fill image preset
  const handleSelectPresetImage = (url: string) => {
    setFormImage(url);
  };

  // Submit form (Create or Update)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!formName.trim()) {
      setValidationError('Item name is required');
      return;
    }

    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setValidationError('Please enter a valid price (>= 0)');
      return;
    }

    // Default image if blank
    let finalImageUrl = formImage.trim();
    if (!finalImageUrl) {
      // Pick a semi-random preset or default generic gourmet photo
      const matched = SAMPLE_IMAGES.find(img => 
        formName.toLowerCase().includes(img.name.split('/')[0].toLowerCase()) || 
        formCategory.toLowerCase().includes(img.name.split('/')[0].toLowerCase())
      );
      finalImageUrl = matched ? matched.url : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
    }

    if (editingItem) {
      // Update item
      const updatedList = items.map(item => {
        if (item.id === editingItem.id) {
          return {
            ...item,
            name: formName.trim(),
            category: formCategory,
            price: priceNum,
            image: finalImageUrl,
            description: formDescription.trim(),
            outOfStock: formOutOfStock,
            modifiers: formModifiers
          };
        }
        return item;
      });
      onItemsChange(updatedList);
    } else {
      // Create new item
      const newItem: MenuItem = {
        id: 'item-' + Date.now(),
        name: formName.trim(),
        category: formCategory,
        price: priceNum,
        image: finalImageUrl,
        description: formDescription.trim(),
        outOfStock: formOutOfStock,
        modifiers: formModifiers
      };
      onItemsChange([...items, newItem]);
    }

    handleCloseModal();
  };

  // Delete item
  const handleDeleteItem = (id: string) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      const remaining = items.filter(item => item.id !== id);
      onItemsChange(remaining);
    }
  };

  // Toggle Out of Stock directly from card
  const handleToggleStock = (id: string) => {
    const updated = items.map(item => {
      if (item.id === id) {
        return { ...item, outOfStock: !item.outOfStock };
      }
      return item;
    });
    onItemsChange(updated);
  };

  // Toggle modifier selection in form
  const handleToggleFormModifier = (modId: string) => {
    if (formModifiers.includes(modId)) {
      setFormModifiers(formModifiers.filter(id => id !== modId));
    } else {
      setFormModifiers([...formModifiers, modId]);
    }
  };

  // Filter items by category and search query
  const filteredItems = items.filter(item => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Extract unique categories names present or from categories list
  const categoryTabs = ['All', ...categories.map(c => c.name)];

  return (
    <div className="px-10 py-6" id="menu-items-view">
      {/* Sub-Header */}
      <div className="flex justify-between items-end mb-8" id="menu-view-header">
        <div>
          <h1 className="font-display font-semibold text-[32px] text-brand-primary leading-tight mb-1">
            Menu Management
          </h1>
          <p className="text-text-secondary text-sm font-medium">
            Manage your digital menu items and availability in real-time.
          </p>
        </div>
        <button
          id="btn-add-new-item"
          onClick={openAddModal}
          className="bg-brand-primary text-white font-bold h-12 px-6 rounded-lg flex items-center gap-2 hover:bg-brand-primary/95 transition-all shadow-md hover:shadow-lg active-scale"
        >
          <Plus className="w-5 h-5" />
          <span>Add New Item</span>
        </button>
      </div>

      {/* Category Tabs Bar */}
      <div 
        className="flex gap-6 border-b border-border-subtle mb-6 overflow-x-auto no-scrollbar scroll-smooth"
        id="category-tabs-bar"
      >
        {categoryTabs.map((tab) => {
          const isActive = activeCategory === tab;
          return (
            <button
              id={`tab-${tab.toLowerCase().replace(/\s+/g, '-')}`}
              key={tab}
              onClick={() => setActiveCategory(tab)}
              className={`pb-3 px-1 font-sans text-[15px] font-semibold whitespace-nowrap transition-all border-b-[3px] ${
                isActive 
                  ? 'text-brand-secondary border-brand-secondary font-bold' 
                  : 'text-text-secondary border-transparent hover:text-brand-primary'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-border-subtle rounded-xl p-8 text-center shadow-sm">
          <ImageIcon className="w-16 h-16 text-text-secondary/30 mb-4" />
          <h3 className="font-display text-lg font-bold text-brand-primary mb-1">No Menu Items Found</h3>
          <p className="text-text-secondary max-w-md text-sm mb-6">
            {searchQuery 
              ? `We couldn't find any items matching "${searchQuery}". Try a different keyword.` 
              : 'There are no menu items in this category yet. Click Add New Item to get started!'}
          </p>
          <button
            onClick={openAddModal}
            className="bg-brand-secondary text-white font-semibold text-sm h-10 px-4 rounded-lg flex items-center gap-2 hover:bg-brand-secondary-hover transition-colors active-scale"
          >
            <Plus className="w-4 h-4" />
            <span>Create Item</span>
          </button>
        </div>
      )}

      {/* Menu Grid */}
      <div 
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6" 
        id="menu-items-grid"
      >
        {filteredItems.map((item) => (
          <div
            id={`menu-item-card-${item.id}`}
            key={item.id}
            className="bg-surf-card border border-border-subtle rounded-lg p-4 flex flex-col group hover:shadow-md hover:border-brand-secondary transition-all cursor-default relative"
          >
            {/* Food Image Container */}
            <div className="relative aspect-video w-full rounded overflow-hidden mb-4 bg-surf-low">
              <img
                src={item.image}
                alt={item.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              />
              {/* Out of Stock badge overlay */}
              {item.outOfStock ? (
                <div className="absolute top-3 right-3 bg-brand-accent-red text-white px-2.5 py-1 rounded flex items-center gap-1.5 shadow-md">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                  <span className="font-mono text-[9px] font-bold tracking-wider uppercase">OUT OF STOCK</span>
                </div>
              ) : (
                <div className="absolute top-3 right-3 bg-brand-accent-green/90 text-white px-2 py-0.5 rounded flex items-center shadow-sm">
                  <span className="font-mono text-[9px] font-bold tracking-wider uppercase">IN STOCK</span>
                </div>
              )}
            </div>

            {/* Content Details */}
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-1.5">
                <h3 className="font-display font-semibold text-lg text-brand-primary group-hover:text-brand-secondary transition-colors line-clamp-1 leading-tight" title={item.name}>
                  {item.name}
                </h3>
                <span className="font-mono text-[10px] font-bold bg-surf-low px-2 py-1 rounded text-brand-secondary shrink-0 tracking-wider">
                  {item.category}
                </span>
              </div>
              
              {/* Description */}
              <p className="text-text-secondary text-xs line-clamp-2 mb-4 font-normal h-8 leading-relaxed">
                {item.description || 'No description provided.'}
              </p>

              {/* Price and Action Buttons */}
              <div className="flex justify-between items-center mt-auto pt-3 border-t border-border-subtle/50">
                <span className="font-mono text-lg font-bold text-brand-secondary">
                  ${item.price.toFixed(2)}
                </span>
                
                <div className="flex gap-1.5">
                  {/* Stock toggle direct button */}
                  <button
                    onClick={() => handleToggleStock(item.id)}
                    className={`p-1.5 rounded transition-colors text-xs font-semibold ${
                      item.outOfStock 
                        ? 'bg-brand-accent-green/10 text-brand-accent-green hover:bg-brand-accent-green/15' 
                        : 'bg-brand-accent-red/5 text-brand-accent-red hover:bg-brand-accent-red/10'
                    }`}
                    title={item.outOfStock ? "Mark In Stock" : "Mark Out of Stock"}
                  >
                    {item.outOfStock ? "Restock" : "Deactivate"}
                  </button>

                  <button
                    onClick={() => openEditModal(item)}
                    className="p-1.5 hover:bg-surf-low text-text-secondary hover:text-brand-primary rounded transition-colors active-scale"
                    title="Edit Item"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1.5 hover:bg-brand-accent-red/5 text-brand-accent-red rounded transition-colors active-scale"
                    title="Delete Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Admin Form Modal */}
      {isAddModalOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-brand-primary/45 backdrop-blur-sm transition-all"
          id="item-form-modal"
        >
          {/* Modal Backdrop Click Handler */}
          <div className="absolute inset-0" onClick={handleCloseModal}></div>
          
          {/* Modal Content Box */}
          <div className="relative bg-white w-full max-w-xl rounded-xl shadow-2xl overflow-hidden border border-border-subtle max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-surf-low shrink-0">
              <h2 className="font-display text-lg font-extrabold text-brand-primary">
                {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h2>
              <button 
                onClick={handleCloseModal} 
                className="text-text-secondary hover:text-brand-primary transition-colors p-1 rounded-full hover:bg-surf-container active-scale"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
              
              {/* Validation Feedback */}
              {validationError && (
                <div className="p-3 bg-brand-accent-red/10 border border-brand-accent-red/20 rounded-lg flex items-center gap-2 text-brand-accent-red text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Item Name */}
              <div className="space-y-1.5">
                <label className="font-mono text-xs font-bold text-text-secondary uppercase tracking-wider block">
                  Item Name <span className="text-brand-accent-red">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Signature Ribeye Steak"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-surf-low border border-border-subtle rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-secondary/35 focus:border-brand-secondary outline-none font-sans"
                />
              </div>

              {/* Category & Price Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div className="space-y-1.5">
                  <label className="font-mono text-xs font-bold text-text-secondary uppercase tracking-wider block">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-surf-low border border-border-subtle rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-secondary/35 focus:border-brand-secondary outline-none font-sans"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price */}
                <div className="space-y-1.5">
                  <label className="font-mono text-xs font-bold text-text-secondary uppercase tracking-wider block">
                    Price ($) <span className="text-brand-accent-red">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full bg-surf-low border border-border-subtle rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-secondary/35 focus:border-brand-secondary outline-none font-mono"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="font-mono text-xs font-bold text-text-secondary uppercase tracking-wider block">
                  Description
                </label>
                <textarea
                  placeholder="Describe the dish, ingredients, preparation style..."
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-surf-low border border-border-subtle rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-secondary/35 focus:border-brand-secondary outline-none font-sans resize-none"
                />
              </div>

              {/* Image URL with Preset Bank Helper */}
              <div className="space-y-2">
                <label className="font-mono text-xs font-bold text-text-secondary uppercase tracking-wider block">
                  Image URL (or select a preset below)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  className="w-full bg-surf-low border border-border-subtle rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-secondary/35 focus:border-brand-secondary outline-none font-mono"
                />

                {/* Gourmet Preset Images Picker */}
                <div className="p-2 border border-border-subtle/50 rounded-lg bg-surf-low/40">
                  <span className="font-sans text-[10px] font-bold text-text-secondary block mb-1.5 uppercase tracking-wider">
                    Auto-Fill Gourmet Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                    {SAMPLE_IMAGES.map((preset) => (
                      <button
                        type="button"
                        key={preset.name}
                        onClick={() => handleSelectPresetImage(preset.url)}
                        className={`text-[10px] font-semibold px-2 py-1 rounded transition-all flex items-center gap-1 border ${
                          formImage === preset.url
                            ? 'bg-brand-secondary text-white border-brand-secondary shadow-sm'
                            : 'bg-white hover:bg-surf-low border-border-subtle text-text-secondary'
                        }`}
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modifiers Linking */}
              {modifiers.length > 0 && (
                <div className="space-y-1.5">
                  <label className="font-mono text-xs font-bold text-text-secondary uppercase tracking-wider block">
                    Link Modifiers (Adds options for customers to customize)
                  </label>
                  <div className="border border-border-subtle rounded-lg p-3 max-h-32 overflow-y-auto bg-surf-low/30 space-y-1.5">
                    {modifiers.map((mod) => {
                      const isChecked = formModifiers.includes(mod.id);
                      return (
                        <label 
                          key={mod.id} 
                          className="flex items-center gap-2.5 text-xs font-semibold text-text-primary hover:bg-surf-low/80 p-1 rounded cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleFormModifier(mod.id)}
                            className="w-4 h-4 text-brand-secondary border-border-subtle rounded focus:ring-brand-secondary"
                          />
                          <span className="flex-1">{mod.name}</span>
                          <span className="font-mono text-brand-secondary text-[11px] font-bold">
                            +${mod.price.toFixed(2)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Out of Stock Checkbox */}
              <div className="flex items-center gap-3 pt-1 border-t border-border-subtle/50">
                <input
                  type="checkbox"
                  id="modal-outOfStock"
                  checked={formOutOfStock}
                  onChange={(e) => setFormOutOfStock(e.target.checked)}
                  className="w-5 h-5 text-brand-secondary border-border-subtle rounded focus:ring-brand-secondary cursor-pointer"
                />
                <label 
                  htmlFor="modal-outOfStock" 
                  className="font-sans text-sm font-semibold text-brand-primary select-none cursor-pointer"
                >
                  Mark as 'Out of Stock' (Displays out of stock badge)
                </label>
              </div>

              {/* Form Buttons */}
              <div className="pt-4 flex gap-3 border-t border-border-subtle/50 shrink-0">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-3 rounded-lg border border-border-subtle font-bold text-text-secondary hover:bg-surf-container transition-colors text-sm active-scale"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-lg bg-brand-primary text-white font-bold hover:bg-brand-primary/90 transition-colors text-sm active-scale"
                >
                  {editingItem ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
