import React, { useState, useEffect, useMemo } from 'react';
import { Part, AppSettings, FilterConfig } from '../types';
import { StorageService } from '../services/storage';
import { Search, ChevronDown, ChevronRight, Box, Filter } from 'lucide-react';
import { t as translations } from '../i18n';

// --- Configuration for the 3-Level Filter Tree ---
interface FilterL3 {
  label: string;
  value: string;
}

interface FilterL2 {
  label: string;
  field: keyof Part | string; // Field in Part object
  subField?: string; // Nested field inside 'technicalSpecs' etc.
  isList?: boolean; // If true, Part[field] is an array (e.g. contact types)
  options: FilterL3[];
}

interface FilterL1 {
  label: string;
  children: FilterL2[];
}

const FILTER_TREE: FilterL1[] = [
  // Category group (Rubric/Series) is now loaded from FilterConfig via StorageService
  {
    label: "General Data",
    children: [
      {
        label: "Protection Class Front",
        field: "technicalSpecs",
        subField: "protectionClass",
        options: [
          { label: "IP40", value: "IP40" },
          { label: "IP65", value: "IP65" }
        ]
      },
      {
        label: "Illumination",
        field: "technicalSpecs",
        subField: "illumination",
        options: [
          { label: "YES", value: "YES" },
          { label: "NO", value: "NO" }
        ]
      },
      {
        label: "Ring Illumination",
        field: "technicalSpecs",
        subField: "ringIllumination",
        options: [
          { label: "YES", value: "YES" }
        ]
      }
    ]
  },
  {
    label: "Contacts",
    children: [
      {
        label: "Contact Type",
        field: "availableContactTypes",
        isList: true,
        options: [
          { label: "1NO", value: "1NO" },
          { label: "1NC", value: "1NC" },
          { label: "2NO", value: "2NO" },
          { label: "2NC", value: "2NC" },
          { label: "4NO", value: "4NO" },
          { label: "4NC", value: "4NC" },
          { label: "2NC+2NO", value: "2NC+2NO" },
          { label: "1NC+1NO", value: "1NC+1NO" },
          { label: "1NC+2NO", value: "1NC+2NO" },
          { label: "2NC+1NO", value: "2NC+1NO" },
        ]
      },
      {
        label: "Connection Material",
        field: "connectionMaterial",
        options: [
          { label: "AgNi", value: "AgNi" },
          { label: "Gold-plated", value: "Gold-plated" }
        ]
      }
    ]
  },
  {
    label: "Design",
    children: [
      {
        label: "Shape",
        field: "shape",
        options: [
          { label: "Round", value: "Round" },
          { label: "Square", value: "Square" },
          { label: "Rounded square", value: "Rounded square" },
          { label: "Rounded rectangular", value: "Rounded rectangular" }
        ]
      },
      {
        label: "Mounting Hole",
        field: "technicalSpecs",
        subField: "mountingHole",
        options: [
          { label: "22MM", value: "22MM" }
        ]
      }
    ]
  },
  {
    label: "Color Front Bezel",
    children: [
      {
        label: "Bezel Color",
        field: "colorFrontBezel",
        options: [
          { label: "Black", value: "Black" },
          { label: "Silver", value: "Silver" },
          { label: "Stainless steel", value: "Stainless steel" }
        ]
      }
    ]
  },
  {
    label: "Mechanical Data",
    children: [
      {
        label: "Connection Type",
        field: "connectionType",
        options: [
          { label: "Screw connection", value: "Screw connection" },
          { label: "Solder Pin", value: "Solder Pin" },
          { label: "Push-In", value: "Push-In" }
        ]
      },
      {
        label: "Switching Function",
        field: "switchingFunction",
        options: [
          { label: "Latching function", value: "Latching function" },
          { label: "Momentary function", value: "Momentary function" },
          { label: "Pull&Push", value: "Pull&Push" },
          { label: "Twist", value: "Twist" },
          { label: "Pull&Push with vision", value: "Pull&Push with vision" },
          { label: "Twist with vision", value: "Twist with vision" }
        ]
      }
    ]
  }
];

