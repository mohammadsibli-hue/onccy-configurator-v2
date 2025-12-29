import { Part, AppSettings, FilterConfig, Component, Supplier } from '../types';

const STORAGE_KEY = 'switchcraft_db_v3';
const SETTINGS_KEY = 'switchcraft_settings_v1';
const FILTER_CONFIG_KEY = 'switchcraft_filters_v4';
const COMPONENTS_KEY = 'switchcraft_components_v1';
const SUPPLIERS_KEY = 'switchcraft_suppliers_v1';

// Initial Mock Data matching the new schema
const INITIAL_DATA: Part[] = [
  {
    id: 'p1',
    name: 'Tactile pushbutton HQ Round',
    rubric: 'Pushbutton',
    series: 'HQ',
    description: 'High-quality tactile pushbutton for modern control panels.',
    imageUrl: 'https://picsum.photos/seed/hq_push/300/300',
    technicalSpecs: {
      mountingHole: '22MM',
      protectionClass: 'IP65',
      illumination: 'YES',
      ringIllumination: 'YES'
    },
    availableContactTypes: ['1NO', '2NO', '1NC+1NO'],
    connectionMaterial: 'AgNi',
    shape: 'Round',
    colorFrontBezel: 'Black',
    connectionType: 'Screw connection',
    switchingFunction: 'Momentary function',
    availableColors: ['#red', '#green', '#blue'],
    colorImages: {},
    variantCount: 45,
    modelUrl: undefined
  },
  {
    id: 'p2',
    name: 'Selector Switch SD22 Square',
    rubric: 'Selector button',
    series: 'SD22',
    description: 'Robust selector switch with square design.',
    imageUrl: 'https://picsum.photos/seed/sd22_sel/300/300',
    technicalSpecs: {
      mountingHole: '22MM',
      protectionClass: 'IP65',
      illumination: 'NO',
      ringIllumination: 'NO'
    },
    availableContactTypes: ['1NO', '1NC'],
    connectionMaterial: 'Gold-plated',
    shape: 'Square',
    colorFrontBezel: 'Silver',
    connectionType: 'Solder Pin',
    switchingFunction: 'Latching function',
    availableColors: ['#black'],
    colorImages: {},
    variantCount: 12,
    modelUrl: undefined
  },
  {
    id: 'p3',
    name: 'E-Stop SS22',
    rubric: 'E-stop',
    series: 'SS22',
    description: 'Emergency stop maintained switch.',
    imageUrl: 'https://picsum.photos/seed/estop/300/300',
    technicalSpecs: {
      mountingHole: '22MM',
      protectionClass: 'IP65',
      illumination: 'YES',
      ringIllumination: 'NO'
    },
    availableContactTypes: ['2NC', '2NC+1NO'],
    connectionMaterial: 'AgNi',
    shape: 'Round',
    colorFrontBezel: 'Yellow',
    connectionType: 'Push-In',
    switchingFunction: 'Twist',
    availableColors: ['#red'],
    colorImages: {},
    variantCount: 5,
    modelUrl: undefined
  },
  {
    id: 'p4',
    name: 'Key Switch HQ',
    rubric: 'Key switch',
    series: 'HQ',
    description: 'Secure key switch with rounded square shape.',
    imageUrl: 'https://picsum.photos/seed/key_hq/300/300',
    technicalSpecs: {
      mountingHole: '22MM',
      protectionClass: 'IP40',
      illumination: 'NO',
      ringIllumination: 'NO'
    },
    availableContactTypes: ['1NO', '1NC+1NO'],
    connectionMaterial: 'AgNi',
    shape: 'Rounded square',
    colorFrontBezel: 'Stainless steel',
    connectionType: 'Screw connection',
    switchingFunction: 'Latching function',
    availableColors: ['#black'],
    colorImages: {},
    variantCount: 8,
    modelUrl: undefined
  },
  {
    id: 'p5',
    name: 'Buzzer SD22',
    rubric: 'Buzzer',
    series: 'SD22',
    description: 'Acoustic signal device.',
    imageUrl: 'https://picsum.photos/seed/buzzer/300/300',
    technicalSpecs: {
      mountingHole: '22MM',
      protectionClass: 'IP65',
      illumination: 'NO',
      ringIllumination: 'NO'
    },
    availableContactTypes: [],
    connectionMaterial: 'AgNi',
    shape: 'Round',
    colorFrontBezel: 'Black',
    connectionType: 'Solder Pin',
    switchingFunction: 'Momentary function',
    availableColors: ['#black'],
    colorImages: {},
    variantCount: 1,
    modelUrl: undefined
  }
];

