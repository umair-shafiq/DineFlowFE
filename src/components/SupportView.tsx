import React, { useState, useEffect } from 'react';
import { HelpCircle, BookOpen, PenTool, Save, RotateCcw, AlertCircle, PlayCircle, Layers, Sliders, Clipboard } from 'lucide-react';
import { loadData, saveData } from '../data';

export default function SupportView() {
  const [scratchpad, setScratchpad] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  // Load scratchpad notes on load
  useEffect(() => {
    const savedNotes = loadData('chef_scratchpad_notes', '');
    setScratchpad(savedNotes);
  }, []);

  // Save scratchpad notes
  const handleSaveNotes = () => {
    saveData('chef_scratchpad_notes', scratchpad);
    setSaveStatus('Saved!');
    setTimeout(() => setSaveStatus(''), 2000);
  };

  // Reset demo to default seed data
  const handleResetDemo = () => {
    if (window.confirm('Warning: This will clear all custom additions (added menu items, modified prices, placed tickets) and restore the app to the pristine starting default demo. Do you want to proceed?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const supportFaqs = [
    {
      q: 'How do I add modifiers to a new dish?',
      a: 'First, create the modifier inside the "Modifiers" tab (e.g. "Gluten-Free Bun", or "Double Patty"). Then, go to "Menu Items" -> click "Add New Item" (or edit an existing one), and check the checkbox of the modifier in the options list. It will immediately tie them together!',
      icon: Sliders
    },
    {
      q: 'Where do simulated orders go?',
      a: 'When you place an order in the "New Order Terminal" (inside the Orders tab), it generates a live dining ticket and sends it to the "Daily Order Board" under the "Pending" column. Kitchen cooks can then advance tickets to "Preparing" or "Completed".',
      icon: Clipboard
    },
    {
      q: 'How does the category cascading work?',
      a: 'When you edit a category’s name in the "Categories" tab, ChefCommand automatically cascades that change to all associated dishes in the menu, maintaining data integrity. If you delete a category, associated dishes are assigned to "Uncategorized".',
      icon: Layers
    }
  ];

  return (
    <div className="px-10 py-6 font-sans" id="support-view">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-semibold text-[32px] text-brand-primary leading-tight mb-1">
          Support & Chef Terminal Guide
        </h1>
        <p className="text-text-secondary text-sm font-medium">
          Review terminal documentation, test simulation setups, or take operational kitchen notes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Documentation FAQs & Simulation Reset */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* FAQs list */}
          <div className="bg-white border border-border-subtle rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-5">
              <BookOpen className="w-5 h-5 text-brand-secondary" />
              <h3 className="font-display font-bold text-brand-primary text-base">
                ChefCommand Operational Manual
              </h3>
            </div>

            <div className="space-y-4">
              {supportFaqs.map((faq, idx) => {
                const Icon = faq.icon;
                return (
                  <div key={idx} className="p-4 bg-surf-low/40 border border-border-subtle/40 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-brand-primary font-sans">
                      <Icon className="w-4.5 h-4.5 text-brand-secondary shrink-0" />
                      <span>{faq.q}</span>
                    </div>
                    <p className="text-text-secondary text-xs pl-6.5 leading-relaxed font-normal">
                      {faq.a}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Diagnostics and Reset Card */}
          <div className="bg-white border border-border-subtle rounded-xl p-6 shadow-sm border-l-4 border-l-brand-accent-red">
            <div className="flex gap-4">
              <div className="p-2.5 bg-brand-accent-red/10 text-brand-accent-red rounded-lg h-fit">
                <AlertCircle className="w-5.5 h-5.5 shrink-0" />
              </div>
              <div className="space-y-3.5 flex-1">
                <div>
                  <h3 className="font-display font-bold text-brand-primary text-base leading-tight mb-1">
                    Demo Control Panel
                  </h3>
                  <p className="text-text-secondary text-xs leading-relaxed font-medium">
                    This browser-persisted demo runs on LocalStorage. If you want to clear your local testing cache, place tickets back into starting values, or reset active categories, use the factory reset button below.
                  </p>
                </div>
                
                <button
                  onClick={handleResetDemo}
                  className="bg-brand-accent-red text-white text-xs font-bold h-9 px-4 rounded-lg flex items-center gap-2 hover:bg-brand-accent-red/90 transition-colors active-scale w-fit shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Factory Reset Demo Data</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right 1 Column: Staff Scratchpad Notes */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-border-subtle rounded-xl p-6 shadow-sm flex flex-col h-full min-h-[380px]">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-4">
              <div className="flex items-center gap-2">
                <PenTool className="w-4.5 h-4.5 text-brand-secondary" />
                <h3 className="font-display font-bold text-brand-primary text-sm uppercase tracking-wider">
                  Daily Scratchpad Notes
                </h3>
              </div>
              {saveStatus && (
                <span className="text-[10px] text-brand-accent-green font-bold uppercase tracking-wider animate-pulse">
                  {saveStatus}
                </span>
              )}
            </div>

            <p className="text-text-secondary text-xs mb-4 font-normal leading-relaxed">
              Chefs or floor staff can leave temporary reminders here (e.g. "Table 4 birthday sparklers ready", "Main Risotto running low on white truffles!"). Saves locally.
            </p>

            <textarea
              className="flex-1 w-full bg-surf-low/50 border border-border-subtle rounded-lg p-3 text-xs focus:ring-1 focus:ring-brand-secondary outline-none font-sans resize-none mb-4 leading-relaxed"
              placeholder="Type shift reminders or notes here..."
              value={scratchpad}
              onChange={(e) => setScratchpad(e.target.value)}
            />

            <button
              onClick={handleSaveNotes}
              className="w-full bg-brand-primary text-white font-bold h-10 rounded-lg flex items-center justify-center gap-2 hover:bg-brand-primary/95 transition-colors text-xs active-scale shadow-sm shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Scratchpad</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