interface ConfiguratorProps {
  onProductSelect: (part: Part, type: 'parameter' | 'cost') => void;
}

// Localized labels for filter tree & small spec labels
const FILTER_LABEL_MAP: Record<string, { zh: string; de: string }> = {
  // Level 1 sections
  'Category': { zh: '类别', de: 'Kategorie' },
  'CATEGORY': { zh: '类别', de: 'Kategorie' },
  'STRING': { zh: '回路', de: 'String' },
  'VOLTAGE': { zh: '电压', de: 'Spannung' },
  'General Data': { zh: '一般数据', de: 'Allgemeine Daten' },
  'Contacts': { zh: '触点', de: 'Kontakte' },
  'Design': { zh: '设计', de: 'Design' },
  'Color Front Bezel': { zh: '前框颜色', de: 'Frontalrahmenfarbe' },
  'Mechanical Data': { zh: '机械数据', de: 'Mechanische Daten' },

  // Level 2 fields
  'Rubric': { zh: '产品类别', de: 'Rubrik' },
  'Series': { zh: '系列', de: 'Serie' },
  'Protection Class Front': { zh: '前侧防护等级', de: 'Schutzart Front' },
  'Illumination': { zh: '照明', de: 'Beleuchtung' },
  'Ring Illumination': { zh: '环形照明', de: 'Ringbeleuchtung' },
  'Contact Type': { zh: '触点类型', de: 'Kontaktart' },
  'Connection Material': { zh: '触点材料', de: 'Kontaktmaterial' },
  'Shape': { zh: '外形', de: 'Form' },
  'Mounting Hole': { zh: '安装孔', de: 'Einbauöffnung' },
  'Bezel Color': { zh: '前框颜色', de: 'Rahmenfarbe' },
  'Connection Type': { zh: '接线方式', de: 'Anschlussart' },
  'Switching Function': { zh: '转换功能', de: 'Schaltfunktion' },

  // New dynamic filter field labels
  'Combiner Type': { zh: '汇流箱类型', de: 'Combiner-Typ' },
  'Voltage Level': { zh: '电压等级', de: 'Spannungsebene' },

  // New configurable filter fields/groups
  'Input String': { zh: '输入回路', de: 'Input String' },
  'Output String': { zh: '输出回路', de: 'Output String' },

  // Option labels under Rubric
  'Pushbutton': { zh: '按钮', de: 'Drucktaster' },
  'Selector button': { zh: '选择开关', de: 'Wahlschalter' },
  'Key switch': { zh: '钥匙开关', de: 'Schlüsselschalter' },
  'Indicator': { zh: '指示灯', de: 'Signalleuchte' },
  'Potentiometer': { zh: '电位器', de: 'Potentiometer' },
  'Buzzer': { zh: '蜂鸣器', de: 'Summer' },
  'Mushroom head': { zh: '蘑菇头按钮', de: 'Pilztaster' },
  'Toggle switch': { zh: '拨动开关', de: 'Kippschalter' },
  'E-stop': { zh: '急停按钮', de: 'Not-Halt' },

  // Boolean options
  'YES': { zh: '是', de: 'Ja' },
  'NO': { zh: '否', de: 'Nein' },

  // Card header spec labels
  'Mounting Hole:': { zh: '安装孔：', de: 'Einbauöffnung:' },
  'Protection Class Front:': { zh: '前侧防护等级：', de: 'Schutzart Front:' },
  'Series:': { zh: '系列：', de: 'Serie:' },
  'STRING:': { zh: 'STRING：', de: 'String:' },
  'Voltage:': { zh: '电压：', de: 'Spannung:' }
};

const getFilterLabel = (raw: string): string => {
  return raw;
};