const DEFAULT_SETTINGS: AppSettings = {
  heroImageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=2670',
  heroTitle: 'PRODUCT CONFIGURATOR',
  heroSubtitle: '24/7 - find the right solution for your requirements at any time.',
  logoUrl: '',
  companyName: 'KINRED'
};

const DEFAULT_FILTER_CONFIG: FilterConfig = {
  groups: [
    // CATEGORY group
    {
      id: 'category',
      label: 'CATEGORY',
      fields: [
        {
          id: 'categoryType',
          label: 'Combiner Type',
          partField: 'categoryType',
          options: ['DC Combiner Box', 'AC Combiner Box'].map(v => ({ value: v, label: v }))
        }
      ]
    },

    // STRING group
    {
      id: 'string',
      label: 'STRING',
      fields: [
        {
          id: 'inputString',
          label: 'Input String',
          partField: 'inputString',
          options: ['1', '2', '3', '4', '5', '6'].map(v => ({ value: v, label: v }))
        },
        {
          id: 'outputString',
          label: 'Output String',
          partField: 'outputString',
          options: ['1', '2', '3', '4', '5', '6'].map(v => ({ value: v, label: v }))
        }
      ]
    },

    // VOLTAGE group
    {
      id: 'voltage',
      label: 'VOLTAGE',
      fields: [
        {
          id: 'voltage',
          label: 'VOLTAGE',
          partField: 'technicalSpecs',
          subField: 'voltage',
          options: ['600VDC', '1000VDC', '1500VDC'].map(v => ({ value: v, label: v }))
        }
      ]
    }
  ]
};

