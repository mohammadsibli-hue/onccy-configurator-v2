import React, { useState, useEffect } from 'react';
import { Part, User, AppSettings, FilterConfig, FilterFieldConfig, FilterGroupConfig, Component, Supplier } from '../types';
import { StorageService } from '../services/storage';
import { GeminiService } from '../services/gemini';
import { Plus, Trash2, Edit2, Sparkles, X, Save, Loader2, Image as ImageIcon, Download, Upload, Box, Database, LayoutTemplate, Filter, FileSpreadsheet, Package, FileText, Check, Users, Building2, Search } from 'lucide-react';
import { t as translations } from '../i18n';
import * as XLSX from 'xlsx';

const COMMON_CONTACT_TYPES = [
  "1NO", "1NC", "2NO", "2NC", "4NO", "4NC", 
  "2NC+2NO", "1NC+1NO", "1NC+2NO", "2NC+1NO"
];

const BEZEL_COLORS = [
  "Black", 
  "Silver", 
  "Stainless steel", 
  "Yellow",
  "Red",
  "Green",
  "Blue",
  "White"
];

const CONNECTION_MATERIALS = [
  "AgNi", 
  "Gold-plated"
];

const CONNECTION_TYPES = [
  "Screw connection", 
  "Solder Pin", 
  "Push-In",
  "Blade terminal 2.8 x 0.8 mm"
];

const SWITCHING_FUNCTIONS = [
  "Latching function",
  "Momentary function",
  "Pull&Push",
  "Twist",
  "Pull&Push with vision",
  "Twist with vision"
];

// Safe ID generator compatible with all browsers
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

// Image Compression Utility
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Reduce dimensions to save storage space
        const MAX_WIDTH = 500;
        const MAX_HEIGHT = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Compress to JPEG with 0.5 quality to significantly reduce Base64 string length
        resolve(canvas.toDataURL('image/jpeg', 0.5)); 
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