const renderSwatch = (colorName?: string, isRing: boolean = false, onClick?: () => void, isActive?: boolean) => {
    if (!colorName) return <div className="w-5 h-5 rounded border border-slate-200 bg-slate-50" title="N/A"></div>;
    
    let bgStyle: React.CSSProperties = {};
    const lower = colorName.toLowerCase();
    
    // Gradients for metals
    if (lower.includes("silver")) {
        bgStyle = { background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' };
    } else if (lower.includes("stainless") || lower.includes("steel")) {
        bgStyle = { background: 'linear-gradient(135deg, #e0e0e0 0%, #909090 100%)' };
    } else if (lower.includes("gold")) {
        bgStyle = { background: 'linear-gradient(135deg, #fceabb 0%, #f8b500 100%)' };
    } else if (lower.includes("black")) {
        bgStyle = { backgroundColor: '#1a1a1a' };
    } else if (lower.includes("yellow")) {
        bgStyle = { backgroundColor: '#fbbf24' };
    } else if (lower.includes("red")) {
        bgStyle = { backgroundColor: '#ef4444' };
    } else if (lower.includes("green")) {
        bgStyle = { backgroundColor: '#22c55e' };
    } else if (lower.includes("blue")) {
        bgStyle = { backgroundColor: '#3b82f6' };
    } else if (lower.includes("white")) {
        bgStyle = { backgroundColor: '#ffffff', border: '1px solid #e2e8f0' };
    } else {
        bgStyle = { backgroundColor: lower };
    }

    const baseClass = isRing 
        ? "w-6 h-6 rounded-full border-2 shadow-sm transition-all" 
        : "w-6 h-6 rounded border border-slate-300 shadow-sm";

    const activeClass = isActive 
        ? "ring-2 ring-blue-500 ring-offset-1 scale-110" 
        : "border-slate-200 hover:scale-105";

    return (
        <div 
            className={`${baseClass} ${activeClass} ${onClick ? 'cursor-pointer' : ''}`} 
            style={bgStyle} 
            title={colorName}
            onClick={onClick}
        ></div>
    );
};

// --- Product Card Component ---
const ProductCard: React.FC<{ part: Part, onSelect: (part: Part, type: 'parameter' | 'cost') => void }> = ({ part, onSelect }) => {
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [showConfiguratorMenu, setShowConfiguratorMenu] = useState(false);

    // Determine which image to show based on selected color
    const displayImage = useMemo(() => {
        if (selectedColor && part.colorImages && part.colorImages[selectedColor]) {
            return part.colorImages[selectedColor];
        }
        if (part.imageUrl) return part.imageUrl;
        // Fallback placeholder based on part id so it's stable
        return `https://picsum.photos/seed/${encodeURIComponent(part.id)}/300/300`;
    }, [part, selectedColor]);

    return (
        <div className="bg-[#f3f7ff] border border-white/70 rounded-3xl shadow-[0_18px_40px_rgba(15,23,42,0.18)] hover:shadow-[0_20px_48px_rgba(15,23,42,0.26)] transition-all duration-200 flex flex-col overflow-hidden">
            
            {/* Card Header (Gray) */}
            <div className="bg-[#e3e6ee] px-6 py-5 relative">
                <div className="flex justify-between">
                <div className="pr-4 max-w-[65%]">
                    <h3 className="text-lg font-bold text-slate-900 leading-tight mb-3">{part.name}</h3>
                    
                    {/* Variants Badge (Optional) */}
                    {part.variantCount && (
                        <span className="inline-block bg-[#2f7dff] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-3 shadow-sm">
                            {part.variantCount} {translations.configurator.card.variantsSuffix}
                        </span>
                    )}

                    {/* Key Specs Grid */}
                    <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-xs text-slate-700">
                        <span className="text-slate-500">{getFilterLabel('STRING:')}</span>
                        <span className="font-medium">
                          {[
                            part.inputString,
                            part.outputString
                          ].filter(Boolean).join(' / ') || '-'}
                        </span>
                        
                        <span className="text-slate-500">{getFilterLabel('Voltage:')}</span>
                        <span className="font-medium">{part.technicalSpecs.voltage || '-'}</span>
                    </div>
                </div>

                {/* Image aligned right */}
                <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center p-2 shadow-md shrink-0 border border-slate-100">
                    <img 
                        src={displayImage} 
                        alt={part.name} 
                        className="max-w-full max-h-full object-contain mix-blend-multiply transition-opacity duration-300" 
                    />
                </div>
                </div>
            </div>

            {/* Card Body removed: only header info and footer button are shown as per new design */}

            {/* Card Footer */}
            <div className="mt-auto px-6 pb-5 pt-4 bg-white rounded-b-3xl border-t border-slate-200/70 relative">
                {!showConfiguratorMenu ? (
                    <button 
                        onClick={() => setShowConfiguratorMenu(true)}
                        className="w-full flex items-center justify-center h-12 bg-gradient-to-r from-[#1d4ed8] via-[#2563eb] to-[#1d4ed8] hover:from-[#2563eb] hover:via-[#1d4ed8] hover:to-[#1d4ed8] text-white text-sm font-bold rounded-2xl shadow-[0_10px_24px_rgba(15,23,42,0.35)] transition-all duration-200"
                    >
                        <Box className="w-4 h-4 mr-2" />
                        {translations.nav.configurator}
                    </button>
                ) : (
                    <div className="space-y-3">
                        <button 
                            onClick={() => {
                                onSelect(part, 'parameter');
                                setShowConfiguratorMenu(false);
                            }}
                            className="w-full flex items-center justify-center h-12 bg-gradient-to-r from-[#1d4ed8] via-[#2563eb] to-[#1d4ed8] hover:from-[#2563eb] hover:via-[#1d4ed8] hover:to-[#1d4ed8] text-white text-sm font-bold rounded-2xl shadow-[0_10px_24px_rgba(15,23,42,0.35)] transition-all duration-200"
                        >
                            <Box className="w-4 h-4 mr-2" />
                            Parameter Configurator
                        </button>
                        <button 
                            onClick={() => {
                                onSelect(part, 'cost');
                                setShowConfiguratorMenu(false);
                            }}
                            className="w-full flex items-center justify-center h-12 bg-gradient-to-r from-[#059669] via-[#10b981] to-[#059669] hover:from-[#10b981] hover:via-[#059669] hover:to-[#10b981] text-white text-sm font-bold rounded-2xl shadow-[0_10px_24px_rgba(15,23,42,0.35)] transition-all duration-200"
                        >
                            <Box className="w-4 h-4 mr-2" />
                            Cost Configurator
                        </button>
                        <button 
                            onClick={() => setShowConfiguratorMenu(false)}
                            className="w-full text-center text-xs text-slate-500 hover:text-slate-700 py-2"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const HeroSection: React.FC<{ settings: AppSettings }> = ({ settings }) => {
    return (
        <div className="relative w-full h-[300px] md:h-[400px] overflow-hidden mb-8">
            {/* Pure Christmas background with animated snow */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a] via-[#1e3a8a] to-[#0f172a]" />

            {/* Content */}
            <div className="relative h-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
                <div className="max-w-2xl text-white">
                    <h2 className="text-sm md:text-base font-bold text-rose-100 uppercase tracking-[0.28em] mb-3">
                        {translations.configurator.heroKicker}
                    </h2>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4 leading-tight drop-shadow-[0_10px_25px_rgba(0,0,0,0.45)]">
                        {settings.heroTitle}
                    </h1>
                    <p className="text-lg md:text-xl text-emerald-50 font-light leading-relaxed mb-4">
                        {settings.heroSubtitle}
                    </p>

                    {/* Christmas decorative icons */}
                    <div className="flex items-center gap-4 text-xs text-emerald-50/90">
                    </div>
                </div>
            </div>
        </div>
    );
};


export const Configurator: React.FC<ConfiguratorProps> = ({ onProductSelect }) => {
  
  const [parts, setParts] = useState<Part[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [filterConfig, setFilterConfig] = useState<FilterConfig | null>(null);
  
  // State to track selected filters. 
  const [selectedFilters, setSelectedFilters] = useState<Record<string, Set<string>>>({});
  
  // State to track expanded sections
  const [expandedL1, setExpandedL1] = useState<Set<number>>(new Set([0, 1]));
  // For L2 we distinguish between config-based ("cfg-<g>-<f>") and static tree ("<i>-<j>") keys
  const [expandedL2, setExpandedL2] = useState<Set<string>>(new Set(["cfg-0-0", "cfg-0-1"]));

  useEffect(() => {
    StorageService.init();
    setParts(StorageService.getAllParts());
    setSettings(StorageService.getSettings());
    setFilterConfig(StorageService.getFilterConfig());
  }, []);

  // -- Filter Logic --
  const filteredParts = useMemo(() => {
    return parts.filter(part => {
      // 1) Apply filters coming from static FILTER_TREE groups
      for (let i = 0; i < FILTER_TREE.length; i++) {
        const l1 = FILTER_TREE[i];
        for (let j = 0; j < l1.children.length; j++) {
          const l2 = l1.children[j];
          const key = `${i}-${j}`;
          const selections = selectedFilters[key];
          
          if (selections && selections.size > 0) {
            const partValRaw = (part as any)[l2.field];
            let partVal: any = partValRaw;
            if (l2.subField && partValRaw) {
              partVal = partValRaw[l2.subField];
            }

            if (!partVal) return false; 

            if (l2.isList && Array.isArray(partVal)) {
              const hasIntersection = partVal.some((v: string) => selections.has(v));
              if (!hasIntersection) return false;
            } else {
              if (!selections.has(String(partVal))) return false;
            }
          }
        }
      }

      // 2) Apply filters coming from configurable filterConfig groups (e.g. Category Rubric/Series)
      if (filterConfig) {
        for (let gIdx = 0; gIdx < filterConfig.groups.length; gIdx++) {
          const group = filterConfig.groups[gIdx];
          for (let fIdx = 0; fIdx < group.fields.length; fIdx++) {
            const field = group.fields[fIdx];
            const key = `cfg-${gIdx}-${fIdx}`;
            const selections = selectedFilters[key];

            if (selections && selections.size > 0) {
              const baseVal = (part as any)[field.partField];
              let partVal: any = baseVal;
              if (field.subField && baseVal) {
                partVal = baseVal[field.subField];
              }

              if (!partVal) return false;

              if (field.isList && Array.isArray(partVal)) {
                const hasIntersection = partVal.some((v: string) => selections.has(String(v)));
                if (!hasIntersection) return false;
              } else {
                if (!selections.has(String(partVal))) return false;
              }
            }
          }
        }
      }

      return true;
    });
  }, [parts, selectedFilters, filterConfig]);

  // -- Handlers --

  const toggleL1 = (idx: number) => {
    const newSet = new Set(expandedL1);
    if (newSet.has(idx)) newSet.delete(idx);
    else newSet.add(idx);
    setExpandedL1(newSet);
  };

  const toggleL2 = (id: string) => {
    const newSet = new Set(expandedL2);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedL2(newSet);
  };

  const toggleFilter = (key: string, value: string) => {
    const prev = selectedFilters[key] || new Set();
    const next = new Set(prev);
    if (next.has(value)) next.delete(value);
    else next.add(value);

    setSelectedFilters(s => ({ ...s, [key]: next }));
  };

  const clearAllFilters = () => {
    setSelectedFilters({});
  };

  return (
    <div className="min-h-screen bg-slate-200/80">
      
      {/* Hero Section */}
      {settings && <HeroSection settings={settings} />}

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* --- Sidebar (Tree Filter) --- */}
          <div className="w-full lg:w-72 flex-shrink-0 bg-blue-500/5 border border-blue-200/70 rounded-3xl shadow-[0_18px_40px_rgba(37,99,235,0.35)] h-fit backdrop-blur-xl">
            <div className="p-4 border-b border-blue-200/60 flex justify-between items-center bg-blue-50/60 rounded-t-3xl">
              <h2 className="font-bold text-slate-800 flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                {translations.configurator.sidebarTitle}
              </h2>
              <button onClick={clearAllFilters} className="text-xs text-blue-600 hover:underline">
                {translations.configurator.sidebarReset}
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {/* Dynamic groups from filterConfig (e.g. CATEGORY / STRING / VOLTAGE) */}
              {filterConfig && filterConfig.groups.map((group, groupIndex) => (
                <div key={group.id} className="">
                  {/* Level 1 Header */}
                  <button 
                    onClick={() => toggleL1(groupIndex)}
                    className="w-full flex items-center justify-between p-3 text-left font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-sm uppercase tracking-wide">{group.label}</span>
                    {expandedL1.has(groupIndex) ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </button>

                  {/* Level 2 / Options Container */}
                  {expandedL1.has(groupIndex) && (
                    <div className="bg-slate-50/50 pb-2">
                      {group.id === 'voltage'
                        ? (
                          // Special case: VOLTAGE shows options directly without inner header row
                          <div className="px-4 pt-2 pb-2 space-y-1">
                            {group.fields[0]?.options.map((opt) => {
                              const l2Key = `cfg-${groupIndex}-0`;
                              const isChecked = selectedFilters[l2Key]?.has(opt.value);
                              return (
                                <label key={opt.value} className="flex items-start cursor-pointer group py-1">
                                  <div className="relative flex items-center h-5">
                                    <input
                                      type="checkbox"
                                      checked={!!isChecked}
                                      onChange={() => toggleFilter(l2Key, opt.value)}
                                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                    />
                                  </div>
                                  <span className={`ml-2 text-sm ${isChecked ? 'text-blue-700 font-medium' : 'text-slate-600 group-hover:text-slate-900'}`}>
                                    {opt.label}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          group.fields.map((field, j) => {
                            const l2Key = `cfg-${groupIndex}-${j}`;
                            const isExpanded = expandedL2.has(l2Key);
                            const activeCount = selectedFilters[l2Key]?.size || 0;

                            return (
                              <div key={j} className="border-t border-slate-100 first:border-0">
                                {/* Level 2 Header */}
                                <button
                                  onClick={() => toggleL2(l2Key)}
                                  className="w-full flex items-center justify-between py-2 px-4 text-left text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors"
                                >
                                  <span>{field.label}</span>
                                  <div className="flex items-center">
                                    {activeCount > 0 && (
                                      <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full mr-2">
                                        {activeCount}
                                      </span>
                                    )}
                                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                  </div>
                                </button>

                                {/* Level 3 Options (Checkboxes) */}
                                {isExpanded && (
                                  <div className="px-4 pb-2 space-y-1">
                                    {field.options.map((opt) => {
                                      const isChecked = selectedFilters[l2Key]?.has(opt.value);
                                      return (
                                        <label key={opt.value} className="flex items-start cursor-pointer group py-1">
                                          <div className="relative flex items-center h-5">
                                            <input
                                              type="checkbox"
                                              checked={!!isChecked}
                                              onChange={() => toggleFilter(l2Key, opt.value)}
                                              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                            />
                                          </div>
                                          <span className={`ml-2 text-sm ${isChecked ? 'text-blue-700 font-medium' : 'text-slate-600 group-hover:text-slate-900'}`}>
                                            {opt.label}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* --- Product Grid --- */}
          <div className="flex-grow">
            <div className="mb-6 flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                {translations.configurator.productsHeading} ({filteredParts.length})
              </h2>
            </div>

            {filteredParts.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-lg p-16 text-center">
                <Search className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                <h3 className="text-lg font-medium text-slate-900">{translations.configurator.noResultsTitle}</h3>
                <p className="text-slate-500 mt-2">{translations.configurator.noResultsBody}</p>
                <button 
                  onClick={clearAllFilters}
                  className="mt-6 px-4 py-2 bg-blue-50 text-blue-700 rounded-md font-medium hover:bg-blue-100 transition-colors"
                >
                  {translations.configurator.noResultsClear}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {filteredParts.map(part => (
                    <ProductCard key={part.id} part={part} onSelect={onProductSelect} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};