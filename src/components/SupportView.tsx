import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, BookOpen, PenTool, Save, RotateCcw, AlertCircle, 
  Database, Wifi, WifiOff, CheckCircle2, Server, Code, RefreshCw, Send, HelpCircle as HelpIcon, Layers, Sliders, Clipboard
} from 'lucide-react';
import { loadData, saveData } from '../data';
import { SpringBootSettings, testConnection, apiCategories, apiMenuItems } from '../api';
import { MenuItem, Category } from '../types';

interface SupportViewProps {
  items: MenuItem[];
  categories: Category[];
  onItemsChange: (items: MenuItem[]) => void;
  onCategoriesChange: (categories: Category[]) => void;
  apiSettings: SpringBootSettings;
  onApiSettingsChange: (settings: SpringBootSettings) => void;
  isApiLoading: boolean;
  apiStatusMessage: { type: 'success' | 'error' | 'warning'; text: string } | null;
  setApiStatusMessage: (msg: { type: 'success' | 'error' | 'warning'; text: string } | null) => void;
}

export default function SupportView({
  items,
  categories,
  onItemsChange,
  onCategoriesChange,
  apiSettings,
  onApiSettingsChange,
  isApiLoading,
  apiStatusMessage,
  setApiStatusMessage
}: SupportViewProps) {
  // Navigation tabs inside SupportView
  const [activeSubTab, setActiveSubTab] = useState<'api' | 'manual' | 'scratchpad'>('api');

  // Scratchpad states
  const [scratchpad, setScratchpad] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  // API Config states
  const [baseUrlInput, setBaseUrlInput] = useState(apiSettings.baseUrl);
  const [categoriesPathInput, setCategoriesPathInput] = useState(apiSettings.categoriesPath);
  const [menuItemsPathInput, setMenuItemsPathInput] = useState(apiSettings.menuItemsPath);

  // Testing & seeding states
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [seedingStatus, setSeedingStatus] = useState<'idle' | 'seeding' | 'success' | 'error'>('idle');
  const [seedingMessage, setSeedingMessage] = useState('');

  // Sync inputs with settings changes
  useEffect(() => {
    setBaseUrlInput(apiSettings.baseUrl);
    setCategoriesPathInput(apiSettings.categoriesPath);
    setMenuItemsPathInput(apiSettings.menuItemsPath);
  }, [apiSettings]);

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

  // Reset demo data
  const handleResetDemo = () => {
    if (window.confirm('Warning: This will clear all custom additions and restore the app to the pristine starting default demo. Do you want to proceed?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // Save settings change
  const handleSaveSettings = (isEnabled: boolean) => {
    const newSettings: SpringBootSettings = {
      enabled: isEnabled,
      baseUrl: baseUrlInput.trim() || 'http://localhost:8080',
      categoriesPath: categoriesPathInput.trim() || '/api/categories',
      menuItemsPath: menuItemsPathInput.trim() || '/api/menuitems'
    };
    onApiSettingsChange(newSettings);
    setTestResult(null);
  };

  // Run a live ping to verify Spring Boot setup
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testConnection(baseUrlInput, categoriesPathInput);
      setTestResult(res);
    } catch (e: any) {
      setTestResult({
        success: false,
        message: `Connection test error: ${e.message}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  // One-click helper to upload local Categories & Menu Items to Spring Boot database
  const handleSeedDatabase = async () => {
    if (!apiSettings.enabled) {
      alert('Please enable and save Spring Boot Sync before seeding.');
      return;
    }
    if (!window.confirm(`This will upload all ${categories.length} current local Categories and ${items.length} Menu Items to your Spring Boot REST endpoints. Do you want to proceed?`)) {
      return;
    }

    setSeedingStatus('seeding');
    setSeedingMessage('Uploading categories...');

    try {
      // 1. Send categories
      for (const cat of categories) {
        try {
          await apiCategories.create({ name: cat.name });
        } catch (e: any) {
          if (e.status === 409 || String(e.message).includes('409') || String(e.message).includes('Conflict')) {
            console.log(`Seeding: Category "${cat.name}" already exists in DB. Skipped.`);
          } else {
            console.warn(`Category "${cat.name}" might already exist: ${e.message}`);
          }
        }
      }

      setSeedingMessage('Uploading menu items...');

      // 2. Send menu items
      for (const item of items) {
        try {
          await apiMenuItems.create({
            name: item.name,
            price: item.price,
            category: item.category,
            outOfStock: item.outOfStock,
            image: item.image,
            description: item.description,
            modifiers: item.modifiers || []
          });
        } catch (e: any) {
          if (e.status === 409 || String(e.message).includes('409') || String(e.message).includes('Conflict')) {
            console.log(`Seeding: Menu Item "${item.name}" already exists in DB. Skipped.`);
          } else {
            console.warn(`Menu Item "${item.name}" upload failed/skipped: ${e.message}`);
          }
        }
      }

      setSeedingStatus('success');
      setSeedingMessage('Database Synchronization complete! Your Spring Boot database has been populated successfully.');
      // Triggers reload to pull fresh data
      onApiSettingsChange({ ...apiSettings });
    } catch (err: any) {
      setSeedingStatus('error');
      setSeedingMessage(`Database seeding failed: ${err.message}. Please verify your controllers are up and running.`);
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
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display font-semibold text-[32px] text-brand-primary leading-tight mb-1">
            System Administration & Support
          </h1>
          <p className="text-text-secondary text-sm font-medium">
            Configure Spring Boot REST integrations, review system manuals, or log operational notes.
          </p>
        </div>
        
        {/* Connection Quick Badge */}
        <div className="flex items-center gap-2 bg-surf-container px-3.5 py-1.5 rounded-lg border border-border-subtle shrink-0">
          <div className={`w-2.5 h-2.5 rounded-full ${apiSettings.enabled ? 'bg-brand-accent-green animate-pulse' : 'bg-text-secondary/50'}`} />
          <span className="font-mono text-xs font-bold text-text-primary">
            Spring Boot: {apiSettings.enabled ? 'ACTIVE SYNC' : 'LOCAL DEMO'}
          </span>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex border-b border-border-subtle mb-6 gap-2">
        <button
          onClick={() => setActiveSubTab('api')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'api'
              ? 'border-brand-secondary text-brand-secondary font-bold'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:border-text-secondary/30'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Spring Boot REST Integration</span>
        </button>
        <button
          onClick={() => setActiveSubTab('manual')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'manual'
              ? 'border-brand-secondary text-brand-secondary font-bold'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:border-text-secondary/30'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Operational Manual</span>
        </button>
        <button
          onClick={() => setActiveSubTab('scratchpad')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'scratchpad'
              ? 'border-brand-secondary text-brand-secondary font-bold'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:border-text-secondary/30'
          }`}
        >
          <PenTool className="w-4 h-4" />
          <span>Staff Scratchpad</span>
        </button>
      </div>

      {/* TAB 1: Spring Boot Integration */}
      {activeSubTab === 'api' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8" id="spring-boot-panel">
          {/* Settings and Testing Column */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Main configuration settings */}
            <div className="bg-white border border-border-subtle rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-border-subtle pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <Server className="w-5.5 h-5.5 text-brand-secondary" />
                  <div>
                    <h3 className="font-display font-bold text-brand-primary text-base">
                      Spring Boot Endpoint Connector
                    </h3>
                    <p className="text-text-secondary text-xs">
                      Synchronize food categories and menu item catalog directly to your local Java API.
                    </p>
                  </div>
                </div>

                {/* Main Toggle */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-text-secondary">
                    {apiSettings.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    onClick={() => handleSaveSettings(!apiSettings.enabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      apiSettings.enabled ? 'bg-brand-secondary' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        apiSettings.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Status alerts */}
              {apiStatusMessage && (
                <div className={`p-4 rounded-lg mb-6 flex gap-3 text-xs font-medium ${
                  apiStatusMessage.type === 'success' 
                    ? 'bg-brand-accent-green/10 border border-brand-accent-green/20 text-brand-accent-green' 
                    : 'bg-brand-accent-red/10 border border-brand-accent-red/20 text-brand-accent-red'
                }`}>
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-bold">Connection State Report:</p>
                    <p className="opacity-90 leading-relaxed">{apiStatusMessage.text}</p>
                  </div>
                </div>
              )}

              {/* Input details */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5 md:col-span-1">
                    <label className="font-mono text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
                      Server Base URL
                    </label>
                    <input
                      type="text"
                      value={baseUrlInput}
                      onChange={(e) => setBaseUrlInput(e.target.value)}
                      placeholder="http://localhost:8080"
                      className="w-full bg-surf-low border border-border-subtle rounded-lg px-3.5 py-2 text-sm focus:ring-1 focus:ring-brand-secondary outline-none text-text-primary"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
                      Categories Path
                    </label>
                    <input
                      type="text"
                      value={categoriesPathInput}
                      onChange={(e) => setCategoriesPathInput(e.target.value)}
                      placeholder="/api/categories"
                      className="w-full bg-surf-low border border-border-subtle rounded-lg px-3.5 py-2 text-sm focus:ring-1 focus:ring-brand-secondary outline-none text-text-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
                      Menu Items Path
                    </label>
                    <input
                      type="text"
                      value={menuItemsPathInput}
                      onChange={(e) => setMenuItemsPathInput(e.target.value)}
                      placeholder="/api/menuitems"
                      className="w-full bg-surf-low border border-border-subtle rounded-lg px-3.5 py-2 text-sm focus:ring-1 focus:ring-brand-secondary outline-none text-text-primary"
                    />
                  </div>
                </div>

                {/* Action panel */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border-subtle mt-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="bg-surf-container border border-border-subtle text-text-primary text-xs font-bold h-9 px-4 rounded-lg flex items-center gap-2 hover:bg-surf-container-high transition-colors active-scale"
                    >
                      {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5 text-brand-secondary" />}
                      <span>Test Connection</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveSettings(apiSettings.enabled)}
                      className="bg-brand-primary text-white text-xs font-bold h-9 px-4 rounded-lg hover:bg-brand-primary/90 transition-colors active-scale"
                    >
                      Save Configurations
                    </button>
                  </div>

                  {apiSettings.enabled && (
                    <button
                      type="button"
                      onClick={handleSeedDatabase}
                      disabled={seedingStatus === 'seeding'}
                      className="bg-brand-secondary/10 border border-brand-secondary/35 text-brand-secondary text-xs font-bold h-9 px-4 rounded-lg flex items-center gap-2 hover:bg-brand-secondary/20 transition-colors active-scale"
                      title="Sync existing UI items to empty Spring Boot"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Seed/Sync Local Data to Spring Boot</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Test results detail */}
              {testResult && (
                <div className={`p-4 rounded-lg mt-5 flex gap-3 text-xs leading-relaxed ${
                  testResult.success 
                    ? 'bg-brand-accent-green/10 border border-brand-accent-green/25 text-brand-accent-green font-medium' 
                    : 'bg-brand-accent-red/10 border border-brand-accent-red/25 text-brand-accent-red font-medium'
                }`}>
                  {testResult.success ? <CheckCircle2 className="w-4.5 h-4.5 shrink-0" /> : <WifiOff className="w-4.5 h-4.5 shrink-0" />}
                  <div className="space-y-1">
                    <p className="font-bold">{testResult.success ? 'Success State:' : 'Connection Failure Report:'}</p>
                    <p>{testResult.message}</p>
                    {!testResult.success && (
                      <div className="bg-white/50 p-2.5 rounded border border-brand-accent-red/10 mt-2 font-mono text-[10.5px] text-text-primary/90">
                        <p className="font-sans font-bold text-[11px] mb-1">💡 Troubleshooting CORS Blocking in Spring Boot:</p>
                        <p>1. Ensure Spring Boot is running on local port 8080.</p>
                        <p>2. Add <span className="font-bold text-brand-accent-red">@CrossOrigin(origins = "*")</span> on your Controller class.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Seeding statuses */}
              {seedingStatus !== 'idle' && (
                <div className={`p-4 rounded-lg mt-4 text-xs font-medium ${
                  seedingStatus === 'seeding' ? 'bg-brand-secondary/5 border border-brand-secondary/15 text-brand-secondary' :
                  seedingStatus === 'success' ? 'bg-brand-accent-green/10 border border-brand-accent-green/20 text-brand-accent-green' :
                  'bg-brand-accent-red/10 border border-brand-accent-red/20 text-brand-accent-red'
                }`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    {seedingStatus === 'seeding' && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span className="font-bold">Data Upload Pipeline:</span>
                  </div>
                  <p className="opacity-90">{seedingMessage}</p>
                </div>
              )}
            </div>

            {/* Quickstart Code Reference Card */}
            <div className="bg-white border border-border-subtle rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-border-subtle">
                <Code className="w-5.5 h-5.5 text-brand-secondary" />
                <h3 className="font-display font-bold text-brand-primary text-base">
                  Spring Boot Controller Blueprints
                </h3>
              </div>

              <p className="text-text-secondary text-xs mb-4 leading-relaxed">
                To guarantee absolute compatibility, implement your controllers in your Spring Boot project as styled below. Ensure standard REST routing and CORS configuration:
              </p>

              <div className="bg-surf-low rounded-lg p-4 font-mono text-xs text-text-primary space-y-4 max-h-[350px] overflow-y-auto border border-border-subtle">
                <div>
                  <span className="text-brand-secondary font-bold">// 1. Category Controller (CORS Configured)</span>
                  <pre className="text-[11px] mt-1 text-text-primary/90 whitespace-pre-wrap">
{`@RestController
@RequestMapping("/api/categories")
@CrossOrigin(origins = "*") // Critical to prevent Browser CORS blocks
public class CategoryController {

    @Autowired
    private CategoryService categoryService;

    @GetMapping
    public List<Category> listAll() {
        return categoryService.findAll();
    }

    @PostMapping
    public Category create(@RequestBody Category category) {
        return categoryService.save(category);
    }

    @PutMapping("/{id}")
    public Category update(@PathVariable String id, @RequestBody Category category) {
        return categoryService.update(id, category);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable String id) {
        categoryService.deleteById(id);
    }
}`}
                  </pre>
                </div>

                <div className="pt-4 border-t border-border-subtle/50">
                  <span className="text-brand-secondary font-bold">// 2. Menu Item Controller</span>
                  <pre className="text-[11px] mt-1 text-text-primary/90 whitespace-pre-wrap">
{`@RestController
@RequestMapping("/api/menuitems")
@CrossOrigin(origins = "*")
public class MenuItemController {

    @Autowired
    private MenuItemService itemService;

    @GetMapping
    public List<MenuItem> getAll() {
        return itemService.findAll();
    }

    @PostMapping
    public MenuItem create(@RequestBody MenuItem item) {
        return itemService.save(item);
    }

    @PutMapping("/{id}")
    public MenuItem update(@PathVariable String id, @RequestBody MenuItem item) {
        return itemService.update(id, item);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable String id) {
        itemService.deleteById(id);
    }
}`}
                  </pre>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column guides */}
          <div className="xl:col-span-1 space-y-6">
            <div className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <HelpIcon className="w-5 h-5 text-brand-secondary" />
                <h4 className="font-display font-bold text-brand-primary text-sm uppercase tracking-wider">
                  How Integration Works
                </h4>
              </div>

              <div className="space-y-4 font-normal text-xs text-text-secondary leading-relaxed">
                <div className="p-3 bg-surf-low/65 border border-border-subtle/50 rounded-lg">
                  <p className="font-bold text-brand-primary mb-1">1. Active Synced State</p>
                  <p>When live sync is toggled <strong>ON</strong>, all creations, deletions, and updates in the "Menu Items" or "Categories" tab bypass the browser storage and are dispatched directly to your local REST endpoints.</p>
                </div>

                <div className="p-3 bg-surf-low/65 border border-border-subtle/50 rounded-lg">
                  <p className="font-bold text-brand-primary mb-1">2. Smart Failover Protection</p>
                  <p>If your Spring Boot server goes offline, ChefCommand alerts you immediately and securely falls back onto the offline local database to maintain workflow continuity.</p>
                </div>

                <div className="p-3 bg-surf-low/65 border border-border-subtle/50 rounded-lg">
                  <p className="font-bold text-brand-primary mb-1">3. Auto-CORS Troubleshooting</p>
                  <p>If our test indicates that the port is open but the API requests are being blocked, the connector triggers customized CORS injection warnings to help you fix your controller files.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Operational Manual FAQs */}
      {activeSubTab === 'manual' && (
        <div className="space-y-6 max-w-4xl" id="manual-panel">
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
      )}

      {/* TAB 3: Staff Scratchpad Notes */}
      {activeSubTab === 'scratchpad' && (
        <div className="max-w-2xl bg-white border border-border-subtle rounded-xl p-6 shadow-sm flex flex-col min-h-[380px]" id="scratchpad-panel">
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
      )}
    </div>
  );
}