export const StorageService = {
  init: () => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
      }
      if (!localStorage.getItem(SETTINGS_KEY)) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
      }
      if (!localStorage.getItem(FILTER_CONFIG_KEY)) {
        localStorage.setItem(FILTER_CONFIG_KEY, JSON.stringify(DEFAULT_FILTER_CONFIG));
      }
    } catch (e) {
      console.error("Storage initialization failed:", e);
    }
  },

  getAllParts: (): Part[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to retrieve parts:", e);
      return [];
    }
  },

  savePart: (part: Part) => {
    try {
      const parts = StorageService.getAllParts();
      const existingIndex = parts.findIndex(p => p.id === part.id);
      
      if (existingIndex >= 0) {
        parts[existingIndex] = part;
      } else {
        parts.push(part);
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parts));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        throw new Error("Storage full! The image/model files are too large. Please delete some products or use smaller files.");
      }
      throw e;
    }
  },

  deletePart: (id: string) => {
    try {
      const parts = StorageService.getAllParts();
      const newParts = parts.filter(p => p.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newParts));
    } catch (e) {
       console.error("Failed to delete part:", e);
       alert("Failed to delete part due to storage error.");
    }
  },

  getSettings: (): AppSettings => {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      return data ? JSON.parse(data) : DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings: (settings: AppSettings) => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e: any) {
       if (e.name === 'QuotaExceededError' || e.code === 22) {
        throw new Error("Storage full! Image is too large.");
      }
      throw e;
    }
  },

  getFilterConfig: (): FilterConfig => {
    try {
      const data = localStorage.getItem(FILTER_CONFIG_KEY);
      return data ? JSON.parse(data) : DEFAULT_FILTER_CONFIG;
    } catch (e) {
      console.error('Failed to retrieve filter config:', e);
      return DEFAULT_FILTER_CONFIG;
    }
  },

  saveFilterConfig: (config: FilterConfig) => {
    try {
      localStorage.setItem(FILTER_CONFIG_KEY, JSON.stringify(config));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        throw new Error('Storage full! Filter configuration is too large.');
      }
      throw e;
    }
  },

  // Component Management
  getAllComponents: (): Component[] => {
    try {
      const data = localStorage.getItem(COMPONENTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to retrieve components:', e);
      return [];
    }
  },

  saveComponent: (component: Component) => {
    try {
      const components = StorageService.getAllComponents();
      const existingIndex = components.findIndex(c => c.id === component.id);
      
      if (existingIndex >= 0) {
        components[existingIndex] = component;
      } else {
        components.push(component);
      }
      
      localStorage.setItem(COMPONENTS_KEY, JSON.stringify(components));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        throw new Error('Storage full! Cannot save component.');
      }
      throw e;
    }
  },

  deleteComponent: (id: string) => {
    try {
      const components = StorageService.getAllComponents();
      const newComponents = components.filter(c => c.id !== id);
      localStorage.setItem(COMPONENTS_KEY, JSON.stringify(newComponents));
    } catch (e) {
      console.error('Failed to delete component:', e);
      alert('Failed to delete component due to storage error.');
    }
  },

  importComponents: (components: Component[]) => {
    try {
      const existing = StorageService.getAllComponents();
      const merged = [...existing];
      
      components.forEach(newComp => {
        const existingIndex = merged.findIndex(c => c.id === newComp.id);
        if (existingIndex >= 0) {
          merged[existingIndex] = newComp;
        } else {
          merged.push(newComp);
        }
      });
      
      localStorage.setItem(COMPONENTS_KEY, JSON.stringify(merged));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        throw new Error('Storage full! Cannot import components.');
      }
      throw e;
    }
  },

  // Supplier Management
  getAllSuppliers: (): Supplier[] => {
    try {
      const data = localStorage.getItem(SUPPLIERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to retrieve suppliers:', e);
      return [];
    }
  },

  saveSupplier: (supplier: Supplier) => {
    try {
      const suppliers = StorageService.getAllSuppliers();
      const existingIndex = suppliers.findIndex(s => s.id === supplier.id);
      
      if (existingIndex >= 0) {
        suppliers[existingIndex] = { ...supplier, updatedAt: new Date().toISOString() };
      } else {
        suppliers.push({
          ...supplier,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(suppliers));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        throw new Error('Storage full! Cannot save supplier.');
      }
      throw e;
    }
  },

  deleteSupplier: (id: string) => {
    try {
      const suppliers = StorageService.getAllSuppliers();
      const newSuppliers = suppliers.filter(s => s.id !== id);
      localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(newSuppliers));
    } catch (e) {
      console.error('Failed to delete supplier:', e);
      alert('Failed to delete supplier due to storage error.');
    }
  },

  getSupplierById: (id: string): Supplier | undefined => {
    const suppliers = StorageService.getAllSuppliers();
    return suppliers.find(s => s.id === id);
  },

  // Database Backup & Restore
  exportAllData: () => {
    try {
      const data = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        parts: StorageService.getAllParts(),
        components: StorageService.getAllComponents(),
        suppliers: StorageService.getAllSuppliers(),
        settings: StorageService.getSettings(),
        filterConfig: StorageService.getFilterConfig()
      };
      return data;
    } catch (e) {
      console.error('Failed to export data:', e);
      throw new Error('Failed to export data');
    }
  },

  importAllData: (data: any) => {
    try {
      // Validate data structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format');
      }

      // Import parts
      if (data.parts && Array.isArray(data.parts)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.parts));
      }

      // Import components
      if (data.components && Array.isArray(data.components)) {
        localStorage.setItem(COMPONENTS_KEY, JSON.stringify(data.components));
      }

      // Import suppliers
      if (data.suppliers && Array.isArray(data.suppliers)) {
        localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(data.suppliers));
      }

      // Import settings
      if (data.settings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
      }

      // Import filter config
      if (data.filterConfig) {
        localStorage.setItem(FILTER_CONFIG_KEY, JSON.stringify(data.filterConfig));
      }

      return true;
    } catch (e: any) {
      console.error('Failed to import data:', e);
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        throw new Error('Storage full! Cannot import data.');
      }
      throw new Error('Failed to import data: ' + e.message);
    }
  },

  downloadBackup: () => {
    try {
      const data = StorageService.exportAllData();
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `onccy_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download backup:', e);
      throw new Error('Failed to download backup');
    }
  },

  clearAllData: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(COMPONENTS_KEY);
      localStorage.removeItem(SETTINGS_KEY);
      localStorage.removeItem(FILTER_CONFIG_KEY);
    } catch (e) {
      console.error('Failed to clear data:', e);
      throw new Error('Failed to clear data');
    }
  }
};