interface AdminDashboardProps {
  currentUser: User;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  
  const [activeView, setActiveView] = useState<'products' | 'components' | 'suppliers'>('products');
  const [parts, setParts] = useState<Part[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  // Search states for each module
  const [productSearch, setProductSearch] = useState('');
  const [componentSearch, setComponentSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingComponent, setIsEditingComponent] = useState(false);
  const [isEditingSupplier, setIsEditingSupplier] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<Partial<Supplier>>({ id: '', name: '', contactPerson: '', email: '', phone: '', address: '', website: '', notes: '' });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFilterSettingsOpen, setIsFilterSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [currentComponent, setCurrentComponent] = useState<Partial<Component>>({ id: '', name: '', category: '', specifications: '' });
  
  // Permission Checks
  const canDelete = currentUser.role === 'admin' || currentUser.role === 'product_manager';
  const isAdmin = currentUser.role === 'admin';

  // Settings State
  const [settings, setSettings] = useState<AppSettings>({ heroImageUrl: '', heroTitle: '', heroSubtitle: '', logoUrl: '', companyName: 'KINRED' });
  const t = translations.admin;

  // Filter config state (Category / String / Voltage groups)
  const [filterConfig, setFilterConfig] = useState<FilterConfig | null>(null);
  const [filterSaveError, setFilterSaveError] = useState<string | null>(null);

  const addFilterGroup = () => {
    if (!filterConfig) return;
    const nextIndex = filterConfig.groups.length + 1;
    const newId = `group_${nextIndex}`;
    const newGroup: FilterGroupConfig = {
      id: newId,
      label: `GROUP ${nextIndex}`,
      fields: []
    };
    setFilterConfig({
      ...filterConfig,
      groups: [...filterConfig.groups, newGroup]
    });
  };

  const removeFilterGroup = (groupIndex: number) => {
    if (!filterConfig) return;
    // Protect the first three core groups (CATEGORY / STRING / VOLTAGE)
    if (groupIndex <= 2) return;
    setFilterConfig({
      ...filterConfig,
      groups: filterConfig.groups.filter((_, idx) => idx !== groupIndex)
    });
  };

  const updateGroupLabel = (groupIndex: number, newLabel: string) => {
    if (!filterConfig) return;
    const newConfig: FilterConfig = {
      ...filterConfig,
      groups: filterConfig.groups.map((group, idx) =>
        idx === groupIndex
          ? {
              ...group,
              label: newLabel,
              // For non-core groups, keep the id in sync with the label (uppercased)
              ...(idx > 2 && newLabel.trim()
                ? { id: newLabel.trim().toUpperCase() }
                : {})
            }
          : group
      )
    };
    setFilterConfig(newConfig);
  };

  const addFilterField = (groupId: string) => {
    if (!filterConfig) return;
    const newConfig: FilterConfig = {
      ...filterConfig,
      groups: filterConfig.groups.map(group => {
        if (group.id !== groupId) return group;
        const nextIndex = group.fields.length + 1;
        const newField: FilterFieldConfig = {
          id: `${groupId}_field_${nextIndex}`,
          label: '',
          partField: '',
          options: []
        };
        return {
          ...group,
          fields: [...group.fields, newField]
        };
      })
    };
    setFilterConfig(newConfig);
  };

  const updateFilterFieldOptionLabel = (fieldId: string, index: number, newLabel: string) => {
    if (!filterConfig) return;
    const newConfig: FilterConfig = {
      ...filterConfig,
      groups: filterConfig.groups.map(group => ({
        ...group,
        fields: group.fields.map((field: FilterFieldConfig) => {
          if (field.id !== fieldId) return field;
          const options = field.options.map((opt, i) =>
            i === index ? { ...opt, label: newLabel } : opt
          );
          return { ...field, options };
        })
      }))
    };
    setFilterConfig(newConfig);
  };

  const addFilterFieldOption = (fieldId: string) => {
    if (!filterConfig) return;
    const newConfig: FilterConfig = {
      ...filterConfig,
      groups: filterConfig.groups.map(group => ({
        ...group,
        fields: group.fields.map((field: FilterFieldConfig) => {
          if (field.id !== fieldId) return field;
          const newValue = '';
          return {
            ...field,
            options: [...field.options, { value: newValue, label: '' }]
          };
        })
      }))
    };
    setFilterConfig(newConfig);
  };

  const updateFilterFieldOptionValue = (fieldId: string, index: number, newValue: string) => {
    if (!filterConfig) return;
    const newConfig: FilterConfig = {
      ...filterConfig,
      groups: filterConfig.groups.map(group => ({
        ...group,
        fields: group.fields.map((field: FilterFieldConfig) => {
          if (field.id !== fieldId) return field;
          const options = field.options.map((opt, i) =>
            i === index ? { ...opt, value: newValue } : opt
          );
          return { ...field, options };
        })
      }))
    };
    setFilterConfig(newConfig);
  };

  const removeFilterFieldOption = (fieldId: string, index: number) => {
    if (!filterConfig) return;
    const newConfig: FilterConfig = {
      ...filterConfig,
      groups: filterConfig.groups.map(group => ({
        ...group,
        fields: group.fields.map((field: FilterFieldConfig) => {
          if (field.id !== fieldId) return field;
          const options = field.options.filter((_, i) => i !== index);
          return { ...field, options };
        })
      }))
    };
    setFilterConfig(newConfig);
  };

  const handleSaveFilterConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filterConfig) return;
    try {
      StorageService.saveFilterConfig(filterConfig);
      setIsFilterSettingsOpen(false);
    } catch (error: any) {
      setFilterSaveError(error.message || 'Failed to save filter configuration.');
    }
  };

  // Form State
  const [currentPart, setCurrentPart] = useState<Partial<Part>>({
    id: '',
    rubric: 'Pushbutton',
    series: 'HQ',
    name: '',
    description: '',
    imageUrl: 'https://picsum.photos/200/200',
    technicalSpecs: { mountingHole: '22MM', protectionClass: 'IP65', illumination: 'NO', ringIllumination: 'NO' },
    availableContactTypes: [],
    colorImages: {},
    connectionMaterial: '',
    shape: '',
    colorFrontBezel: '',
    connectionType: '',
    switchingFunction: '',
    modelUrl: ''
  });

  const [activeTab, setActiveTab] = useState<'general' | 'detailed'>('general');

  useEffect(() => {
    refreshParts();
    refreshComponents();
    refreshSuppliers();
    setFilterConfig(StorageService.getFilterConfig());
  }, []);

  const refreshParts = () => {
    setParts(StorageService.getAllParts());
  };

  const refreshComponents = () => {
    setComponents(StorageService.getAllComponents());
  };

  const refreshSuppliers = () => {
    setSuppliers(StorageService.getAllSuppliers());
  };

  // Filtered data based on search
  const filteredParts = parts.filter(part => {
    const search = productSearch.toLowerCase();
    return !search || 
      part.name.toLowerCase().includes(search) ||
      part.description?.toLowerCase().includes(search) ||
      part.rubric?.toLowerCase().includes(search) ||
      part.series?.toLowerCase().includes(search) ||
      part.categoryType?.toLowerCase().includes(search);
  });

  const filteredComponents = components.filter(comp => {
    const search = componentSearch.toLowerCase();
    const supplierName = comp.supplierId ? suppliers.find(s => s.id === comp.supplierId)?.name?.toLowerCase() : '';
    return !search ||
      comp.name.toLowerCase().includes(search) ||
      comp.category?.toLowerCase().includes(search) ||
      comp.specifications?.toLowerCase().includes(search) ||
      comp.manufacturer?.toLowerCase().includes(search) ||
      supplierName?.includes(search);
  });

  const filteredSuppliers = suppliers.filter(supplier => {
    const search = supplierSearch.toLowerCase();
    return !search ||
      supplier.name.toLowerCase().includes(search) ||
      supplier.contactPerson?.toLowerCase().includes(search) ||
      supplier.email?.toLowerCase().includes(search) ||
      supplier.phone?.toLowerCase().includes(search) ||
      supplier.address?.toLowerCase().includes(search);
  });

  // Supplier CRUD handlers
  const handleCreateNewSupplier = () => {
    setCurrentSupplier({
      id: generateId(),
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      website: '',
      notes: ''
    });
    setIsEditingSupplier(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setCurrentSupplier({ ...supplier });
    setIsEditingSupplier(true);
  };

  const handleDeleteSupplier = (id: string) => {
    if (confirm('Are you sure you want to delete this supplier?')) {
      StorageService.deleteSupplier(id);
      refreshSuppliers();
    }
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSupplier.name) {
      alert('Supplier name is required');
      return;
    }
    
    const supplierToSave: Supplier = {
      id: currentSupplier.id || generateId(),
      name: currentSupplier.name,
      contactPerson: currentSupplier.contactPerson || '',
      email: currentSupplier.email || '',
      phone: currentSupplier.phone || '',
      address: currentSupplier.address || '',
      website: currentSupplier.website || '',
      notes: currentSupplier.notes || '',
      createdAt: currentSupplier.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    StorageService.saveSupplier(supplierToSave);
    setIsEditingSupplier(false);
    refreshSuppliers();
  };

  const handleCreateNewComponent = () => {
    setCurrentComponent({
      id: generateId(),
      name: '',
      category: '',
      specifications: '',
      manufacturer: '',
      model: '',
      description: ''
    });
    setIsEditingComponent(true);
  };

  const handleEditComponent = (component: Component) => {
    setCurrentComponent({ ...component });
    setIsEditingComponent(true);
  };

  const handleDeleteComponent = (id: string) => {
    if (!canDelete) {
      alert('You do not have permission to delete components.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this component?')) {
      StorageService.deleteComponent(id);
      refreshComponents();
    }
  };

  const handleSaveComponent = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentComponent.name && currentComponent.category) {
      try {
        const componentToSave = {
          ...currentComponent,
          id: currentComponent.id || generateId()
        } as Component;
        StorageService.saveComponent(componentToSave);
        setIsEditingComponent(false);
        refreshComponents();
      } catch (error: any) {
        alert(error.message || 'Failed to save component.');
      }
    }
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const importedComponents: Component[] = jsonData.map((row: any) => ({
          id: row.id || generateId(),
          name: row.name || row.Name || '',
          category: row.category || row.Category || '',
          specifications: row.specifications || row.Specifications || '',
          manufacturer: row.manufacturer || row.Manufacturer || '',
          model: row.model || row.Model || '',
          description: row.description || row.Description || '',
          purchasePrice: row.purchasePrice || row.purchasePrice || 0
        }));

        StorageService.importComponents(importedComponents);
        refreshComponents();
        alert(`Successfully imported ${importedComponents.length} components!`);
      } catch (error) {
        console.error('Excel import error:', error);
        alert('Failed to import Excel file. Please check the format.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleResetDB = () => {
    const code = window.prompt(t.dialogs.resetCodePrompt);
    if (code === null) {
      return; // user cancelled
    }
    if (code !== '1234') {
      alert(t.dialogs.resetCodeWrong);
      return;
    }

    if (window.confirm(t.dialogs.confirmResetDb)) {
      localStorage.removeItem('switchcraft_db_v3');
      localStorage.removeItem('switchcraft_settings_v1');
      StorageService.init();
      refreshParts();
    }
  };

  const handleBackupData = () => {
    try {
      StorageService.downloadBackup();
      alert('Data backup successful! File has been downloaded.');
    } catch (error: any) {
      alert('Backup failed: ' + error.message);
    }
  };

  const handleRestoreData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target?.result as string);
        
        if (window.confirm('确定要Restore Data吗？这将覆盖当前所有数据！建议先备份当前数据。')) {
          StorageService.importAllData(jsonData);
          refreshParts();
          refreshComponents();
          alert('Data restore successful! Page will refresh.');
          window.location.reload();
        }
      } catch (error: any) {
        alert('Restore failed: ' + error.message);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleOpenSettings = () => {
    setSettings(StorageService.getSettings());
    setIsSettingsOpen(true);
  };

  const handleOpenFilterSettings = () => {
    setFilterSaveError(null);
    setFilterConfig(StorageService.getFilterConfig());
    setIsFilterSettingsOpen(true);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      StorageService.saveSettings(settings);
      setIsSettingsOpen(false);
    } catch (e: any) {
      alert(t.dialogs.saveSettingsFailedSuffix.replace('{message}', e.message));
    }
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
    if (file) {
      try {
        // Compress a bit less aggressively for hero, but still need to fit in local storage
        const compressedBase64 = await compressImage(file); 
        setSettings(prev => ({ ...prev, heroImageUrl: compressedBase64 }));
      } catch (error) {
        console.error('Image compression error:', error);
        alert(t.dialogs.imageProcessFailed);
      }
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedBase64 = await compressImage(file);
      setSettings(prev => ({ ...prev, logoUrl: compressedBase64 }));
    } catch (error) {
      console.error('Logo compression error:', error);
      alert(t.dialogs.imageProcessFailed);
    }
  };

  const handleCreateNew = () => {
    setCurrentPart({
      id: generateId(),
      rubric: 'Pushbutton',
      series: 'HQ',
      name: '',
      description: '',
      imageUrl: `https://picsum.photos/seed/${Math.random()}/300/300`,
      technicalSpecs: { mountingHole: '22MM', protectionClass: 'IP65', illumination: 'NO', ringIllumination: 'NO' },
      availableContactTypes: [],
      colorImages: {},
      connectionMaterial: 'AgNi',
      shape: 'Round',
      colorFrontBezel: 'Black',
      connectionType: 'Screw connection',
      switchingFunction: 'Momentary function',
      modelUrl: ''
    });
    setSaveError(null);
    setIsEditing(true);
    setActiveTab('general');
  };

  const handleEdit = (part: Part) => {
    setCurrentPart({ 
      ...part,
      colorImages: part.colorImages || {}, // Ensure object exists
      modelUrl: part.modelUrl || ''
    });
    setSaveError(null);
    setIsEditing(true);
    setActiveTab('general');
  };

  const handleDelete = (id: string) => {
    if (!canDelete) {
        alert(t.dialogs.noPermissionDelete);
        return;
    }
    if (window.confirm(t.dialogs.confirmDelete)) {
      StorageService.deletePart(id);
      refreshParts();
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    if (currentPart.name) {
      try {
        // Ensure ID exists
        const partToSave = {
          ...currentPart,
          id: currentPart.id || generateId()
        } as Part;

        StorageService.savePart(partToSave);
        setIsEditing(false);
        refreshParts();
      } catch (error: any) {
        console.error('Save error:', error);
        setSaveError(error.message || 'Failed to save product. Storage might be full.');
      }
    }
  };

  const handleModelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Increased limit to 5MB as requested
      const MAX_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_SIZE) { 
         alert(t.dialogs.modelTooLarge);
         // Reset input
         e.target.value = '';
         return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        // Optional: Check base64 length roughly
        if (result.length > 4000000) {
            console.warn("Warning: Large file. Saving might fail if storage is near capacity.");
        }
        setCurrentPart(prev => ({
          ...prev,
          modelUrl: result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleContactType = (type: string) => {
    const current = currentPart.availableContactTypes || [];
    if (current.includes(type)) {
      setCurrentPart({
        ...currentPart,
        availableContactTypes: current.filter(t => t !== type)
      });
    } else {
      setCurrentPart({
        ...currentPart,
        availableContactTypes: [...current, type]
      });
    }
  };

  // --- Helpers for editing ---

  const handleAIGenerate = async () => {
    if (!currentPart.name || !currentPart.rubric) {
      alert(t.editModal.aiButtonDisabledReason);
      return;
    }

    setIsGenerating(true);
    const result = await GeminiService.generateProductDetails(
      currentPart.name, 
      currentPart.rubric
    );
    setIsGenerating(false);

    if (result) {
      setCurrentPart(prev => ({
        ...prev,
        description: result.description,
        series: result.series,
        technicalSpecs: {
          ...prev.technicalSpecs,
          ...result.technicalSpecs
        },
        shape: result.shape,
        connectionMaterial: result.connectionMaterial,
        availableContactTypes: result.availableContactTypes,
        connectionType: result.connectionType,
        switchingFunction: result.switchingFunction,
        colorFrontBezel: result.colorFrontBezel
      }));
    } else {
      alert(t.dialogs.aiGenerateFailed);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t.title}</h1>
          <div className="flex items-center mt-1 gap-2">
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wide">
                {currentUser.role.replace('_', ' ')}
            </span>
            <p className="text-slate-500 text-sm">{t.welcomeBack.replace('{username}', currentUser.username)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            {isAdmin && (
                <>
                  <button 
                  type="button"
                  onClick={handleOpenSettings}
                  className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2.5 rounded-lg flex items-center font-medium transition-colors text-sm"
                  >
                  <LayoutTemplate className="w-4 h-4 mr-2" />
                  {t.manageHomepage}
                  </button>
                  {activeView === 'products' && (
                    <button
                      type="button"
                      onClick={handleOpenFilterSettings}
                      className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2.5 rounded-lg flex items-center font-medium transition-colors text-sm"
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      Filters
                    </button>
                  )}
                  <button 
                  type="button"
                  onClick={handleBackupData}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-2.5 rounded-lg flex items-center font-medium transition-colors text-sm"
                  title="备份所有数据到本地文件"
                  >
                  <Download className="w-4 h-4 mr-2" />
                  Backup Data
                  </button>
                  <label className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2.5 rounded-lg flex items-center font-medium transition-colors text-sm cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    Restore Data
                    <input type="file" accept=".json" onChange={handleRestoreData} className="hidden" />
                  </label>
                  <button 
                  type="button"
                  onClick={handleResetDB}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-2.5 rounded-lg flex items-center font-medium transition-colors text-sm"
                  title={t.resetDbTitle}
                  >
                  <Database className="w-4 h-4 mr-2" />
                  {t.resetDb}
                  </button>
                </>
            )}
            </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="mb-6 border-b border-slate-200">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveView('products')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeView === 'products'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Box className="w-4 h-4 inline-block mr-2" />
            Product Management
          </button>
          <button
            onClick={() => setActiveView('components')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeView === 'components'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Package className="w-4 h-4 inline-block mr-2" />
            Component Management
          </button>
          <button
            onClick={() => setActiveView('suppliers')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeView === 'suppliers'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Building2 className="w-4 h-4 inline-block mr-2" />
            Supplier Management
          </button>
        </div>
      </div>

      {/* Products Grid */}
      {activeView === 'products' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header with Add Button */}
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800">Products ({filteredParts.length})</h3>
            <button
              type="button"
              onClick={handleCreateNew}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center font-medium transition-colors text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </button>
          </div>
          {/* Search Bar */}
          <div className="p-4 border-b border-slate-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search products by name, description, category..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t.table.product}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t.table.classification}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t.table.techData}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">{t.table.actions}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
            {filteredParts.map((part) => (
              <tr key={part.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <img className="h-10 w-10 rounded object-contain border border-slate-200 bg-white" src={part.imageUrl} alt="" />
                    <div className="ml-4">
                      <div className="text-sm font-medium text-slate-900">{part.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{part.id.toUpperCase()}</div>
                      <div className="text-xs text-slate-500 truncate w-40">{part.description}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                    {part.categoryType || part.rubric}
                  </span>
                  {!part.categoryType && (
                    <span className="text-xs text-slate-500">{part.series}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                    <div className="text-xs text-slate-600 grid grid-cols-2 gap-x-2">
                      {/* String (input / output) */}
                      <span>
                        {[part.inputString, part.outputString]
                          .filter(Boolean)
                          .join(' / ') || '-'}
                      </span>

                      {/* Voltage */}
                      <span>{part.technicalSpecs?.voltage || '-'}</span>
                    </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button type="button" onClick={() => handleEdit(part)} className="text-blue-600 hover:text-blue-900 mr-4" title="Edit Product">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {canDelete ? (
                    <button type="button" onClick={() => handleDelete(part.id)} className="text-red-600 hover:text-red-900" title="Delete Product">
                        <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="text-slate-300 cursor-not-allowed" title="Permission Denied">
                        <Trash2 className="w-4 h-4" />
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {filteredParts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500 text-sm">
                  {productSearch ? `No products found matching "${productSearch}"` : t.table.emptyState}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {/* Components Grid */}
      {activeView === 'components' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header with Add Button */}
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800">Components ({filteredComponents.length})</h3>
            <div className="flex items-center gap-2">
              <label className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg flex items-center font-medium transition-colors text-sm cursor-pointer">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Import Excel
                <input type="file" accept=".xlsx,.xls" onChange={handleExcelImport} className="hidden" />
              </label>
              <button
                type="button"
                onClick={handleCreateNewComponent}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center font-medium transition-colors text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Component
              </button>
            </div>
          </div>
          {/* Search Bar */}
          <div className="p-4 border-b border-slate-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search components by name, category, specifications, supplier..."
                value={componentSearch}
                onChange={(e) => setComponentSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Component</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Specifications</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredComponents.map((component) => (
                <tr key={component.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">{component.name}</div>
                    <div className="text-xs text-slate-500">{component.model || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      {component.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {component.specifications}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {component.supplierId ? (suppliers.find(s => s.id === component.supplierId)?.name || '-') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                    {component.purchasePrice ? `¥${component.purchasePrice.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button type="button" onClick={() => handleEditComponent(component)} className="text-blue-600 hover:text-blue-900 mr-4" title="Edit Component">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {canDelete ? (
                      <button type="button" onClick={() => handleDeleteComponent(component.id)} className="text-red-600 hover:text-red-900" title="Delete Component">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="text-slate-300 cursor-not-allowed" title="Permission Denied">
                        <Trash2 className="w-4 h-4" />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredComponents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 text-sm">
                    {componentSearch ? `No components found matching "${componentSearch}"` : 'No components found. Click "Add Component" to create one.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Component Edit Modal */}
      {isEditingComponent && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity" onClick={() => setIsEditingComponent(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full">
              <form onSubmit={handleSaveComponent} className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900">{currentComponent.id ? 'Edit Component' : 'Add New Component'}</h3>
                  <button type="button" onClick={() => setIsEditingComponent(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Part No. *</label>
                    <input 
                      type="text" required value={currentComponent.name || ''}
                      onChange={(e) => setCurrentComponent({...currentComponent, name: e.target.value})}
                      className="mt-1 block w-full border-slate-300 rounded-md shadow-sm p-2 border"
                      placeholder="e.g., SPD-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Category *</label>
                    <select 
                      required value={currentComponent.category || ''}
                      onChange={(e) => setCurrentComponent({...currentComponent, category: e.target.value})}
                      className="mt-1 block w-full border-slate-300 rounded-md shadow-sm p-2 border"
                    >
                      <option value="">-- Select Category --</option>
                      <option value="DC Isolated Switch">DC Isolated Switch</option>
                      <option value="AC Isolated Switch">AC Isolated Switch</option>
                      <option value="DC SPD">DC SPD</option>
                      <option value="AC SPD">AC SPD</option>
                      <option value="DC MCB">DC MCB</option>
                      <option value="AC MCB">AC MCB</option>
                      <option value="DC Fuse">DC Fuse</option>
                      <option value="AC Fuse">AC Fuse</option>
                      <option value="DC Fuse Holder">DC Fuse Holder</option>
                      <option value="AC Fuse Holder">AC Fuse Holder</option>
                      <option value="RCCD">RCCD</option>
                      <option value="RCBO">RCBO</option>
                      <option value="Enclosure Type">Enclosure Type</option>
                      <option value="Terminal Block">Terminal Block</option>
                      <option value="Cable Gland">Cable Gland</option>
                      <option value="MC4">MC4</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Specifications</label>
                    <input 
                      type="text" value={currentComponent.specifications || ''}
                      onChange={(e) => setCurrentComponent({...currentComponent, specifications: e.target.value})}
                      className="mt-1 block w-full border-slate-300 rounded-md shadow-sm p-2 border"
                      placeholder="e.g., 16A, Type 1+2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Supplier</label>
                    <select 
                      value={currentComponent.supplierId || ''}
                      onChange={(e) => setCurrentComponent({...currentComponent, supplierId: e.target.value})}
                      className="mt-1 block w-full border-slate-300 rounded-md shadow-sm p-2 border"
                    >
                      <option value="">-- Select Supplier --</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Purchase Price (¥)</label>
                    <input 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      value={currentComponent.purchasePrice || ''}
                      onChange={(e) => setCurrentComponent({...currentComponent, purchasePrice: parseFloat(e.target.value) || 0})}
                      className="mt-1 block w-full border-slate-300 rounded-md shadow-sm p-2 border"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Description</label>
                    <textarea 
                      rows={3} value={currentComponent.description || ''}
                      onChange={(e) => setCurrentComponent({...currentComponent, description: e.target.value})}
                      className="mt-1 block w-full border-slate-300 rounded-md shadow-sm p-2 border"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button type="button" onClick={() => setIsEditingComponent(false)} className="px-4 py-2 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 flex items-center">
                    <Save className="w-4 h-4 mr-2" />
                    Save Component
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Suppliers Grid */}
      {activeView === 'suppliers' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800">Suppliers ({filteredSuppliers.length})</h3>
            <button
              type="button"
              onClick={handleCreateNewSupplier}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center font-medium transition-colors text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Supplier
            </button>
          </div>
          {/* Search Bar */}
          <div className="p-4 border-b border-slate-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search suppliers by name, contact, email, phone..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">{supplier.name}</div>
                        {supplier.website && (
                          <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                            {supplier.website}
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-900">{supplier.contactPerson || '-'}</div>
                    <div className="text-xs text-slate-500">{supplier.email || ''}</div>
                    <div className="text-xs text-slate-500">{supplier.phone || ''}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">
                      {supplier.createdAt ? new Date(supplier.createdAt).toLocaleDateString() : '-'}
                    </div>
                    <div className="text-xs text-slate-500">
                      Updated: {supplier.updatedAt ? new Date(supplier.updatedAt).toLocaleDateString() : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button type="button" onClick={() => handleEditSupplier(supplier)} className="text-blue-600 hover:text-blue-900 mr-4" title="Edit Supplier">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {canDelete ? (
                      <button type="button" onClick={() => handleDeleteSupplier(supplier.id)} className="text-red-600 hover:text-red-900" title="Delete Supplier">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="text-slate-300 cursor-not-allowed" title="Permission Denied">
                        <Trash2 className="w-4 h-4" />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500 text-sm">
                    {supplierSearch ? `No suppliers found matching "${supplierSearch}"` : 'No suppliers found. Click "Add Supplier" to create one.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Supplier Edit Modal */}
      {isEditingSupplier && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity" onClick={() => setIsEditingSupplier(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full">
              <form onSubmit={handleSaveSupplier} className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900">{currentSupplier.id ? 'Edit Supplier' : 'Add New Supplier'}</h3>
                  <button type="button" onClick={() => setIsEditingSupplier(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Supplier Name *</label>
                    <input 
                      type="text" required value={currentSupplier.name || ''}
                      onChange={(e) => setCurrentSupplier({...currentSupplier, name: e.target.value})}
                      className="mt-1 block w-full border-slate-300 rounded-md shadow-sm p-2 border"
                      placeholder="e.g., Acme Electronics Co."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Contact Person</label>
                    <input 
                      type="text" value={currentSupplier.contactPerson || ''}
                      onChange={(e) => setCurrentSupplier({...currentSupplier, contactPerson: e.target.value})}
                      className="mt-1 block w-full border-slate-300 rounded-md shadow-sm p-2 border"
                      placeholder="e.g., John Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Email</label>
                    <input 
                      type="email" value={currentSupplier.email || ''}
                      onChange={(e) => setCurrentSupplier({...currentSupplier, email: e.target.value})}
                      className="mt-1 block w-full border-slate-300 rounded-md shadow-sm p-2 border"
                      placeholder="e.g., contact@supplier.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Phone</label>
                    <input 
                      type="tel" value={currentSupplier.phone || ''}
                      onChange={(e) => setCurrentSupplier({...currentSupplier, phone: e.target.value})}
                      className="mt-1 block w-full border-slate-300 rounded-md shadow-sm p-2 border"
                      placeholder="e.g., +86 123 4567 8900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Website</label>
                    <input 
                      type="url" value={currentSupplier.website || ''}
                      onChange={(e) => setCurrentSupplier({...currentSupplier, website: e.target.value})}
                      className="mt-1 block w-full border-slate-300 rounded-md shadow-sm p-2 border"
                      placeholder="e.g., https://www.supplier.com"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Address</label>
                    <input 
                      type="text" value={currentSupplier.address || ''}
                      onChange={(e) => setCurrentSupplier({...currentSupplier, address: e.target.value})}
                      className="mt-1 block w-full border-slate-300 rounded-md shadow-sm p-2 border"
                      placeholder="e.g., 123 Industrial Park, Shenzhen, China"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Notes</label>
                    <textarea 
                      rows={3} value={currentSupplier.notes || ''}
                      onChange={(e) => setCurrentSupplier({...currentSupplier, notes: e.target.value})}
                      className="mt-1 block w-full border-slate-300 rounded-md shadow-sm p-2 border"
                      placeholder="Additional notes about this supplier..."
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button type="button" onClick={() => setIsEditingSupplier(false)} className="px-4 py-2 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 flex items-center">
                    <Save className="w-4 h-4 mr-2" />
                    Save Supplier
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
         <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity" onClick={() => setIsSettingsOpen(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <form onSubmit={handleSaveSettings} className="p-6">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-900">{t.settingsModal.title}</h3>
                    <button type="button" onClick={() => setIsSettingsOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
                 </div>
                 
                 <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">{t.settingsModal.companyName}</label>
                      <input
                        type="text"
                        value={settings.companyName || ''}
                        onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                        className="mt-1 block w-full border-slate-300 rounded-md shadow-sm p-2 border"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">{t.settingsModal.heroTitle}</label>
                      <input 
                        type="text" required value={settings.heroTitle}
                        onChange={(e) => setSettings({...settings, heroTitle: e.target.value})}
                        className="mt-1 block w-full border-slate-300 rounded-md shadow-sm p-2 border"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">{t.settingsModal.heroSubtitle}</label>
                      <textarea 
                        value={settings.heroSubtitle}
                        onChange={(e) => setSettings({...settings, heroSubtitle: e.target.value})}
                        className="mt-1 block w-full border-slate-300 rounded-md shadow-sm p-2 border"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">{t.settingsModal.heroBackground}</label>
                       <div className="flex items-center space-x-4">
                          <div className="w-24 h-16 bg-slate-100 rounded overflow-hidden border border-slate-200">
                             {settings.heroImageUrl && <img src={settings.heroImageUrl} className="w-full h-full object-cover" />}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleHeroImageUpload}
                            className="block w-full text-sm text-slate-500
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-md file:border-0
                              file:text-sm file:font-semibold
                              file:bg-blue-50 file:text-blue-700
                              hover:file:bg-blue-100"
                          />
                       </div>
                       <p className="text-xs text-slate-500 mt-2">{t.settingsModal.heroHint}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">{t.settingsModal.logoLabel}</label>
                      <div className="flex items-center space-x-4">
                        <div className="w-24 h-16 bg-slate-100 rounded overflow-hidden border border-slate-200 flex items-center justify-center">
                          {settings.logoUrl ? (
                            <img src={settings.logoUrl} className="max-w-full max-h-full object-contain" />
                          ) : (
                            <span className="text-xs text-slate-400">No logo</span>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="block w-full text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100"
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-2">{t.settingsModal.logoHint}</p>
                    </div>
                 </div>

                 <div className="mt-8 flex justify-end">
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700">
                      {t.settingsModal.saveSettings}
                    </button>
                 </div>
              </form>
            </div>
          </div>
         </div>
      )}

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity" onClick={() => setIsEditing(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl w-full">
              <form onSubmit={handleSave} className="flex flex-col h-[80vh]">
                
                {/* Modal Header */}
                <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-slate-900">
                    {currentPart.id ? t.editModal.editProduct : t.editModal.addProduct}
                  </h3>
                  <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                {/* Modal Body - Scrollable */}
                <div className="flex-grow overflow-y-auto p-6 bg-slate-50">
                  
                   {saveError && (
                    <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <X className="h-5 w-5 text-red-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-red-700">
                            {saveError}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tabs */}
                  <div className="flex space-x-4 mb-6 border-b border-slate-200 pb-1">
                    <button 
                      type="button"
                      onClick={() => setActiveTab('general')}
                      className={`pb-2 px-1 text-sm font-medium ${activeTab === 'general' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {t.editModal.generalTab}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setActiveTab('detailed')}
                      className={`pb-2 px-1 text-sm font-medium ${activeTab === 'detailed' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {t.editModal.detailedTab}
                    </button>
                  </div>

                  {activeTab === 'general' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-4">
                          {/* Product image / drawing upload */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Product Drawings / Images</label>
                            <div className="flex items-center gap-4">
                              <div className="w-20 h-20 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center">
                                {currentPart.imageUrl ? (
                                  <img src={currentPart.imageUrl} alt={currentPart.name || 'preview'} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-[11px] text-slate-400 px-2 text-center">无图片</span>
                                )}
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  try {
                                    const compressedBase64 = await compressImage(file);
                                    setCurrentPart(prev => ({ ...prev, imageUrl: compressedBase64 }));
                                  } catch (error) {
                                    console.error('Image compression error:', error);
                                    alert(t.dialogs.imageProcessFailed);
                                  }
                                }}
                                className="block w-full text-xs text-slate-500
                                  file:mr-3 file:py-1.5 file:px-3
                                  file:rounded-md file:border-0
                                  file:text-xs file:font-semibold
                                  file:bg-blue-50 file:text-blue-700
                                  hover:file:bg-blue-100"
                              />
                            </div>
                            <p className="mt-1 text-[11px] text-slate-400">若未上传，将自动使用系统生成的占位图片。</p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700">{t.editModal.productName}</label>
                            <input 
                              type="text" required value={currentPart.name}
                              onChange={(e) => setCurrentPart({...currentPart, name: e.target.value})}
                              className="mt-1 block w-full border-slate-300 rounded-md shadow-sm p-2 border"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700">{t.editModal.rubricCategory}</label>
                            <select
                              value={currentPart.categoryType || ''}
                              onChange={(e) => setCurrentPart({
                                ...currentPart,
                                categoryType: e.target.value || undefined
                              })}
                              className="mt-1 block w-full border-slate-300 rounded-md shadow-sm p-2 border"
                            >
                              <option value="">--</option>
                              {filterConfig?.groups
                                .find(g => g.id === 'CATEGORY' || g.id === 'category')?.fields[0]?.options.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                          </div>
                           {/* 3D Model Upload / URL */}
                           <div className="bg-slate-100 p-4 rounded-lg border border-slate-200">
                              <label className="block text-sm font-bold text-slate-800 mb-2 flex items-center">
                                <Box className="w-4 h-4 mr-2" />
                                {t.editModal.model3dLabel}
                              </label>
                              <div className="flex items-center space-x-2 mb-2">
                                <input
                                  type="file"
                                  accept=".glb,.gltf"
                                  onChange={handleModelUpload}
                                  className="block w-full text-sm text-slate-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-md file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-blue-50 file:text-blue-700
                                    hover:file:bg-blue-100"
                                />
                                {currentPart.modelUrl && (
                                  <span className="text-green-600 text-xs font-medium flex items-center">
                                    <Check className="w-4 h-4 mr-1" /> Saved
                                  </span>
                                )}
                              </div>
                              <div className="mt-1">
                                <label className="block text-[11px] font-medium text-slate-500 mb-1">{t.editModal.model3dUrlLabel}</label>
                                <input
                                  type="text"
                                  value={currentPart.modelUrl && currentPart.modelUrl.startsWith('data:') ? '' : (currentPart.modelUrl || '')}
                                  onChange={(e) => setCurrentPart({
                                    ...currentPart,
                                    modelUrl: e.target.value.trim() || currentPart.modelUrl
                                  })}
                                  placeholder={t.editModal.model3dUrlPlaceholder}
                                  className="block w-full border-slate-300 rounded-md shadow-sm p-2 border text-xs"
                                />
                              </div>
                              <p className="text-xs text-slate-500 mt-2">
                                {t.editModal.model3dHint}
                              </p>
                           </div>

                       </div>
                       
                       <div className="space-y-4">
                          <button 
                            type="button" onClick={handleAIGenerate} disabled={isGenerating || !currentPart.name}
                            className={`w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${isGenerating ? 'bg-blue-400' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700'}`}
                          >
                             {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                             {t.editModal.aiButton}
                          </button>
                          <div>
                            <label className="block text-sm font-medium text-slate-700">Description</label>
                            <textarea 
                              rows={5} value={currentPart.description}
                              onChange={(e) => setCurrentPart({...currentPart, description: e.target.value})}
                              className="mt-1 block w-full border-slate-300 rounded-md shadow-sm p-2 border"
                            />
                          </div>

                          {/* STRING Group */}
                          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <h4 className="font-bold text-slate-800 mb-3 border-b pb-2 text-sm">STRING</h4>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-slate-500">Input String</label>
                                <select
                                  value={currentPart.inputString || ''}
                                  onChange={(e) => setCurrentPart({
                                    ...currentPart,
                                    inputString: e.target.value || undefined
                                  })}
                                  className="mt-1 block w-full border-slate-300 rounded text-sm p-1.5 border"
                                >
                                  <option value="">--</option>
                                  {filterConfig?.groups
                                    .find(g => g.id === 'STRING' || g.id === 'string')?.fields
                                    .find(f => f.label === 'Input String')?.options.map(opt => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-500">Output String</label>
                                <select
                                  value={currentPart.outputString || ''}
                                  onChange={(e) => setCurrentPart({
                                    ...currentPart,
                                    outputString: e.target.value || undefined
                                  })}
                                  className="mt-1 block w-full border-slate-300 rounded text-sm p-1.5 border"
                                >
                                  <option value="">--</option>
                                  {filterConfig?.groups
                                    .find(g => g.id === 'STRING' || g.id === 'string')?.fields
                                    .find(f => f.label === 'Output String')?.options.map(opt => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* VOLTAGE Group */}
                          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <h4 className="font-bold text-slate-800 mb-3 border-b pb-2 text-sm">VOLTAGE</h4>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-slate-500">Voltage</label>
                                <select
                                  value={currentPart.technicalSpecs?.voltage || ''}
                                  onChange={(e) => setCurrentPart({
                                    ...currentPart,
                                    technicalSpecs: {
                                      ...currentPart.technicalSpecs,
                                      voltage: e.target.value || undefined
                                    }
                                  })}
                                  className="mt-1 block w-full border-slate-300 rounded text-sm p-1.5 border"
                                >
                                  <option value="">--</option>
                                  {filterConfig?.groups
                                    .find(g => g.id === 'VOLTAGE' || g.id === 'voltage')?.fields[0]?.options.map(opt => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                              </div>
                            </div>
                          </div>
                       </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      
                      {/* DC Isolated Switch */}
                      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-800 mb-3 border-b pb-2">DC Isolated Switch</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-500">DC Isolated Switch</label>
                            <div className="flex gap-2 mt-1">
                              <select
                                value={currentPart.dcIsolatedSwitch || ''}
                                onChange={(e) => setCurrentPart({
                                  ...currentPart,
                                  dcIsolatedSwitch: e.target.value || undefined
                                })}
                                className="flex-1 border-slate-300 rounded text-sm p-1.5 border"
                              >
                                <option value="">--</option>
                                {components.filter(c => c.category === 'DC Isolated Switch').map(comp => (
                                  <option key={comp.id} value={comp.name}>
                                    {comp.name} - {comp.specifications}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                min="0"
                                value={currentPart.dcIsolatedSwitchQty || 1}
                                onChange={(e) => setCurrentPart({
                                  ...currentPart,
                                  dcIsolatedSwitchQty: parseInt(e.target.value) || 1
                                })}
                                className="w-16 border-slate-300 rounded text-sm p-1.5 border text-center"
                                placeholder="Qty"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AC Isolated Switch */}
                      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-800 mb-3 border-b pb-2">AC Isolated Switch</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-500">AC Isolated Switch</label>
                            <div className="flex gap-2 mt-1">
                              <select
                                value={currentPart.acIsolatedSwitch || ''}
                                onChange={(e) => setCurrentPart({
                                  ...currentPart,
                                  acIsolatedSwitch: e.target.value || undefined
                                })}
                                className="flex-1 border-slate-300 rounded text-sm p-1.5 border"
                              >
                                <option value="">--</option>
                                {components.filter(c => c.category === 'AC Isolated Switch').map(comp => (
                                  <option key={comp.id} value={comp.name}>
                                    {comp.name} - {comp.specifications}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                min="0"
                                value={currentPart.acIsolatedSwitchQty || 1}
                                onChange={(e) => setCurrentPart({
                                  ...currentPart,
                                  acIsolatedSwitchQty: parseInt(e.target.value) || 1
                                })}
                                className="w-16 border-slate-300 rounded text-sm p-1.5 border text-center"
                                placeholder="Qty"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* SPD */}
                      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-800 mb-3 border-b pb-2">SPD</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-500">SPD</label>
                            <div className="flex gap-2 mt-1">
                              <select
                                value={currentPart.spd || ''}
                                onChange={(e) => setCurrentPart({
                                  ...currentPart,
                                  spd: e.target.value || undefined
                                })}
                                className="flex-1 border-slate-300 rounded text-sm p-1.5 border"
                              >
                                <option value="">--</option>
                                {components.filter(c => c.category === 'DC SPD' || c.category === 'AC SPD').map(comp => (
                                  <option key={comp.id} value={comp.name}>
                                    {comp.name} ({comp.category}) - {comp.specifications}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                min="0"
                                value={currentPart.spdQty || 1}
                                onChange={(e) => setCurrentPart({
                                  ...currentPart,
                                  spdQty: parseInt(e.target.value) || 1
                                })}
                                className="w-16 border-slate-300 rounded text-sm p-1.5 border text-center"
                                placeholder="Qty"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* DC MCB */}
                      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-800 mb-3 border-b pb-2">DC MCB</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-500">DC MCB</label>
                            <div className="flex gap-2 mt-1">
                              <select
                                value={currentPart.dcMcb || ''}
                                onChange={(e) => setCurrentPart({
                                  ...currentPart,
                                  dcMcb: e.target.value || undefined
                                })}
                                className="flex-1 border-slate-300 rounded text-sm p-1.5 border"
                              >
                                <option value="">--</option>
                                {components.filter(c => c.category === 'DC MCB').map(comp => (
                                  <option key={comp.id} value={comp.name}>
                                    {comp.name} - {comp.specifications}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                min="0"
                                value={currentPart.dcMcbQty || 1}
                                onChange={(e) => setCurrentPart({
                                  ...currentPart,
                                  dcMcbQty: parseInt(e.target.value) || 1
                                })}
                                className="w-16 border-slate-300 rounded text-sm p-1.5 border text-center"
                                placeholder="Qty"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AC MCB */}
                      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-800 mb-3 border-b pb-2">AC MCB</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-500">AC MCB</label>
                            <div className="flex gap-2 mt-1">
                              <select
                                value={currentPart.acMcb || ''}
                                onChange={(e) => setCurrentPart({
                                  ...currentPart,
                                  acMcb: e.target.value || undefined
                                })}
                                className="flex-1 border-slate-300 rounded text-sm p-1.5 border"
                              >
                                <option value="">--</option>
                                {components.filter(c => c.category === 'AC MCB').map(comp => (
                                  <option key={comp.id} value={comp.name}>
                                    {comp.name} - {comp.specifications}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                min="0"
                                value={currentPart.acMcbQty || 1}
                                onChange={(e) => setCurrentPart({
                                  ...currentPart,
                                  acMcbQty: parseInt(e.target.value) || 1
                                })}
                                className="w-16 border-slate-300 rounded text-sm p-1.5 border text-center"
                                placeholder="Qty"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* DC Fuse */}
                      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-800 mb-3 border-b pb-2">DC Fuse</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-500">DC Fuse</label>
                            <div className="flex gap-2 mt-1">
                              <select
                                value={currentPart.dcFuse || ''}
                                onChange={(e) => setCurrentPart({
                                  ...currentPart,
                                  dcFuse: e.target.value || undefined
                                })}
                                className="flex-1 border-slate-300 rounded text-sm p-1.5 border"
                              >
                                <option value="">--</option>
                                {components.filter(c => c.category === 'DC Fuse').map(comp => (
                                  <option key={comp.id} value={comp.name}>
                                    {comp.name} - {comp.specifications}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                min="0"
                                value={currentPart.dcFuseQty || 1}
                                onChange={(e) => setCurrentPart({
                                  ...currentPart,
                                  dcFuseQty: parseInt(e.target.value) || 1
                                })}
                                className="w-16 border-slate-300 rounded text-sm p-1.5 border text-center"
                                placeholder="Qty"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AC Fuse */}
                      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-800 mb-3 border-b pb-2">AC Fuse</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-500">AC Fuse</label>
                            <div className="flex gap-2 mt-1">
                              <select
                                value={currentPart.acFuse || ''}
                                onChange={(e) => setCurrentPart({
                                  ...currentPart,
                                  acFuse: e.target.value || undefined
                                })}
                                className="flex-1 border-slate-300 rounded text-sm p-1.5 border"
                              >
                                <option value="">--</option>
                                {components.filter(c => c.category === 'AC Fuse').map(comp => (
                                  <option key={comp.id} value={comp.name}>
                                    {comp.name} - {comp.specifications}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                min="0"
                                value={currentPart.acFuseQty || 1}
                                onChange={(e) => setCurrentPart({
                                  ...currentPart,
                                  acFuseQty: parseInt(e.target.value) || 1
                                })}
                                className="w-16 border-slate-300 rounded text-sm p-1.5 border text-center"
                                placeholder="Qty"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* DC Fuse Holder */}
                      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-800 mb-3 border-b pb-2">DC Fuse Holder</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-500">DC Fuse Holder</label>
                            <div className="flex gap-2 mt-1">
                              <select
                                value={currentPart.dcFuseHolder || ''}
                                onChange={(e) => setCurrentPart({
                                  ...currentPart,
                                  dcFuseHolder: e.target.value || undefined
                                })}
                                className="flex-1 border-slate-300 rounded text-sm p-1.5 border"
                              >
                                <option value="">--</option>
                                {components.filter(c => c.category === 'DC Fuse Holder').map(comp => (
                                  <option key={comp.id} value={comp.name}>
                                    {comp.name} - {comp.specifications}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                min="0"
                                value={currentPart.dcFuseHolderQty || 1}
                                onChange={(e) => setCurrentPart({
                                  ...currentPart,
                                  dcFuseHolderQty: parseInt(e.target.value) || 1
                                })}
                                className="w-16 border-slate-300 rounded text-sm p-1.5 border text-center"
                                placeholder="Qty"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AC Fuse Holder */}
                      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-800 mb-3 border-b pb-2">AC Fuse Holder</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-500">AC Fuse Holder</label>
                            <div className="flex gap-2 mt-1">
                              <select
                                value={currentPart.acFuseHolder || ''}
                                onChange={(e) => setCurrentPart({
                                  ...currentPart,
                                  acFuseHolder: e.target.value || undefined
                                })}
                                className="flex-1 border-slate-300 rounded text-sm p-1.5 border"
                              >
                                <option value="">--</option>
                                {components.filter(c => c.category === 'AC Fuse Holder').map(comp => (
                                  <option key={comp.id} value={comp.name}>
                                    {comp.name} - {comp.specifications}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                min="0"
                                value={currentPart.acFuseHolderQty || 1}
                                onChange={(e) => setCurrentPart({
                                  ...currentPart,
                                  acFuseHolderQty: parseInt(e.target.value) || 1
                                })}
                                className="w-16 border-slate-300 rounded text-sm p-1.5 border text-center"
                                placeholder="Qty"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* RCCD */}
                      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-800 mb-3 border-b pb-2">RCCD</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-500">RCCD</label>
                            <div className="flex gap-2 mt-1">
                              <select
                                value={currentPart.rccd || ''}
                                onChange={(e) => setCurrentPart({
                                  ...currentPart,
                                  rccd: e.target.value || undefined
                                })}
                                className="flex-1 border-slate-300 rounded text-sm p-1.5 border"
                              >
                                <option value="">--</option>
                                {components.filter(c => c.category === 'RCCD').map(comp => (
                                  <option key={comp.id} value={comp.name}>
                                    {comp.name} - {comp.specifications}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                min="0"
                                value={currentPart.rccdQty || 1}
                                onChange={(e) => setCurrentPart({
                                  ...currentPart,
                                  rccdQty: parseInt(e.target.value) || 1
                                })}
                                className="w-16 border-slate-300 rounded text-sm p-1.5 border text-center"
                                placeholder="Qty"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* RCBO */}
                      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-800 mb-3 border-b pb-2">RCBO</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-500">RCBO</label>
                            <div className="flex gap-2 mt-1">
                              <select
                                value={currentPart.rcbo || ''}
                                onChange={(e) => setCurrentPart({
                                  ...currentPart,
                                  rcbo: e.target.value || undefined
                                })}
                                className="flex-1 border-slate-300 rounded text-sm p-1.5 border"
                              >
                                <option value="">--</option>
                                {components.filter(c => c.category === 'RCBO').map(comp => (
                                  <option key={comp.id} value={comp.name}>
                                    {comp.name} - {comp.specifications}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                min="0"
                                value={currentPart.rcboQty || 1}
                                onChange={(e) => setCurrentPart({
                                  ...currentPart,
                                  rcboQty: parseInt(e.target.value) || 1
                                })}
                                className="w-16 border-slate-300 rounded text-sm p-1.5 border text-center"
                                placeholder="Qty"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Enclosure Type */}
                      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-800 mb-3 border-b pb-2">Enclosure Type</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-500">Enclosure Type</label>
                            <div className="flex gap-2 mt-1">
                              <select
                                value={currentPart.enclosureType || ''}
                                onChange={(e) => setCurrentPart({
                                  ...currentPart,
                                  enclosureType: e.target.value || undefined
                                })}
                                className="flex-1 border-slate-300 rounded text-sm p-1.5 border"
                              >
                                <option value="">--</option>
                                {components.filter(c => c.category === 'Enclosure Type').map(comp => (
                                  <option key={comp.id} value={comp.name}>
                                    {comp.name} - {comp.specifications}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                min="0"
                                value={currentPart.enclosureTypeQty || 1}
                                onChange={(e) => setCurrentPart({
                                  ...currentPart,
                                  enclosureTypeQty: parseInt(e.target.value) || 1
                                })}
                                className="w-16 border-slate-300 rounded text-sm p-1.5 border text-center"
                                placeholder="Qty"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Additional Material Section */}
                      <div className="md:col-span-2 lg:col-span-3 bg-green-50 p-6 rounded-lg border-2 border-green-200">
                        <h4 className="font-bold text-slate-800 mb-4 text-base flex items-center">
                          <Package className="w-5 h-5 mr-2 text-green-600" />
                          Additional Material
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Terminal Block */}
                          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                            <h4 className="font-bold text-slate-800 mb-3 border-b pb-2">Terminal Block</h4>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-slate-500">Terminal Block / 接线端子</label>
                                <div className="flex gap-2 mt-1">
                                  <select
                                    value={currentPart.terminalBlock || ''}
                                    onChange={(e) => setCurrentPart({
                                      ...currentPart,
                                      terminalBlock: e.target.value || undefined
                                    })}
                                    className="flex-1 border-slate-300 rounded text-sm p-1.5 border"
                                  >
                                    <option value="">--</option>
                                    {components.filter(c => c.category === 'Terminal Block').map(comp => (
                                      <option key={comp.id} value={comp.name}>
                                        {comp.name} - {comp.specifications}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    type="number"
                                    min="0"
                                    value={currentPart.terminalBlockQty || 1}
                                    onChange={(e) => setCurrentPart({
                                      ...currentPart,
                                      terminalBlockQty: parseInt(e.target.value) || 1
                                    })}
                                    className="w-16 border-slate-300 rounded text-sm p-1.5 border text-center"
                                    placeholder="Qty"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Cable Gland */}
                          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                            <h4 className="font-bold text-slate-800 mb-3 border-b pb-2">Cable Gland</h4>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-slate-500">Cable Gland / 格兰头</label>
                                <div className="flex gap-2 mt-1">
                                  <select
                                    value={currentPart.cableGland || ''}
                                    onChange={(e) => setCurrentPart({
                                      ...currentPart,
                                      cableGland: e.target.value || undefined
                                    })}
                                    className="flex-1 border-slate-300 rounded text-sm p-1.5 border"
                                  >
                                    <option value="">--</option>
                                    {components.filter(c => c.category === 'Cable Gland').map(comp => (
                                      <option key={comp.id} value={comp.name}>
                                        {comp.name} - {comp.specifications}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    type="number"
                                    min="0"
                                    value={currentPart.cableGlandQty || 1}
                                    onChange={(e) => setCurrentPart({
                                      ...currentPart,
                                      cableGlandQty: parseInt(e.target.value) || 1
                                    })}
                                    className="w-16 border-slate-300 rounded text-sm p-1.5 border text-center"
                                    placeholder="Qty"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* MC4 */}
                          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                            <h4 className="font-bold text-slate-800 mb-3 border-b pb-2">MC4</h4>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-slate-500">MC4 / MC4</label>
                                <div className="flex gap-2 mt-1">
                                  <select
                                    value={currentPart.mc4 || ''}
                                    onChange={(e) => setCurrentPart({
                                      ...currentPart,
                                      mc4: e.target.value || undefined
                                    })}
                                    className="flex-1 border-slate-300 rounded text-sm p-1.5 border"
                                  >
                                    <option value="">--</option>
                                    {components.filter(c => c.category === 'MC4').map(comp => (
                                      <option key={comp.id} value={comp.name}>
                                        {comp.name} - {comp.specifications}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    type="number"
                                    min="0"
                                    value={currentPart.mc4Qty || 1}
                                    onChange={(e) => setCurrentPart({
                                      ...currentPart,
                                      mc4Qty: parseInt(e.target.value) || 1
                                    })}
                                    className="w-16 border-slate-300 rounded text-sm p-1.5 border text-center"
                                    placeholder="Qty"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Product Drawings Section */}
                      <div className="md:col-span-2 lg:col-span-3 bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
                        <h4 className="font-bold text-slate-800 mb-4 text-base flex items-center">
                          <FileText className="w-5 h-5 mr-2 text-blue-600" />
                          Product Drawings
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          
                          {/* Circuit Diagram */}
                          <div className="bg-white p-4 rounded-lg border border-slate-200">
                            <label className="block text-sm font-medium text-slate-700 mb-2">原理线路图</label>
                            <div className="space-y-2">
                              {currentPart.circuitDiagram && (
                                <div className="relative w-full h-40 bg-slate-100 rounded border border-slate-200 overflow-hidden">
                                  <img 
                                    src={currentPart.circuitDiagram} 
                                    alt="Circuit Diagram" 
                                    className="w-full h-full object-contain"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setCurrentPart({...currentPart, circuitDiagram: undefined})}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  try {
                                    const compressedBase64 = await compressImage(file);
                                    setCurrentPart(prev => ({ ...prev, circuitDiagram: compressedBase64 }));
                                  } catch (error) {
                                    console.error('Image compression error:', error);
                                    alert('图片处理失败，请重试');
                                  }
                                }}
                                className="block w-full text-xs text-slate-500
                                  file:mr-3 file:py-2 file:px-3
                                  file:rounded-md file:border-0
                                  file:text-xs file:font-semibold
                                  file:bg-blue-50 file:text-blue-700
                                  hover:file:bg-blue-100"
                              />
                            </div>
                          </div>

                          {/* Product Dimensions */}
                          <div className="bg-white p-4 rounded-lg border border-slate-200">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Product Dimension Drawing</label>
                            <div className="space-y-2">
                              {currentPart.productDimensions && (
                                <div className="relative w-full h-40 bg-slate-100 rounded border border-slate-200 overflow-hidden">
                                  <img 
                                    src={currentPart.productDimensions} 
                                    alt="Product Dimensions" 
                                    className="w-full h-full object-contain"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setCurrentPart({...currentPart, productDimensions: undefined})}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  try {
                                    const compressedBase64 = await compressImage(file);
                                    setCurrentPart(prev => ({ ...prev, productDimensions: compressedBase64 }));
                                  } catch (error) {
                                    console.error('Image compression error:', error);
                                    alert('图片处理失败，请重试');
                                  }
                                }}
                                className="block w-full text-xs text-slate-500
                                  file:mr-3 file:py-2 file:px-3
                                  file:rounded-md file:border-0
                                  file:text-xs file:font-semibold
                                  file:bg-blue-50 file:text-blue-700
                                  hover:file:bg-blue-100"
                              />
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  )}

                </div>
                
                {/* Modal Footer */}
                <div className="bg-slate-50 px-6 py-4 flex flex-row-reverse border-t border-slate-200">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto sm:text-sm">
                    <Save className="w-4 h-4 mr-2" />
                    Save Product
                  </button>
                  <button type="button" onClick={() => setIsEditing(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Filter Settings Modal */}
      {isFilterSettingsOpen && filterConfig && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity"
              onClick={() => setIsFilterSettingsOpen(false)}
            ></div>
            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full">
              <form onSubmit={handleSaveFilterConfig} className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-slate-900">Filter Settings</h3>
                  <button type="button" onClick={() => setIsFilterSettingsOpen(false)}>
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {filterSaveError && (
                  <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 text-sm text-red-700">
                    {filterSaveError}
                  </div>
                )}

                {/* Group name editing */}
                <div className="mb-6 border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <h4 className="text-sm font-semibold text-slate-800 mb-3">Groups</h4>
                  <div className="space-y-2 mb-3">
                    {filterConfig.groups.map((group, idx) => (
                      <div key={group.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                        <span className="text-xs uppercase text-slate-400">ID: {group.id}</span>
                        <input
                          type="text"
                          className="border border-slate-300 rounded px-2 py-1 text-xs w-full"
                          value={group.label}
                          onChange={e => updateGroupLabel(idx, e.target.value)}
                        />
                        {idx > 2 && (
                          <button
                            type="button"
                            onClick={() => removeFilterGroup(idx)}
                            className="text-[11px] text-red-500 hover:text-red-700 px-2 py-1"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addFilterGroup}
                    className="mt-1 inline-flex items-center px-2.5 py-1.5 rounded border border-dashed border-slate-300 text-[11px] text-slate-600 hover:border-slate-400 hover:text-slate-800"
                  >
                    + Add group
                  </button>
                </div>

                <div className="space-y-6">
                  {filterConfig.groups.map(group => (
                      <div key={group.id}>
                        <h4 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                          {group.label}
                        </h4>
                        <div className="space-y-3 mb-2">
                          {group.fields.map((field, fieldIndex) => (
                            <div key={field.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                              <div className="flex items-center justify-between mb-3 gap-3">
                                <div className="flex-1">
                                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Field label</label>
                                  <input
                                    type="text"
                                    className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                                    value={field.label}
                                    onChange={e => {
                                      if (!filterConfig) return;
                                      const newConfig: FilterConfig = {
                                        ...filterConfig,
                                        groups: filterConfig.groups.map(g => {
                                          if (g.id !== group.id) return g;
                                          return {
                                            ...g,
                                            fields: g.fields.map((f, idx) =>
                                              idx === fieldIndex ? { ...f, label: e.target.value } : f
                                            )
                                          };
                                        })
                                      };
                                      setFilterConfig(newConfig);
                                    }}
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => addFilterFieldOption(field.id)}
                                  className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                                >
                                  + Add option
                                </button>
                              </div>
                              <div className="space-y-2">
                                {field.options.map((opt, index) => (
                                  <div
                                    key={index}
                                    className="grid grid-cols-[1.5fr_2fr_auto] gap-2 items-center"
                                  >
                                    <input
                                      type="text"
                                      className="border border-slate-300 rounded px-2 py-1 text-xs"
                                      placeholder="Value (stored on part)"
                                      value={opt.value}
                                      onChange={e =>
                                        updateFilterFieldOptionValue(field.id, index, e.target.value)
                                      }
                                    />
                                    <input
                                      type="text"
                                      className="border border-slate-300 rounded px-2 py-1 text-xs"
                                      placeholder="Label (shown in UI)"
                                      value={opt.label}
                                      onChange={e =>
                                        updateFilterFieldOptionLabel(field.id, index, e.target.value)
                                      }
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeFilterFieldOption(field.id, index)}
                                      className="text-xs text-red-500 hover:text-red-700 px-2 py-1"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                                {field.options.length === 0 && (
                                  <p className="text-xs text-slate-400 italic">
                                    No options yet. Click "Add option" to create one.
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addFilterField(group.id)}
                            className="inline-flex items-center px-2.5 py-1.5 rounded border border-dashed border-slate-300 text-[11px] text-slate-600 hover:border-slate-400 hover:text-slate-800"
                          >
                            + Add field
                          </button>
                        </div>
                      </div>
                    ))}
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFilterSettingsOpen(false)}
                    className="px-4 py-2 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Save Filters
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};