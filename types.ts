

export enum PartCategory {
  BASE = 'Base Unit',
  ACTUATOR = 'Actuator Head',
  BEZEL = 'Bezel / Ring',
  LENS = 'Lens / Cap',
  CONTACT = 'Contact Block'
}

export interface TechnicalSpecs {
  mountingHole?: string; // e.g., "22MM"
  protectionClass?: string; // e.g., "IP65"
  illumination?: string; // "YES" | "NO"
  ringIllumination?: string; // "YES" | "NO"
  voltage?: string;
  material?: string;
}

export interface Part {
  id: string;
  name: string;
  description: string;
  price?: number; // Made optional as per request
  imageUrl: string;
  
  // Classification
  rubric: string; // e.g., "Pushbutton", "Selector button"
  series: string; // e.g., "HQ", "SD22", "SS22"

  // New high-level classification for combiner boxes
  categoryType?: string; // e.g., "DC Combiner Box" | "AC Combiner Box"

  // String configuration (for DC/AC combiner boxes)
  inputString?: string;  // e.g., "1"-"6"
  outputString?: string; // e.g., "1"-"6"
  
  // Additional technical data fields for combiner boxes
  dcIsolatedSwitch?: string;
  acIsolatedSwitch?: string;
  spd?: string;
  dcMcb?: string;
  acMcb?: string;
  dcFuse?: string;
  acFuse?: string;
  dcFuseHolder?: string;
  acFuseHolder?: string;
  rccd?: string;
  rcbo?: string;
  enclosureType?: string;
  
  // Component quantities
  dcIsolatedSwitchQty?: number;
  acIsolatedSwitchQty?: number;
  spdQty?: number;
  dcMcbQty?: number;
  acMcbQty?: number;
  dcFuseQty?: number;
  acFuseQty?: number;
  dcFuseHolderQty?: number;
  acFuseHolderQty?: number;
  rccdQty?: number;
  rcboQty?: number;
  enclosureTypeQty?: number;
  
  // Additional materials (component selection like RCBO)
  terminalBlock?: string; // 接线端子 - component name
  terminalBlockQty?: number;
  cableGland?: string; // 格兰头 - component name
  cableGlandQty?: number;
  mc4?: string; // MC4 - component name
  mc4Qty?: number;
  
  // Product drawings
  circuitDiagram?: string; // Circuit diagram image (base64)
  productDimensions?: string; // Product dimensions image (base64)
  
  // Contacts Group
  availableContactTypes: string[]; // e.g., ["1NO", "1NC", "2NC+2NO"]
  connectionMaterial?: string; // e.g., "AgNi", "Gold-plated"
  
  // Design Group
  shape?: string; // e.g., "Round", "Square"
  colorFrontBezel?: string; // e.g., "Black", "Silver"
  
  // Mechanical Group
  connectionType?: string; // e.g., "Screw connection"
  switchingFunction?: string; // e.g., "Latching function"

  // General Data
  technicalSpecs: TechnicalSpecs;
  
  // Legacy support or extra
  availableColors: string[]; 
  colorImages?: Record<string, string>; // Map of Color Name -> Image URL
  variantCount?: number; 
  
  // 3D Model
  modelUrl?: string; // Base64 encoded GLB/GLTF model
}

export interface User {
  username: string;
  role: 'admin' | 'product_manager' | 'marketing';
}

export interface AppSettings {
  heroImageUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  logoUrl?: string; // optional configurable logo (stored as base64 or URL)
  companyName?: string; // optional configurable company name
}

// Configurable filters (used by Configurator sidebar and Admin filter settings)
export interface FilterOptionConfig {
  value: string;   // actual value stored on Part (e.g. 'Pushbutton')
  label: string;   // display label (currently English only)
}

export interface FilterFieldConfig {
  id: string;             // e.g. 'rubric' | 'series'
  label: string;          // e.g. 'Rubric'
  partField: string;      // e.g. 'rubric' | 'series'
  subField?: string;      // e.g. 'protectionClass' inside technicalSpecs
  isList?: boolean;       // whether Part[field] is an array
  options: FilterOptionConfig[];
}

export interface FilterGroupConfig {
  id: string;             // e.g. 'category'
  label: string;          // e.g. 'Category'
  fields: FilterFieldConfig[];
}

export interface FilterConfig {
  groups: FilterGroupConfig[];
}

// Supplier (供应商)
export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  notes?: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// Component (元器件) - separate from Part
export interface Component {
  id: string;
  name: string;
  category: string; // e.g., "Isolated Switch", "SPD", "MCB", etc.
  specifications: string; // e.g., "16A", "Type 1+2", "30mA"
  manufacturer?: string;
  supplierId?: string; // Link to supplier
  model?: string;
  description?: string;
  imageUrl?: string;
  purchasePrice?: number; // Purchase price for cost calculation
  [key: string]: any; // Allow additional custom parameters
}
