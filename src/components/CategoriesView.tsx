import React, { useState } from 'react';
import { Category, MenuItem } from '../types';
import { Plus, FolderPlus, Edit2, Trash2, Check, X, AlertCircle } from 'lucide-react';

interface CategoriesViewProps {
  categories: Category[];
  items: MenuItem[];
  onCategoriesChange: (updatedCategories: Category[]) => void;
  onItemsCategoryReset: (oldCategoryName: string, newCategoryName: string) => void;
}

export default function CategoriesView({
  categories,
  items,
  onCategoriesChange,
  onItemsCategoryReset
}: CategoriesViewProps) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [feedbackError, setFeedbackError] = useState('');

  // Count items per category
  const getItemCount = (categoryName: string) => {
    return items.filter(item => {
      const catName = typeof item.category === 'object' ? ((item.category as any).name || '') : (item.category || '');
      return catName === categoryName;
    }).length;
  };

  // Add Category
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError('');

    const cleaned = newCategoryName.trim();
    if (!cleaned) return;

    // Check duplicates
    if (categories.some(cat => cat.name.toLowerCase() === cleaned.toLowerCase())) {
      setFeedbackError(`"${cleaned}" already exists.`);
      return;
    }

    const newCat: Category = {
      id: 'cat-' + Date.now(),
      name: cleaned
    };

    onCategoriesChange([...categories, newCat]);
    setNewCategoryName('');
  };

  // Start Edit
  const handleStartEdit = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setEditingCategoryName(cat.name);
    setFeedbackError('');
  };

  // Save Edit
  const handleSaveEdit = (catId: string) => {
    setFeedbackError('');
    const cleaned = editingCategoryName.trim();
    if (!cleaned) return;

    // Find previous category name to update items as well!
    const oldCat = categories.find(c => c.id === catId);
    if (!oldCat) return;

    // Check duplicates (excluding self)
    if (categories.some(cat => cat.id !== catId && cat.name.toLowerCase() === cleaned.toLowerCase())) {
      setFeedbackError(`"${cleaned}" already exists as another category.`);
      return;
    }

    // Save
    const updated = categories.map(c => {
      if (c.id === catId) {
        return { ...c, name: cleaned };
      }
      return c;
    });

    onCategoriesChange(updated);
    
    // Propagate category change to all items!
    if (oldCat.name !== cleaned) {
      onItemsCategoryReset(oldCat.name, cleaned);
    }

    setEditingCategoryId(null);
  };

  // Delete Category
  const handleDeleteCategory = (catId: string, catName: string) => {
    setFeedbackError('');
    const itemCount = getItemCount(catName);
    
    if (itemCount > 0) {
      if (!window.confirm(`Warning: There are ${itemCount} menu items under "${catName}". Deleting this category will assign them to "Uncategorized". Do you want to proceed?`)) {
        return;
      }
      // Reassign item categories to "Uncategorized"
      onItemsCategoryReset(catName, 'Uncategorized');
      
      // Ensure Uncategorized exists or is added
      if (!categories.some(c => c.name === 'Uncategorized')) {
        const uncategorizedCat = { id: 'cat-uncategorized', name: 'Uncategorized' };
        onCategoriesChange(categories.filter(c => c.id !== catId).concat(uncategorizedCat));
        return;
      }
    } else {
      if (!window.confirm(`Are you sure you want to delete category "${catName}"?`)) {
        return;
      }
    }

    const filtered = categories.filter(c => c.id !== catId);
    onCategoriesChange(filtered);
  };

  return (
    <div className="px-10 py-6" id="categories-view">
      {/* Title */}
      <div className="mb-8">
        <h1 className="font-display font-semibold text-[32px] text-brand-primary leading-tight mb-1">
          Categories Management
        </h1>
        <p className="text-text-secondary text-sm font-medium">
          Organize your menu items into structured categories for rapid filtering.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Create Category Form */}
        <div className="lg:col-span-1 bg-white border border-border-subtle rounded-lg p-6 shadow-sm h-fit">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 bg-brand-secondary/10 text-brand-secondary rounded-lg">
              <FolderPlus className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-brand-primary text-base">
              Add New Category
            </h3>
          </div>

          <form onSubmit={handleAddCategory} className="space-y-4">
            {feedbackError && (
              <div className="p-3 bg-brand-accent-red/10 border border-brand-accent-red/20 rounded-lg flex items-center gap-2 text-brand-accent-red text-xs font-semibold">
                <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                <span>{feedbackError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="font-mono text-[11px] font-bold text-text-secondary uppercase tracking-wider block">
                Category Name
              </label>
              <input
                type="text"
                placeholder="e.g. Soups, Pizzas, Sides"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full bg-surf-low border border-border-subtle rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-secondary/35 focus:border-brand-secondary outline-none font-sans"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-brand-primary text-white font-bold h-11 rounded-lg flex items-center justify-center gap-2 hover:bg-brand-primary/90 transition-colors active-scale text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          </form>
        </div>

        {/* Right Side: Categories List Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-border-subtle rounded-lg overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border-subtle bg-surf-low">
              <h3 className="font-display font-bold text-brand-primary text-sm uppercase tracking-wider">
                Active Categories ({categories.length})
              </h3>
            </div>

            <div className="divide-y divide-border-subtle" id="categories-list">
              {categories.map((cat) => {
                const count = getItemCount(cat.name);
                const isEditing = editingCategoryId === cat.id;

                return (
                  <div
                    key={cat.id}
                    id={`category-row-${cat.id}`}
                    className="px-6 py-4 flex items-center justify-between hover:bg-surf-low/20 transition-colors"
                  >
                    {isEditing ? (
                      /* Editing Inline View */
                      <div className="flex-1 flex gap-3 mr-4">
                        <input
                          type="text"
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          className="flex-1 bg-white border border-brand-secondary rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-secondary/20"
                        />
                        <button
                          onClick={() => handleSaveEdit(cat.id)}
                          className="p-2 bg-brand-accent-green text-white rounded-lg hover:bg-brand-accent-green/95 transition-colors active-scale"
                          title="Save changes"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingCategoryId(null)}
                          className="p-2 bg-text-secondary/15 text-text-secondary rounded-lg hover:bg-text-secondary/25 transition-colors active-scale"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      /* Display Row View */
                      <div className="flex items-center gap-4">
                        <div className="w-2 h-2 bg-brand-secondary rounded-full" />
                        <div>
                          <p className="font-sans font-semibold text-brand-primary text-sm">
                            {cat.name}
                          </p>
                          <span className="font-mono text-[10px] font-bold text-text-secondary/70">
                            {count} {count === 1 ? 'Dish' : 'Dishes'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Actions Panel */}
                    {!isEditing && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleStartEdit(cat)}
                          className="p-1.5 hover:bg-surf-low text-text-secondary hover:text-brand-primary rounded transition-colors active-scale"
                          title="Edit Name"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        
                        {/* Protect core categories if desired, or allow deletion with warnings */}
                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="p-1.5 hover:bg-brand-accent-red/5 text-brand-accent-red rounded transition-colors active-scale"
                          title="Delete Category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
