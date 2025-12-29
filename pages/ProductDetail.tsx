import React, { useState } from 'react';
import { Part } from '../types';
import { ArrowLeft, FileText, Box, Maximize2, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Canvas } from '@react-three/fiber';
import { useGLTF, Stage, OrbitControls, Clone } from '@react-three/drei';
import { t as translations } from '../i18n';

interface ProductDetailProps {
  part: Part;
  onBack: () => void;
}

// 3D Model Component
function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <Clone object={scene} />;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({ part, onBack }) => {
  const t = translations.productDetail;
  const pdfT = translations.pdf;
  const pdfStrings = translations.pdf;
  
  // Image viewer modal state
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewerImage, setViewerImage] = useState<{src: string, title: string} | null>(null);
  
  const openImageViewer = (src: string, title: string) => {
    setViewerImage({src, title});
    setImageViewerOpen(true);
  };
  
  const closeImageViewer = () => {
    setImageViewerOpen(false);
    setViewerImage(null);
  };
  
  const getLogoDataUrl = (): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 70;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // ONCCY wordmark
    ctx.fillStyle = '#00348a'; // ONCCY blue
    ctx.font = '900 40px sans-serif';
    ctx.fillText('ONCCY', 0, 50);

    // Simple red square accent on the right
    const textWidth = ctx.measureText('ONCCY').width;
    const x = textWidth + 10;
    const y = 12;
    const size = 32;

    ctx.fillStyle = '#e31e24';
    ctx.fillRect(x, y, size, size);

    // White lightning icon inside the square
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x + size * 0.35, y + 4);
    ctx.lineTo(x + size * 0.2, y + size * 0.65);
    ctx.lineTo(x + size * 0.45, y + size * 0.65);
    ctx.lineTo(x + size * 0.3, y + size - 4);
    ctx.lineTo(x + size * 0.8, y + size * 0.35);
    ctx.lineTo(x + size * 0.55, y + size * 0.35);
    ctx.closePath();
    ctx.fill();

    return canvas.toDataURL('image/png');
  };

  const getProductImageDataUrl = (url: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            // White background for transparent PNGs
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            } else {
                resolve('');
            }
        };
        img.onerror = () => {
            console.warn("Could not load product image for PDF");
            resolve(''); 
        };
    });
  };

  const generatePDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 20;

    // --- Footer Helper ---
    const addFooter = () => {
      const footerY = pageHeight - 20;
      doc.setDrawColor(200, 200, 200);
      doc.line(10, footerY, pageWidth - 10, footerY);

      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('ONCCY Industries', 10, footerY + 6);
      doc.text('www.onccy.com | info@onccy.com', pageWidth - 10, footerY + 6, { align: 'right' });
    };

    // --- Header with Logo ---
    const logoData = getLogoDataUrl();
    if (logoData) {
      doc.addImage(logoData, 'PNG', 10, 10, 40, 12);
    } else {
      doc.setFontSize(24);
      doc.setTextColor(0, 52, 138);
      doc.text('ONCCY', 10, 20);
    }

    doc.setFontSize(20);
    doc.setTextColor(80, 80, 80);
    doc.text('ONCCY Configurator', pageWidth - 10, 20, { align: 'right' });

    // Separator
    doc.setDrawColor(0, 52, 138);
    doc.setLineWidth(1);
    doc.line(10, 28, pageWidth - 10, 28);

    y = 40;

    // --- Product Info & Image (same layout as sample) ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(part.name, 10, y);
    y += 7;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 90, 90);
    if (part.categoryType) {
      doc.text(part.categoryType, 10, y);
      y += 7;
    } else if (part.series) {
      doc.text(`Series: ${part.series}`, 10, y);
      y += 7;
    }

    // Description
    doc.setTextColor(0, 0, 0);
    const productImageData = await getProductImageDataUrl(part.imageUrl);
    const imgSize = 55;
    const descWidth = productImageData ? pageWidth - 20 - imgSize - 10 : pageWidth - 20;
    const descLines = doc.splitTextToSize(part.description || '', descWidth);
    doc.setFontSize(10.5);
    doc.text(descLines, 10, y);

    // Image on the right
    if (productImageData) {
      doc.addImage(productImageData, 'JPEG', pageWidth - 10 - imgSize, y - 7, imgSize, imgSize);
    }

    const textHeight = descLines.length * 5.5;
    y += Math.max(textHeight, productImageData ? imgSize : 0) + 12;

    // --- Technical Data Sections (sample-like tables) ---
    const drawSection = (title: string, data: [string, string | undefined][]) => {
      if (y > pageHeight - 40) {
        addFooter();
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(245, 247, 250);
      doc.rect(10, y, pageWidth - 20, 9, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 52, 138);
      doc.text(title, 12, y + 6);
      y += 14;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      data.forEach(([label, value]) => {
        if (!value) return;

        if (y > pageHeight - 30) {
          addFooter();
          doc.addPage();
          y = 20;
        }

        doc.setTextColor(100, 100, 100);
        doc.text(label, 12, y);
        doc.setTextColor(0, 0, 0);
        doc.text(String(value), 90, y);

        doc.setDrawColor(240, 240, 240);
        doc.setLineWidth(0.5);
        doc.line(10, y + 3, pageWidth - 10, y + 3);

        y += 8;
      });
      y += 6;
    };

    const stringValue = [part.inputString, part.outputString].filter(Boolean).join(' / ');

    // If this is a combiner box, export ONLY what is shown on the current UI
    if (part.categoryType) {
      drawSection(pdfStrings.classification, [
        ['Category', part.categoryType],
        ['Input / Output String', stringValue || undefined]
      ]);

      drawSection('Technical Data', [
        ['Voltage', part.technicalSpecs.voltage]
      ]);

      // Component specifications section with quantities
      const componentData: [string, string | undefined][] = [
        ['DC Isolated Switch', part.dcIsolatedSwitch ? `${part.dcIsolatedSwitch}${(part.dcIsolatedSwitchQty || 1) > 1 ? ` × ${part.dcIsolatedSwitchQty}` : ''}` : undefined],
        ['AC Isolated Switch', part.acIsolatedSwitch ? `${part.acIsolatedSwitch}${(part.acIsolatedSwitchQty || 1) > 1 ? ` × ${part.acIsolatedSwitchQty}` : ''}` : undefined],
        ['SPD', part.spd ? `${part.spd}${(part.spdQty || 1) > 1 ? ` × ${part.spdQty}` : ''}` : undefined],
        ['DC MCB', part.dcMcb ? `${part.dcMcb}${(part.dcMcbQty || 1) > 1 ? ` × ${part.dcMcbQty}` : ''}` : undefined],
        ['AC MCB', part.acMcb ? `${part.acMcb}${(part.acMcbQty || 1) > 1 ? ` × ${part.acMcbQty}` : ''}` : undefined],
        ['DC Fuse', part.dcFuse ? `${part.dcFuse}${(part.dcFuseQty || 1) > 1 ? ` × ${part.dcFuseQty}` : ''}` : undefined],
        ['AC Fuse', part.acFuse ? `${part.acFuse}${(part.acFuseQty || 1) > 1 ? ` × ${part.acFuseQty}` : ''}` : undefined],
        ['DC Fuse Holder', part.dcFuseHolder ? `${part.dcFuseHolder}${(part.dcFuseHolderQty || 1) > 1 ? ` × ${part.dcFuseHolderQty}` : ''}` : undefined],
        ['AC Fuse Holder', part.acFuseHolder ? `${part.acFuseHolder}${(part.acFuseHolderQty || 1) > 1 ? ` × ${part.acFuseHolderQty}` : ''}` : undefined],
        ['RCCD', part.rccd ? `${part.rccd}${(part.rccdQty || 1) > 1 ? ` × ${part.rccdQty}` : ''}` : undefined],
        ['RCBO', part.rcbo ? `${part.rcbo}${(part.rcboQty || 1) > 1 ? ` × ${part.rcboQty}` : ''}` : undefined],
        ['Enclosure Type', part.enclosureType ? `${part.enclosureType}${(part.enclosureTypeQty || 1) > 1 ? ` × ${part.enclosureTypeQty}` : ''}` : undefined]
      ].filter((item): item is [string, string] => Boolean(item[1]));

      if (componentData.length > 0) {
        drawSection('Component Specifications', componentData);
      }

      // Helper function to add technical drawing with smart pagination
      const addTechnicalDrawing = (imageData: string, title: string) => {
        try {
          // Get image dimensions
          const img = new Image();
          img.src = imageData;
          const imgAspectRatio = img.width / img.height;
          
          // Calculate image dimensions to fit page width
          const maxImgWidth = pageWidth - 40;
          const imgWidth = maxImgWidth;
          const imgHeight = imgWidth / imgAspectRatio;
          
          // Total space needed: title (9) + spacing (14) + image + bottom margin (10)
          const totalHeight = 9 + 14 + imgHeight + 10;
          
          // Check if we need a new page (leave 30mm margin at bottom)
          if (y + totalHeight > pageHeight - 30) {
            addFooter();
            doc.addPage();
            y = 20;
          }
          
          // Draw title section
          doc.setFillColor(245, 247, 250);
          doc.rect(10, y, pageWidth - 20, 9, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(0, 52, 138);
          // Use ASCII representation for Chinese text to avoid garbled characters
          const titleText = title === '原理线路图' ? 'Circuit Diagram' : 'Product Dimensions';
          doc.text(titleText, 12, y + 6);
          y += 14;
          
          // Add image
          doc.addImage(imageData, 'JPEG', 20, y, imgWidth, imgHeight);
          y += imgHeight + 10;
        } catch (error) {
          console.error(`Failed to add ${title} to PDF:`, error);
        }
      };

      // Add technical drawings if available
      if (part.circuitDiagram) {
        addTechnicalDrawing(part.circuitDiagram, '原理线路图');
      }

      if (part.productDimensions) {
        addTechnicalDrawing(part.productDimensions, '产品尺寸图');
      }
    } else {
      // Legacy full datasheet for switch products
      drawSection(pdfStrings.classification, [
        [pdfStrings.labels.rubric, part.rubric],
        [pdfStrings.labels.series, part.series]
      ]);

      drawSection(pdfStrings.generalData, [
        [pdfStrings.labels.protectionClassFront, part.technicalSpecs.protectionClass],
        [pdfStrings.labels.illumination, part.technicalSpecs.illumination],
        [pdfStrings.labels.ringIllumination, part.technicalSpecs.ringIllumination]
      ]);

      drawSection(pdfStrings.design, [
        [pdfStrings.labels.shape, part.shape],
        [pdfStrings.labels.mountingHole, part.technicalSpecs.mountingHole],
        [pdfStrings.labels.colorFrontBezel, part.colorFrontBezel]
      ]);

      drawSection(pdfStrings.mechContacts, [
        [pdfStrings.labels.connectionMaterial, part.connectionMaterial],
        [pdfStrings.labels.connectionType, part.connectionType],
        [pdfStrings.labels.switchingFunction, part.switchingFunction],
        [pdfStrings.labels.availableContactTypes, part.availableContactTypes.join(', ')]
      ]);
    }

    addFooter();
    doc.save(`Onccy_datasheet_${part.name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      
      {/* Breadcrumb / Back */}
      <div className="mb-6">
        <button 
          onClick={onBack}
          className="flex items-center text-slate-500 hover:text-blue-600 transition-colors font-medium text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          {t.backToConfigurator}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Header Section */}
        <div className="bg-slate-50 border-b border-slate-200 p-6 md:p-8 flex flex-col md:flex-row justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              {part.categoryType ? (
                <span className="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-3 py-1 rounded-full">
                  {part.categoryType}
                </span>
              ) : (
                <>
                  <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">{part.series}</span>
                  <span className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-2 py-1 rounded">{part.rubric}</span>
                </>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2">{part.name}</h1>
          </div>
          <div className="flex-shrink-0">
             <button 
                onClick={generatePDF}
                className="flex items-center justify-center px-6 py-3 bg-[#e31e24] hover:bg-red-700 text-white rounded-lg font-bold shadow-md transition-all transform hover:-translate-y-0.5"
             >
               <FileText className="w-5 h-5 mr-2" />
               {t.exportPdf}
             </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 lg:grid-cols-3">
          
          {/* Left: Media Column */}
          <div className="p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/50 flex flex-col gap-6">
            
            {/* 2D Image Plate */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t.productImage}</h3>
               <div className="aspect-square flex items-center justify-center bg-white rounded-lg overflow-hidden relative">
                  <img 
                    src={part.imageUrl} 
                    alt={part.name} 
                    className="max-w-full max-h-full object-contain mix-blend-multiply"
                  />
               </div>
            </div>

            {/* 3D Model Plate (Conditionally Rendered) */}
            {part.modelUrl && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                 <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 flex items-center text-sm">
                      <Box className="w-4 h-4 mr-2 text-blue-600" />
                      {t.visualization3d}
                    </h3>
                    <div className="flex items-center text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
                       <Maximize2 className="w-3 h-3 mr-1" />
                       Interactive
                    </div>
                 </div>
                 <div className="h-64 w-full bg-slate-50 relative">
                    <Canvas dpr={[1, 2]} camera={{ fov: 45, position: [0, 0, 5] }}>
                      <Stage environment="city" intensity={0.5} adjustCamera={1.2}>
                        <Model url={part.modelUrl} />
                      </Stage>
                      <OrbitControls autoRotate enableZoom={true} />
                    </Canvas>
                    <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
                       <span className="text-[10px] text-slate-400 bg-white/80 px-2 py-0.5 rounded shadow-sm">
                          {t.dragHint}
                       </span>
                    </div>
                 </div>
              </div>
            )}
          </div>

          {/* Right: Technical Data Grid */}
          <div className="lg:col-span-2 p-8 bg-white">
            <h3 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-2">{t.technicalSpecifications}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">

              {/* Basic Info (from General tab) */}
              <section>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center after:content-[''] after:flex-1 after:h-px after:bg-slate-100 after:ml-3">
                  {t.generalData}
                </h4>
                <dl className="space-y-3">
                  {part.categoryType && (
                    <div className="flex justify-between border-b border-slate-50 pb-1">
                      <dt className="text-sm text-slate-500">{t.labels.categoryType}</dt>
                      <dd className="text-sm font-medium text-slate-900">{part.categoryType}</dd>
                    </div>
                  )}
                  {(part.inputString || part.outputString) && (
                    <div className="flex justify-between border-b border-slate-50 pb-1">
                      <dt className="text-sm text-slate-500">{t.labels.inputString} / {t.labels.outputString}</dt>
                      <dd className="text-sm font-medium text-slate-900">
                        {[
                          part.inputString,
                          part.outputString
                        ].filter(Boolean).join(' / ')}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>

              {/* Electrical Data (from Technical tab) */}
              <section>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center after:content-[''] after:flex-1 after:h-px after:bg-slate-100 after:ml-3">
                  {t.design}
                </h4>
                <dl className="space-y-3">
                  {part.technicalSpecs.voltage && (
                    <div className="flex justify-between border-b border-slate-50 pb-1">
                      <dt className="text-sm text-slate-500">{t.labels.voltage}</dt>
                      <dd className="text-sm font-medium text-slate-900">{part.technicalSpecs.voltage}</dd>
                    </div>
                  )}
                </dl>
              </section>

              {/* Component Specifications - Only show if any component is selected */}
              {(part.dcIsolatedSwitch || part.acIsolatedSwitch || part.spd || part.dcMcb || part.acMcb || part.dcFuse || part.acFuse || part.dcFuseHolder || part.acFuseHolder || part.rccd || part.rcbo || part.enclosureType) && (
                <section className="md:col-span-2">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center after:content-[''] after:flex-1 after:h-px after:bg-slate-100 after:ml-3">
                    Component Specifications
                  </h4>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                    {part.dcIsolatedSwitch && (
                      <div className="flex justify-between border-b border-slate-50 pb-1">
                        <dt className="text-sm text-slate-500">DC Isolated Switch</dt>
                        <dd className="text-sm font-medium text-slate-900">
                          {part.dcIsolatedSwitch}
                          {(part.dcIsolatedSwitchQty || 1) > 1 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">× {part.dcIsolatedSwitchQty}</span>
                          )}
                        </dd>
                      </div>
                    )}
                    {part.acIsolatedSwitch && (
                      <div className="flex justify-between border-b border-slate-50 pb-1">
                        <dt className="text-sm text-slate-500">AC Isolated Switch</dt>
                        <dd className="text-sm font-medium text-slate-900">
                          {part.acIsolatedSwitch}
                          {(part.acIsolatedSwitchQty || 1) > 1 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">× {part.acIsolatedSwitchQty}</span>
                          )}
                        </dd>
                      </div>
                    )}
                    {part.spd && (
                      <div className="flex justify-between border-b border-slate-50 pb-1">
                        <dt className="text-sm text-slate-500">SPD</dt>
                        <dd className="text-sm font-medium text-slate-900">
                          {part.spd}
                          {(part.spdQty || 1) > 1 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">× {part.spdQty}</span>
                          )}
                        </dd>
                      </div>
                    )}
                    {part.dcMcb && (
                      <div className="flex justify-between border-b border-slate-50 pb-1">
                        <dt className="text-sm text-slate-500">DC MCB</dt>
                        <dd className="text-sm font-medium text-slate-900">
                          {part.dcMcb}
                          {(part.dcMcbQty || 1) > 1 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">× {part.dcMcbQty}</span>
                          )}
                        </dd>
                      </div>
                    )}
                    {part.acMcb && (
                      <div className="flex justify-between border-b border-slate-50 pb-1">
                        <dt className="text-sm text-slate-500">AC MCB</dt>
                        <dd className="text-sm font-medium text-slate-900">
                          {part.acMcb}
                          {(part.acMcbQty || 1) > 1 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">× {part.acMcbQty}</span>
                          )}
                        </dd>
                      </div>
                    )}
                    {part.dcFuse && (
                      <div className="flex justify-between border-b border-slate-50 pb-1">
                        <dt className="text-sm text-slate-500">DC Fuse</dt>
                        <dd className="text-sm font-medium text-slate-900">
                          {part.dcFuse}
                          {(part.dcFuseQty || 1) > 1 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">× {part.dcFuseQty}</span>
                          )}
                        </dd>
                      </div>
                    )}
                    {part.acFuse && (
                      <div className="flex justify-between border-b border-slate-50 pb-1">
                        <dt className="text-sm text-slate-500">AC Fuse</dt>
                        <dd className="text-sm font-medium text-slate-900">
                          {part.acFuse}
                          {(part.acFuseQty || 1) > 1 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">× {part.acFuseQty}</span>
                          )}
                        </dd>
                      </div>
                    )}
                    {part.dcFuseHolder && (
                      <div className="flex justify-between border-b border-slate-50 pb-1">
                        <dt className="text-sm text-slate-500">DC Fuse Holder</dt>
                        <dd className="text-sm font-medium text-slate-900">
                          {part.dcFuseHolder}
                          {(part.dcFuseHolderQty || 1) > 1 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">× {part.dcFuseHolderQty}</span>
                          )}
                        </dd>
                      </div>
                    )}
                    {part.acFuseHolder && (
                      <div className="flex justify-between border-b border-slate-50 pb-1">
                        <dt className="text-sm text-slate-500">AC Fuse Holder</dt>
                        <dd className="text-sm font-medium text-slate-900">
                          {part.acFuseHolder}
                          {(part.acFuseHolderQty || 1) > 1 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">× {part.acFuseHolderQty}</span>
                          )}
                        </dd>
                      </div>
                    )}
                    {part.rccd && (
                      <div className="flex justify-between border-b border-slate-50 pb-1">
                        <dt className="text-sm text-slate-500">RCCD</dt>
                        <dd className="text-sm font-medium text-slate-900">
                          {part.rccd}
                          {(part.rccdQty || 1) > 1 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">× {part.rccdQty}</span>
                          )}
                        </dd>
                      </div>
                    )}
                    {part.rcbo && (
                      <div className="flex justify-between border-b border-slate-50 pb-1">
                        <dt className="text-sm text-slate-500">RCBO</dt>
                        <dd className="text-sm font-medium text-slate-900">
                          {part.rcbo}
                          {(part.rcboQty || 1) > 1 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">× {part.rcboQty}</span>
                          )}
                        </dd>
                      </div>
                    )}
                    {part.enclosureType && (
                      <div className="flex justify-between border-b border-slate-50 pb-1">
                        <dt className="text-sm text-slate-500">Enclosure Type</dt>
                        <dd className="text-sm font-medium text-slate-900">
                          {part.enclosureType}
                          {(part.enclosureTypeQty || 1) > 1 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">× {part.enclosureTypeQty}</span>
                          )}
                        </dd>
                      </div>
                    )}
                  </dl>
                </section>
              )}

              {/* Circuit Diagram (Conditionally Rendered) */}
              {part.circuitDiagram && (
                <section className="md:col-span-2">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center after:content-[''] after:flex-1 after:h-px after:bg-slate-100 after:ml-3">
                    原理线路图
                  </h4>
                  <div 
                    className="bg-slate-50 rounded-lg border border-slate-200 p-4 cursor-pointer hover:border-blue-400 transition-colors"
                    onClick={() => openImageViewer(part.circuitDiagram!, '原理线路图')}
                  >
                    <img 
                      src={part.circuitDiagram} 
                      alt="Circuit Diagram" 
                      className="w-full h-auto object-contain max-h-96"
                    />
                    <p className="text-xs text-slate-500 text-center mt-2">点击查看大图</p>
                  </div>
                </section>
              )}

              {/* Product Dimensions (Conditionally Rendered) */}
              {part.productDimensions && (
                <section className="md:col-span-2">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center after:content-[''] after:flex-1 after:h-px after:bg-slate-100 after:ml-3">
                    产品尺寸图
                  </h4>
                  <div 
                    className="bg-slate-50 rounded-lg border border-slate-200 p-4 cursor-pointer hover:border-blue-400 transition-colors"
                    onClick={() => openImageViewer(part.productDimensions!, '产品尺寸图')}
                  >
                    <img 
                      src={part.productDimensions} 
                      alt="Product Dimensions" 
                      className="w-full h-auto object-contain max-h-96"
                    />
                    <p className="text-xs text-slate-500 text-center mt-2">点击查看大图</p>
                  </div>
                </section>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {imageViewerOpen && viewerImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
          onClick={closeImageViewer}
        >
          <div className="relative max-w-7xl max-h-full">
            {/* Close button */}
            <button
              onClick={closeImageViewer}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            
            {/* Title */}
            <div className="absolute -top-12 left-0 text-white text-lg font-medium">
              {viewerImage.title}
            </div>
            
            {/* Image */}
            <img 
              src={viewerImage.src} 
              alt={viewerImage.title}
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};
