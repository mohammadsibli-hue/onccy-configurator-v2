import React, { useState, useEffect } from 'react';
import { Part, Component } from '../types';
import { ArrowLeft, Calculator, DollarSign, FileText } from 'lucide-react';
import { t } from '../i18n';
import { jsPDF } from 'jspdf';
import { StorageService } from '../services/storage';

interface CostConfiguratorProps {
  part: Part;
  onBack: () => void;
}

export const CostConfigurator: React.FC<CostConfiguratorProps> = ({ part, onBack }) => {

  // Get component list from part with quantities
  const components = [
    { label: 'DC Isolated Switch', value: part.dcIsolatedSwitch, field: 'dcIsolatedSwitch', qty: part.dcIsolatedSwitchQty || 1 },
    { label: 'AC Isolated Switch', value: part.acIsolatedSwitch, field: 'acIsolatedSwitch', qty: part.acIsolatedSwitchQty || 1 },
    { label: 'SPD', value: part.spd, field: 'spd', qty: part.spdQty || 1 },
    { label: 'DC MCB', value: part.dcMcb, field: 'dcMcb', qty: part.dcMcbQty || 1 },
    { label: 'AC MCB', value: part.acMcb, field: 'acMcb', qty: part.acMcbQty || 1 },
    { label: 'DC Fuse', value: part.dcFuse, field: 'dcFuse', qty: part.dcFuseQty || 1 },
    { label: 'AC Fuse', value: part.acFuse, field: 'acFuse', qty: part.acFuseQty || 1 },
    { label: 'DC Fuse Holder', value: part.dcFuseHolder, field: 'dcFuseHolder', qty: part.dcFuseHolderQty || 1 },
    { label: 'AC Fuse Holder', value: part.acFuseHolder, field: 'acFuseHolder', qty: part.acFuseHolderQty || 1 },
    { label: 'RCCD', value: part.rccd, field: 'rccd', qty: part.rccdQty || 1 },
    { label: 'RCBO', value: part.rcbo, field: 'rcbo', qty: part.rcboQty || 1 },
    { label: 'Enclosure Type', value: part.enclosureType, field: 'enclosureType', qty: part.enclosureTypeQty || 1 }
  ].filter(comp => comp.value); // Only show components that exist

  // Cost calculation state
  const [quantity, setQuantity] = useState(1);
  const [componentCosts, setComponentCosts] = useState<Record<string, number>>({});
  const [wireAndTerminalCost, setWireAndTerminalCost] = useState(0); // 电线+压接铜端子+地线端子成本
  const [laborCost, setLaborCost] = useState(0);
  const [overheadPercentage, setOverheadPercentage] = useState(15);
  const [profitMarginPercentage, setProfitMarginPercentage] = useState(20);

  // Get all components from library
  const [allLibraryComponents, setAllLibraryComponents] = useState<Component[]>([]);
  
  // Load components from library and auto-populate costs
  useEffect(() => {
    const libraryComponents = StorageService.getAllComponents();
    setAllLibraryComponents(libraryComponents);
    
    // Auto-populate component costs from component library
    const initialCosts: Record<string, number> = {};
    
    // For components in the part
    components.forEach((comp) => {
      // Find matching component in library by name/model
      const matchingComponent = libraryComponents.find(c => 
        c.name === comp.value || c.model === comp.value
      );
      
      if (matchingComponent && matchingComponent.purchasePrice) {
        initialCosts[comp.label] = matchingComponent.purchasePrice;
      }
    });

    // For additional materials (Terminal Block, Cable Gland, MC4)
    const additionalMaterialsData = [
      { label: 'Terminal Block', value: part.terminalBlock },
      { label: 'Cable Gland', value: part.cableGland },
      { label: 'MC4', value: part.mc4 }
    ].filter(item => item.value);

    additionalMaterialsData.forEach((mat) => {
      const matchingComponent = libraryComponents.find(c => 
        c.name === mat.value || c.model === mat.value
      );
      if (matchingComponent && matchingComponent.purchasePrice) {
        initialCosts[mat.label] = matchingComponent.purchasePrice;
      }
    });
    
    // For library components with purchase price
    libraryComponents.forEach((comp) => {
      if (comp.purchasePrice) {
        initialCosts[comp.name] = comp.purchasePrice;
      }
    });
    
    setComponentCosts(initialCosts);
  }, [part]);

  // Calculate component total (cost * quantity for each component)
  const componentTotal = components.reduce((sum, comp) => {
    const unitCost = componentCosts[comp.label] || 0;
    return sum + (unitCost * comp.qty);
  }, 0);

  // Additional materials (component selection like other components)
  const additionalMaterials = [
    { label: 'Terminal Block', value: part.terminalBlock, field: 'terminalBlock', qty: part.terminalBlockQty || 1 },
    { label: 'Cable Gland', value: part.cableGland, field: 'cableGland', qty: part.cableGlandQty || 1 },
    { label: 'MC4', value: part.mc4, field: 'mc4', qty: part.mc4Qty || 1 }
  ].filter(item => item.value);

  // Calculate additional material total (using componentCosts lookup)
  const additionalMaterialTotal = additionalMaterials.reduce((sum, item) => {
    const unitCost = componentCosts[item.label] || 0;
    return sum + (unitCost * item.qty);
  }, 0);

  // Wire and terminal costs total
  const wireAndTerminalTotal = wireAndTerminalCost;

  // Calculate totals
  const subtotal = componentTotal + additionalMaterialTotal + wireAndTerminalTotal + laborCost;
  const overheadCost = (subtotal * overheadPercentage) / 100;
  const totalCost = subtotal + overheadCost;
  const profitMargin = (totalCost * profitMarginPercentage) / 100;
  const priceBeforeVat = totalCost + profitMargin;
  const vatRate = 1.13; // 13% VAT
  const sellingPrice = priceBeforeVat * vatRate;
  const vatAmount = sellingPrice - priceBeforeVat;
  const totalSellingPrice = sellingPrice * quantity;

  const updateComponentCost = (label: string, cost: number) => {
    setComponentCosts(prev => ({
      ...prev,
      [label]: cost
    }));
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 20;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(0, 52, 138);
    doc.text('Cost Configurator Report', pageWidth / 2, y, { align: 'center' });
    y += 15;

    // Product Info
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(part.name, 10, y);
    y += 10;

    if (part.categoryType) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Type: ${part.categoryType}`, 10, y);
      y += 7;
    }

    y += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(10, y, pageWidth - 10, y);
    y += 10;

    // Component Costs Section
    if (components.length > 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(10, y, pageWidth - 20, 9, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 52, 138);
      doc.text('Component Costs', 12, y + 6);
      y += 14;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);

      components.forEach((comp) => {
        const unitCost = componentCosts[comp.label] || 0;
        const totalCostForComp = unitCost * comp.qty;
        doc.setTextColor(100, 100, 100);
        const qtyText = comp.qty > 1 ? ` × ${comp.qty}` : '';
        doc.text(`${comp.label}: ${comp.value}${qtyText}`, 12, y);
        doc.setTextColor(0, 0, 0);
        if (comp.qty > 1) {
          doc.text(`¥${unitCost.toFixed(2)} × ${comp.qty} = ¥${totalCostForComp.toFixed(2)}`, pageWidth - 70, y);
        } else {
          doc.text(`¥${unitCost.toFixed(2)}`, pageWidth - 40, y);
        }
        y += 7;
      });

      y += 5;
    }

    // Additional Material Costs Section (only if there are materials)
    if (additionalMaterials.length > 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(10, y, pageWidth - 20, 9, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 52, 138);
      doc.text('Additional Material Costs', 12, y + 6);
      y += 14;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);

      additionalMaterials.forEach((item) => {
        const unitCost = componentCosts[item.label] || 0;
        const itemTotal = unitCost * item.qty;
        doc.setTextColor(100, 100, 100);
        const qtyText = item.qty > 1 ? ` × ${item.qty}` : '';
        doc.text(`${item.label}: ${item.value}${qtyText}`, 12, y);
        doc.setTextColor(0, 0, 0);
        if (item.qty > 1) {
          doc.text(`¥${unitCost.toFixed(2)} × ${item.qty} = ¥${itemTotal.toFixed(2)}`, pageWidth - 70, y);
        } else {
          doc.text(`¥${unitCost.toFixed(2)}`, pageWidth - 40, y);
        }
        y += 7;
      });

      y += 5;
    }

    // Cost Breakdown Section
    doc.setFillColor(245, 247, 250);
    doc.rect(10, y, pageWidth - 20, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 52, 138);
    doc.text('Cost Breakdown', 12, y + 6);
    y += 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const breakdownData = [
      ['Component Total', `¥${componentTotal.toFixed(2)}`],
      ...(additionalMaterials.length > 0 ? [['Additional Materials', `¥${additionalMaterialTotal.toFixed(2)}`]] : []),
      ...(wireAndTerminalCost > 0 ? [['Wire + Crimp Copper Terminal + Ground Terminal', `¥${wireAndTerminalCost.toFixed(2)}`]] : []),
      ['Labor Cost / 人工成本', `¥${laborCost.toFixed(2)}`],
      ['Subtotal', `¥${subtotal.toFixed(2)}`],
      [`Overhead (${overheadPercentage}%)`, `¥${overheadCost.toFixed(2)}`],
      ['Total Cost', `¥${totalCost.toFixed(2)}`],
      [`Profit (${profitMarginPercentage}%)`, `¥${profitMargin.toFixed(2)}`],
      ['VAT / 增值税 (13%)', `¥${vatAmount.toFixed(2)}`],
      ['Unit Price', `¥${sellingPrice.toFixed(2)}`]
    ];

    breakdownData.forEach(([label, value]) => {
      doc.setTextColor(100, 100, 100);
      doc.text(label, 12, y);
      doc.setTextColor(0, 0, 0);
      doc.text(value, pageWidth - 40, y);
      y += 7;
    });

    y += 5;

    // Final Price Section
    doc.setFillColor(16, 185, 129);
    doc.rect(10, y, pageWidth - 20, 15, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(`Quantity: ${quantity}`, 12, y + 6);
    doc.setFontSize(16);
    doc.text(`Total: ¥${totalSellingPrice.toFixed(2)}`, pageWidth - 12, y + 10, { align: 'right' });

    y += 20;

    // Cost Analysis Section
    if (totalCost > 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(10, y, pageWidth - 20, 9, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 52, 138);
      doc.text('Cost Analysis', 12, y + 6);
      y += 14;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      const analysisData = [
        ['Component Cost Ratio', `${((componentTotal / totalCost) * 100).toFixed(1)}%`],
        ['Labor Cost Ratio', `${((laborCost / totalCost) * 100).toFixed(1)}%`],
        ['Overhead Ratio', `${((overheadCost / totalCost) * 100).toFixed(1)}%`],
        ['Profit Margin', `${sellingPrice > 0 ? ((profitMargin / sellingPrice) * 100).toFixed(1) : 0}%`]
      ];

      analysisData.forEach(([label, value]) => {
        doc.setTextColor(100, 100, 100);
        doc.text(label, 12, y);
        doc.setTextColor(0, 0, 0);
        doc.text(value, pageWidth - 40, y);
        y += 7;
      });
    }

    // Footer
    const footerY = pageHeight - 20;
    doc.setDrawColor(200, 200, 200);
    doc.line(10, footerY, pageWidth - 10, footerY);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('ONCCY Industries', 10, footerY + 6);
    doc.text('www.onccy.com | info@onccy.com', pageWidth - 10, footerY + 6, { align: 'right' });

    // Save PDF
    doc.save(`Cost_Report_${part.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center text-blue-600 hover:text-blue-700 font-medium mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Product List
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-2xl shadow-lg">
                <Calculator className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Cost Configurator</h1>
                <p className="text-slate-600 mt-1">{part.name}</p>
              </div>
            </div>
            <button
              onClick={generatePDF}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg transition-all duration-200"
            >
              <FileText className="w-5 h-5" />
              Export PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Input Form */}
          <div className="space-y-6">
            {/* Product Info Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                Product Information
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Product Name</span>
                  <span className="font-semibold text-slate-900">{part.name}</span>
                </div>
                {part.categoryType && (
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Type</span>
                    <span className="font-semibold text-slate-900">{part.categoryType}</span>
                  </div>
                )}
                {part.inputString && (
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Input String</span>
                    <span className="font-semibold text-slate-900">{part.inputString}</span>
                  </div>
                )}
                {part.outputString && (
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Output String</span>
                    <span className="font-semibold text-slate-900">{part.outputString}</span>
                  </div>
                )}
                {part.technicalSpecs.voltage && (
                  <div className="flex justify-between py-2">
                    <span className="text-slate-600">Voltage</span>
                    <span className="font-semibold text-slate-900">{part.technicalSpecs.voltage}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Component Costs Input */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Component Costs</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {components.map((comp) => (
                  <div key={comp.label}>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {comp.label}: <span className="text-slate-500">{comp.value}</span>
                      <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                        × {comp.qty}
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={componentCosts[comp.label] || 0}
                        onChange={(e) => updateComponentCost(comp.label, parseFloat(e.target.value) || 0)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Unit cost (¥)"
                      />
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        = ¥{((componentCosts[comp.label] || 0) * comp.qty).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Material Costs - Only show if there are materials */}
            {additionalMaterials.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Additional Material Costs</h2>
                <div className="space-y-3">
                  {additionalMaterials.map((item) => {
                    const unitCost = componentCosts[item.label] || 0;
                    return (
                      <div key={item.label} className="flex justify-between items-center py-2 border-b border-slate-100">
                        <div>
                          <span className="text-sm text-slate-700">{item.label}: <span className="text-slate-500">{item.value}</span></span>
                          {item.qty > 1 && (
                            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">
                              × {item.qty}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-slate-900">
                            ¥{unitCost.toFixed(2)}
                          </span>
                          {item.qty > 1 && (
                            <span className="ml-2 text-xs text-slate-500">
                              = ¥{(unitCost * item.qty).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-between items-center pt-2 font-semibold">
                    <span className="text-slate-700">Subtotal</span>
                    <span className="text-slate-900">¥{additionalMaterialTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Other Costs Input */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Other Costs</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Wire + Crimp Copper Terminal + Ground Terminal / 电线+压接铜端子+地线端子 (¥)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={wireAndTerminalCost}
                    onChange={(e) => setWireAndTerminalCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Labor Cost / 人工成本 (¥)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={laborCost}
                    onChange={(e) => setLaborCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Overhead Percentage (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={overheadPercentage}
                    onChange={(e) => setOverheadPercentage(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Profit Margin (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={profitMarginPercentage}
                    onChange={(e) => setProfitMarginPercentage(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Cost Summary */}
          <div className="space-y-6">
            {/* Cost Breakdown */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Cost Breakdown</h2>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Component Costs</span>
                  <span className="font-semibold text-slate-900">¥{componentTotal.toFixed(2)}</span>
                </div>
                {additionalMaterialTotal > 0 && (
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Additional Material</span>
                    <span className="font-semibold text-slate-900">¥{additionalMaterialTotal.toFixed(2)}</span>
                  </div>
                )}
                {wireAndTerminalCost > 0 && (
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Wire + Crimp Copper Terminal + Ground Terminal</span>
                    <span className="font-semibold text-slate-900">¥{wireAndTerminalCost.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Labor Cost / 人工成本</span>
                  <span className="font-semibold text-slate-900">¥{laborCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-semibold text-slate-900">¥{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Overhead ({overheadPercentage}%)</span>
                  <span className="font-semibold text-slate-900">¥{overheadCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-3 border-b-2 border-slate-300">
                  <span className="text-slate-700 font-semibold">Total Cost</span>
                  <span className="font-bold text-slate-900 text-lg">¥{totalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Profit ({profitMarginPercentage}%)</span>
                  <span className="font-semibold text-green-600">¥{profitMargin.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">VAT / 增值税 (13%)</span>
                  <span className="font-semibold text-orange-600">¥{vatAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-3 bg-blue-50 rounded-lg px-4 mt-4">
                  <span className="text-blue-900 font-bold">Unit Price</span>
                  <span className="font-bold text-blue-900 text-xl">¥{sellingPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Total Price */}
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white">
              <div className="flex justify-between items-center mb-2">
                <span className="text-green-100">Quantity</span>
                <span className="text-2xl font-bold">{quantity}</span>
              </div>
              <div className="border-t border-green-400 my-4"></div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total Price</span>
                <span className="text-4xl font-bold">¥{totalSellingPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Cost Analysis - Pie Chart */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Cost Analysis</h2>
              
              {sellingPrice > 0 ? (
                <div className="space-y-4">
                  {/* Pie Chart */}
                  <div className="flex justify-center">
                    <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
                      {(() => {
                        const componentPercent = (componentTotal / sellingPrice) * 100;
                        const laborPercent = (laborCost / sellingPrice) * 100;
                        const overheadPercent = (overheadCost / sellingPrice) * 100;
                        const profitPercent = (profitMargin / sellingPrice) * 100;
                        const vatPercent = (vatAmount / sellingPrice) * 100;
                        
                        let currentAngle = 0;
                        const radius = 80;
                        const centerX = 100;
                        const centerY = 100;
                        
                        const createArc = (percentage: number, color: string, startAngle: number) => {
                          const angle = (percentage / 100) * 360;
                          const endAngle = startAngle + angle;
                          
                          const startRad = (startAngle * Math.PI) / 180;
                          const endRad = (endAngle * Math.PI) / 180;
                          
                          const x1 = centerX + radius * Math.cos(startRad);
                          const y1 = centerY + radius * Math.sin(startRad);
                          const x2 = centerX + radius * Math.cos(endRad);
                          const y2 = centerY + radius * Math.sin(endRad);
                          
                          const largeArc = angle > 180 ? 1 : 0;
                          
                          return (
                            <path
                              key={color + startAngle}
                              d={`M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                              fill={color}
                              className="transition-all duration-300"
                            />
                          );
                        };
                        
                        const arcs = [];
                        
                        if (componentPercent > 0) {
                          arcs.push(createArc(componentPercent, '#3b82f6', currentAngle));
                          currentAngle += (componentPercent / 100) * 360;
                        }
                        
                        if (laborPercent > 0) {
                          arcs.push(createArc(laborPercent, '#a855f7', currentAngle));
                          currentAngle += (laborPercent / 100) * 360;
                        }
                        
                        if (overheadPercent > 0) {
                          arcs.push(createArc(overheadPercent, '#f97316', currentAngle));
                          currentAngle += (overheadPercent / 100) * 360;
                        }
                        
                        if (profitPercent > 0) {
                          arcs.push(createArc(profitPercent, '#22c55e', currentAngle));
                          currentAngle += (profitPercent / 100) * 360;
                        }
                        
                        if (vatPercent > 0) {
                          arcs.push(createArc(vatPercent, '#ef4444', currentAngle));
                        }
                        
                        return arcs;
                      })()}
                    </svg>
                  </div>
                  
                  {/* Legend */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-blue-500"></div>
                        <span className="text-sm text-slate-600">Component Costs</span>
                      </div>
                      <span className="font-semibold text-slate-900">
                        {((componentTotal / sellingPrice) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-purple-500"></div>
                        <span className="text-sm text-slate-600">Labor Cost</span>
                      </div>
                      <span className="font-semibold text-slate-900">
                        {((laborCost / sellingPrice) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-orange-500"></div>
                        <span className="text-sm text-slate-600">Overhead</span>
                      </div>
                      <span className="font-semibold text-slate-900">
                        {((overheadCost / sellingPrice) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-green-500"></div>
                        <span className="text-sm text-slate-600">Profit</span>
                      </div>
                      <span className="font-semibold text-green-600">
                        {((profitMargin / sellingPrice) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-red-500"></div>
                        <span className="text-sm text-slate-600">VAT / 增值税</span>
                      </div>
                      <span className="font-semibold text-red-600">
                        {((vatAmount / sellingPrice) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-400 py-8">
                  Enter cost data to view analysis
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
