import React, { useState } from 'react';
import { Modifier, MenuItem } from '../types';
import { Plus, Sliders, Edit2, Trash2, Check, X, AlertCircle } from 'lucide-react';

interface ModifiersViewProps {
  modifiers: Modifier[];
  items: MenuItem[];
  onModifiersChange: (updatedModifiers: Modifier[]) => void;
}

export default function ModifiersView({
  modifiers,
  items,
  onModifiersChange
}: ModifiersViewProps) {
  const [newModName, setNewModName] = useState('');
  const [newModPrice, setNewModPrice] = useState('');
  const [newModCategory, setNewModCategory] = useState('Add-ons');

  const [editingModId, setEditingModId] = useState<string | null>(null);
  const [editingModName, setEditingModName] = useState('');
  const [editingModPrice, setEditingModPrice] = useState('');
  const [editingModCategory, setEditingModCategory] = useState('');

  const [feedbackError, setFeedbackError] = useState('');

  // Modifier categories
  const modifierCategories = ['Add-ons', 'Dietary', 'Preferences', 'Sauces', 'Size'];

  // Add modifier
  const handleAddModifier = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError('');

    const nameCleaned = newModName.trim();
    if (!nameCleaned) return;

    const priceNum = parseFloat(newModPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setFeedbackError('Please enter a valid price (>= 0)');
      return;
    }

    // Check duplicates
    if (modifiers.some(m => m.name.toLowerCase() === nameCleaned.toLowerCase())) {
      setFeedbackError(`Modifier option "${nameCleaned}" already exists.`);
      return;
    }

    const newMod: Modifier = {
      id: 'mod-' + Date.now(),
      name: nameCleaned,
      price: priceNum,
      category: newModCategory
    };

    onModifiersChange([...modifiers, newMod]);
    setNewModName('');
    setNewModPrice('');
  };

  // Start Edit
  const handleStartEdit = (mod: Modifier) => {
    setEditingModId(mod.id);
    setEditingModName(mod.name);
    setEditingModPrice(mod.price.toString());
    setEditingModCategory(mod.category);
    setFeedbackError('');
  };

  // Save Edit
  const handleSaveEdit = (modId: string) => {
    setFeedbackError('');
    const nameCleaned = editingModName.trim();
    if (!nameCleaned) return;

    const priceNum = parseFloat(editingModPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setFeedbackError('Please enter a valid price (>= 0)');
      return;
    }

    // Check duplicates (excluding self)
    if (modifiers.some(m => m.id !== modId && m.name.toLowerCase() === nameCleaned.toLowerCase())) {
      setFeedbackError(`"${nameCleaned}" already exists as another modifier.`);
      return;
    }

    const updated = modifiers.map(m => {
      if (m.id === modId) {
        return {
          ...m,
          name: nameCleaned,
          price: priceNum,
          category: editingModCategory
        };
      }
      return m;
    });

    onModifiersChange(updated);
    setEditingModId(null);
  };

  // Delete Modifier
  const handleDeleteModifier = (modId: string, modName: string) => {
    setFeedbackError('');
    if (!window.confirm(`Are you sure you want to delete modifier "${modName}"? This will also remove it from any linked menu items.`)) {
      return;
    }

    const filtered = modifiers.filter(m => m.id !== modId);
    onModifiersChange(filtered);
    
    // Linked menu item modifier list cleanup is handled automatically in App.tsx's state syncer
  };

  return (
    <div className="px-10 py-6" id="modifiers-view">
      {/* Title */}
      <div className="mb-8">
        <h1 className="font-display font-semibold text-[32px] text-brand-primary leading-tight mb-1">
          Modifiers & Custom Options
        </h1>
        <p className="text-text-secondary text-sm font-medium">
          Manage customizable toppings, portion sizes, or instructions that servers can add to client dishes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Form Panel */}
        <div className="lg:col-span-1 bg-white border border-border-subtle rounded-lg p-6 shadow-sm h-fit">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 bg-brand-secondary/10 text-brand-secondary rounded-lg">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-brand-primary text-base">
              Add New Modifier Option
            </h3>
          </div>

          <form onSubmit={handleAddModifier} className="space-y-4">
            {feedbackError && (
              <div className="p-3 bg-brand-accent-red/10 border border-brand-accent-red/20 rounded-lg flex items-center gap-2 text-brand-accent-red text-xs font-semibold">
                <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                <span>{feedbackError}</span>
              </div>
            )}

            {/* Modifier Name */}
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] font-bold text-text-secondary uppercase tracking-wider block">
                Option Label / Name
              </label>
              <input
                type="text"
                placeholder="e.g. Extra Truffle, No Onions"
                value={newModName}
                onChange={(e) => setNewModName(e.target.value)}
                className="w-full bg-surf-low border border-border-subtle rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-secondary/35 focus:border-brand-secondary outline-none font-sans"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Modifier Group/Type */}
              <div className="space-y-1.5">
                <label className="font-mono text-[11px] font-bold text-text-secondary uppercase tracking-wider block">
                  Group / Type
                </label>
                <select
                  value={newModCategory}
                  onChange={(e) => setNewModCategory(e.target.value)}
                  className="w-full bg-surf-low border border-border-subtle rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-secondary/35 focus:border-brand-secondary outline-none font-sans"
                >
                  {modifierCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Extra Cost */}
              <div className="space-y-1.5">
                <label className="font-mono text-[11px] font-bold text-text-secondary uppercase tracking-wider block">
                  Extra Cost ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={newModPrice}
                  onChange={(e) => setNewModPrice(e.target.value)}
                  className="w-full bg-surf-low border border-border-subtle rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-secondary/35 focus:border-brand-secondary outline-none font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-brand-primary text-white font-bold h-11 rounded-lg flex items-center justify-center gap-2 hover:bg-brand-primary/90 transition-colors active-scale text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Modifier</span>
            </button>
          </form>
        </div>

        {/* Right Modifier List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-border-subtle rounded-lg overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border-subtle bg-surf-low">
              <h3 className="font-display font-bold text-brand-primary text-sm uppercase tracking-wider">
                Custom Modifiers Database ({modifiers.length})
              </h3>
            </div>

            <div className="divide-y divide-border-subtle" id="modifiers-list">
              {modifiers.map((mod) => {
                const isEditing = editingModId === mod.id;

                return (
                  <div
                    key={mod.id}
                    id={`modifier-row-${mod.id}`}
                    className="px-6 py-4 flex items-center justify-between hover:bg-surf-low/20 transition-colors"
                  >
                    {isEditing ? (
                      /* Editing Inline View */
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 mr-4">
                        <input
                          type="text"
                          value={editingModName}
                          onChange={(e) => setEditingModName(e.target.value)}
                          placeholder="Name"
                          className="bg-white border border-brand-secondary rounded-lg px-3 py-1.5 text-sm outline-none"
                          required
                        />
                        <select
                          value={editingModCategory}
                          onChange={(e) => setEditingModCategory(e.target.value)}
                          className="bg-white border border-brand-secondary rounded-lg px-3 py-1.5 text-sm outline-none"
                        >
                          {modifierCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editingModPrice}
                            onChange={(e) => setEditingModPrice(e.target.value)}
                            placeholder="Price"
                            className="flex-1 bg-white border border-brand-secondary rounded-lg px-3 py-1.5 text-sm outline-none font-mono"
                            required
                          />
                          <button
                            onClick={() => handleSaveEdit(mod.id)}
                            className="p-2 bg-brand-accent-green text-white rounded-lg hover:bg-brand-accent-green/95 transition-colors active-scale"
                          >
                            <Check className="w-4.5 h-4.5" />
                          </button>
                          <button
                            onClick={() => setEditingModId(null)}
                            className="p-2 bg-text-secondary/15 text-text-secondary rounded-lg hover:bg-text-secondary/25 transition-colors active-scale"
                          >
                            <X className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display Row View */
                      <div className="flex items-center gap-4">
                        <div className="w-1.5 h-6 bg-brand-secondary/30 rounded-full" />
                        <div>
                          <p className="font-sans font-semibold text-brand-primary text-sm flex items-center gap-2">
                            <span>{mod.name}</span>
                            <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-surf-container text-brand-secondary uppercase tracking-wider">
                              {mod.category}
                            </span>
                          </p>
                          <span className="font-mono text-xs font-bold text-brand-secondary">
                            {mod.price === 0 ? 'No extra charge (Free)' : `+$${mod.price.toFixed(2)}`}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Actions Panel */}
                    {!isEditing && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleStartEdit(mod)}
                          className="p-1.5 hover:bg-surf-low text-text-secondary hover:text-brand-primary rounded transition-colors active-scale"
                          title="Edit Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteModifier(mod.id, mod.name)}
                          className="p-1.5 hover:bg-brand-accent-red/5 text-brand-accent-red rounded transition-colors active-scale"
                          title="Delete Modifier"
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
