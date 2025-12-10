
import React, { useState, useEffect } from 'react';
import { Minute, MinuteStatus, UserRole, AttendanceStatus } from '../types';
import { Calendar, MapPin, Users, ChevronRight, FileClock, Download, Filter, Search, Trash2, Clock, UserCheck } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getUsers, getUnits, getGlobalSettings } from '../services/firestoreService';
import Pagination from './Pagination';

interface MinuteListProps {
  minutes: Minute[];
  onView: (minute: Minute) => void;
  onCreate: () => void;
  onDelete?: (minute: Minute) => void;
  userRole: UserRole;
}

const MinuteList: React.FC<MinuteListProps> = ({ minutes, onView, onCreate, onDelete, userRole }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // Changed from boolean to string | null to track specific item ID
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // 3x3 Grid looks good

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate]);

  const formatDate = (dateValue: any) => {
    if (!dateValue) return '-';
    if (typeof dateValue.toDate === 'function') {
      return dateValue.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    try {
      return new Date(dateValue).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const getDayName = (dateValue: any) => {
    try {
      const d = typeof dateValue.toDate === 'function' ? dateValue.toDate() : new Date(dateValue);
      return d.toLocaleDateString('id-ID', { weekday: 'long' });
    } catch (e) {
      return '';
    }
  };

  const filteredMinutes = minutes.filter(minute => {
    const matchSearch = minute.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        minute.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStart = startDate ? minute.date >= startDate : true;
    const matchEnd = endDate ? minute.date <= endDate : true;
    return matchSearch && matchStart && matchEnd;
  });

  // Calculate Pagination Slices
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMinutes = filteredMinutes.slice(indexOfFirstItem, indexOfLastItem);

  // Strip HTML tags for PDF content
  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const isImage = (path: string) => path.startsWith('data:image');

  // Helper to get image dimensions asynchronously
  const getImageProperties = (base64: string): Promise<{ w: number, h: number, ratio: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ w: img.width, h: img.height, ratio: img.width / img.height });
      };
      img.onerror = reject;
      img.src = base64;
    });
  };

  const handleDownloadPDF = async (minute: Minute, e: React.MouseEvent) => {
    e.stopPropagation();
    if (minute.id) setDownloadingId(minute.id);
    
    try {
      // Fetch fresh data & Settings
      const [allUsers, allUnits, globalSettings] = await Promise.all([
        getUsers(), 
        getUnits(),
        getGlobalSettings()
      ]);
      
      const logo = globalSettings.logoBase64;

      // LANDSCAPE ORIENTATION
      const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
      const pageWidth = doc.internal.pageSize.width; // ~297mm for A4 Landscape
      const pageHeight = doc.internal.pageSize.height; // ~210mm

      // --- HEADER (Mimic Borang Notulen) ---
      // FONT: Times New Roman
      doc.setFont("times", "bold");
      doc.setFontSize(12);
      
      const headerTextX = logo ? 45 : 14; // Shift text right if logo exists
      
      // Render Logo if exists
      if (logo) {
         try {
           // x=14, y=10, w=25, h=25 (approx square logo area)
           doc.addImage(logo, 'PNG', 14, 5, 25, 25); 
         } catch (err) {
           console.warn("Could not render logo", err);
         }
      }

      doc.text("No.BO.29.3.1-V3 Borang Notulen", headerTextX, 15);
      // doc.text(formatDate(minute.date), headerTextX, 20); // OLD
      doc.setFontSize(12);
      doc.text("30 Agustus 2017", headerTextX, 20); // NEW STATIC DATE
      
      // Line separator
      doc.setLineWidth(0.5);
      doc.line(14, 32, pageWidth - 14, 32);

      // --- MEETING INFO (2 Columns - Landscape Adjusted) ---
      const startY = 40; // Push down due to bigger header area
      // Center of landscape page is ~148. Let's put col2 around 160.
      const col2X = 160; 
      const labelWidth = 35; // Slightly wider for landscape readability

      doc.setFontSize(11); // Slightly larger font for landscape
      doc.setFont("times", "bold");

      // Left Column
      doc.text("Acara", 14, startY); 
      doc.text(":", 14 + 20, startY); // Label width visual adjustment
      doc.setFont("times", "normal");
      
      // Handle multiline title - wider width allowed in landscape (approx 120mm)
      const titleLines = doc.splitTextToSize(minute.title, 120);
      doc.text(titleLines, 14 + 20 + 3, startY);

      doc.setFont("times", "bold");
      const titleHeight = titleLines.length * 5;
      const row2Y = startY + titleHeight + 2;
      
      doc.text("Tempat", 14, row2Y);
      doc.text(":", 14 + 20, row2Y);
      doc.setFont("times", "normal");
      doc.text(minute.location, 14 + 20 + 3, row2Y);

      doc.setFont("times", "bold");
      const row3Y = row2Y + 7;
      doc.text("Peserta", 14, row3Y);
      doc.text(":", 14 + 20, row3Y);
      doc.setFont("times", "normal");
      doc.text("Sesuai Daftar Hadir (Terlampir)", 14 + 20 + 3, row3Y);

      // Right Column
      doc.setFont("times", "bold");
      doc.text("Hari/Tanggal", col2X, startY);
      doc.text(":", col2X + labelWidth, startY);
      doc.setFont("times", "normal");
      doc.text(`${getDayName(minute.date)} / ${formatDate(minute.date)}`, col2X + labelWidth + 3, startY);

      doc.setFont("times", "bold");
      doc.text("Jam", col2X, startY + 7);
      doc.text(":", col2X + labelWidth, startY + 7);
      doc.setFont("times", "normal");
      doc.text(`${minute.time || '-'} WIB`, col2X + labelWidth + 3, startY + 7);

      doc.setFont("times", "bold");
      doc.text("PIC", col2X, startY + 14);
      doc.text(":", col2X + labelWidth, startY + 14);
      doc.setFont("times", "normal");
      doc.text(minute.picName || '-', col2X + labelWidth + 3, startY + 14);

      // --- 1. TABLE OF CONTENTS (AGENDA) ---
      const tableStartY = Math.max(row3Y, startY + 14) + 10;
      
      const tableColumn = ["No", "Pokok Bahasan", "Keputusan", "Tindakan", "PIC", "Monitoring"];
      const tableRows = [];

      if (minute.items && minute.items.length > 0) {
        minute.items.forEach((item, index) => {
          const itemData = [
            index + 1,
            item.topic,
            stripHtml(item.decision),
            stripHtml(item.action),
            item.pic,
            item.monitoring
          ];
          tableRows.push(itemData);
        });
      } else {
          tableRows.push(['-', 'Tidak ada item pembahasan', '-', '-', '-', '-']);
      }

      autoTable(doc, {
        startY: tableStartY,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: { 
          fillColor: [242, 242, 242], // F2F2F2
          textColor: [0, 0, 0], 
          lineWidth: 0.1, 
          lineColor: [0,0,0],
          halign: 'center',
          valign: 'middle',
          font: 'times', // Set font to Times
          fontStyle: 'bold'
        },
        styles: { 
          font: 'times', // Set font to Times
          fontSize: 10, 
          cellPadding: 3, 
          lineColor: [0,0,0], 
          lineWidth: 0.1,
          textColor: [0,0,0],
          overflow: 'linebreak'
        },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 50 },
          2: { cellWidth: 65 },
          3: { cellWidth: 65 }, // Wider columns due to landscape
          4: { cellWidth: 35 },
          5: { cellWidth: 40 }
        }
      });

      let currentY = (doc as any).lastAutoTable.finalY + 10;

      // --- 2. SIGNATURES (PIC) - MOVED HERE BELOW AGENDA TABLE ---
      // Check if we have enough space, otherwise add page
      if (currentY + 40 > 190) { 
          doc.addPage(); 
          currentY = 20; 
      }
      
      doc.setFontSize(11);
      doc.setFont("times", "normal");
      
      // Position at right side of Landscape page (PageWidth ~297)
      const signX = 230; 
      doc.text("Mengetahui,", signX, currentY);
      doc.text("Penanggung Jawab Rapat", signX, currentY + 5);
      
      if (minute.picSignature) {
          try {
            doc.addImage(minute.picSignature, 'PNG', signX, currentY + 10, 30, 15);
          } catch(e) {}
          doc.text(`( ${minute.picName} )`, signX, currentY + 35);
      } else {
          doc.text("..........................................", signX, currentY + 30);
          doc.text(`( ${minute.picName} )`, signX, currentY + 35);
      }

      // Add space after signature for attachments
      currentY += 45;


      // --- 3. ATTACHMENTS (LAMPIRAN) ---
      if (minute.attachments && minute.attachments.length > 0) {
        
        // Ensure we are on a new page if space is tight
        if (currentY > 170) { 
            doc.addPage(); 
            currentY = 20; 
        } else {
            // Add some spacing
             currentY += 10;
        }

        doc.setFont("times", "bold");
        doc.setFontSize(12);
        doc.text("Lampiran:", 14, currentY);
        currentY += 10;

        // Separate Images and Docs
        const imageAttachments = minute.attachments.filter(att => isImage(att.filePath));
        const docAttachments = minute.attachments.filter(att => !isImage(att.filePath));

        // List Documents First
        if (docAttachments.length > 0) {
            doc.setFont("times", "normal");
            doc.setFontSize(11);
            docAttachments.forEach(att => {
                if (currentY > 190) { doc.addPage(); currentY = 20; }
                doc.text(`- ${att.fileName} (Dokumen/File)`, 14, currentY);
                currentY += 6;
            });
            currentY += 5; // Spacing after docs
        }

        // Render Images in Grid (3 Columns for Landscape - Hemat Kertas)
        if (imageAttachments.length > 0) {
            const marginX = 14;
            const gapX = 5; // Smaller gap
            const availableWidth = pageWidth - (2 * marginX);
            const colWidth = (availableWidth - (gapX * 2)) / 3; // 3 Columns
            const rowHeight = 75; // Reduced Fixed height allocated for image + text

            // Grid State
            let colIndex = 0; // 0, 1, or 2

            for (const att of imageAttachments) {
                 // Check vertical space for new row
                 if (colIndex === 0 && currentY + rowHeight > pageHeight - 10) {
                     doc.addPage();
                     currentY = 20;
                 }

                 try {
                     // 1. Get Image Dimensions to calculate proportional fit
                     const dims = await getImageProperties(att.filePath);
                     
                     // 2. Define Box Area (leaving space for caption)
                     const boxW = colWidth;
                     const boxH = rowHeight - 10; // Reserve 10mm for filename text
                     
                     // 3. Calculate Scale to Fit Proportinally
                     // We want to fit the image INSIDE boxW x boxH without stretching
                     const scale = Math.min(boxW / dims.w, boxH / dims.h);
                     
                     const finalW = dims.w * scale;
                     const finalH = dims.h * scale;

                     // 4. Center the image in the box
                     const xOffset = (boxW - finalW) / 2;
                     const yOffset = (boxH - finalH) / 2;

                     const xPos = marginX + (colIndex * (colWidth + gapX)) + xOffset;
                     const yPos = currentY + yOffset;

                     // 5. Draw Image
                     doc.addImage(att.filePath, 'JPEG', xPos, yPos, finalW, finalH);

                     // 6. Draw Caption (Centered under box)
                     const captionX = marginX + (colIndex * (colWidth + gapX)) + (colWidth / 2);
                     const captionY = currentY + boxH + 5;
                     
                     doc.setFont("times", "normal");
                     doc.setFontSize(8); // Smaller font for 3 columns
                     
                     // Handle long text wrapping
                     const splitTitle = doc.splitTextToSize(att.fileName, colWidth);
                     doc.text(splitTitle, captionX, captionY, { align: 'center' });

                 } catch (err) {
                     console.error("Failed to process image for PDF", err);
                     // Fallback text
                     const xPos = marginX + (colIndex * (colWidth + gapX));
                     doc.text(`(Gagal memuat gambar: ${att.fileName})`, xPos, currentY + 10);
                 }

                 // Grid Logic
                 if (colIndex === 2) {
                     // End of row, reset col and move down
                     colIndex = 0;
                     currentY += rowHeight;
                 } else {
                     // Move to next col
                     colIndex++;
                 }
            }
        }
      }

      // --- 4. PARTICIPANTS (BORANG DAFTAR HADIR) - FIXED LAYOUT ---
      
      const totalParticipants = minute.participants.length;
      // Force at least 1 page generation, even if empty.
      // Logic: 60 slots per page. If 65 participants -> 2 pages.
      const slotsPerPage = 60;
      const totalPages = Math.max(1, Math.ceil(totalParticipants / slotsPerPage));

      for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
        doc.addPage("a4", "landscape"); // Landscape page
        
        // --- HEADER SECTION (Fixed Y Coordinates) ---
        const logoY = 5;
        const logoSize = 20;
        
        // 1. Logo
        if (logo) {
          try {
            doc.addImage(logo, 'PNG', 14, logoY, logoSize, logoSize); 
          } catch (err) {}
        }

        // 2. Title Text
        const headerX = logo ? 40 : 14;
        doc.setFont("times", "bold");
        doc.setFontSize(12);
        doc.text("No.BO.29.3.2-V1 Borang Daftar Hadir", headerX, 15);
        
        doc.setFontSize(12);
        doc.text("27 November 2017", headerX, 20); // STATIC DATE AS REQUESTED

        // 3. Line Separator
        doc.setLineWidth(0.5);
        doc.line(14, 27, pageWidth - 14, 27);

        // 4. Meeting Info (Centered & Underlined)
        const infoStartY = 33; 
        
        // Calculate centered X positions
        // Page width ~297mm. Info block width estimate ~135mm.
        // Start X = (297 - 135) / 2 = ~81
        const labelX = 80; 
        const colonX = labelX + 35;
        const valueX = colonX + 2;
        const lineLength = 110; // Length of underline

        const drawInfoRow = (label: string, value: string, y: number) => {
           doc.setFont("times", "bold");
           doc.text(label, labelX, y);
           doc.text(":", colonX, y);
           
           doc.setFont("times", "normal");
           doc.text(value, valueX, y);
           
           // Draw Underline
           doc.setLineWidth(0.1);
           doc.line(valueX, y + 1, valueX + lineLength, y + 1);
        };

        // Hari / Tanggal
        drawInfoRow("Hari / Tanggal", `${getDayName(minute.date)} / ${formatDate(minute.date)}`, infoStartY);
        
        // Jam
        drawInfoRow("Jam", `${minute.time || '-'} WIB`, infoStartY + 6);

        // Tempat
        drawInfoRow("Tempat", minute.location, infoStartY + 12);

        // Acara
        // For Acara, truncate if too long for one line to keep layout consistent
        doc.setFont("times", "bold");
        doc.text("Acara", labelX, infoStartY + 18);
        doc.text(":", colonX, infoStartY + 18);
        
        doc.setFont("times", "normal");
        const acaraText = minute.title.length > 55 ? minute.title.substring(0, 55) + '...' : minute.title;
        doc.text(acaraText, valueX, infoStartY + 18);
        
        // Underline for Acara
        doc.setLineWidth(0.1);
        doc.line(valueX, infoStartY + 19, valueX + lineLength, infoStartY + 19);


        // --- TABLE SECTION (3 Columns Side by Side) ---
        // Layout: 3 columns. Each column has 20 rows. Total 60 per page.
        // Start Y fixed at 52mm (moved up slightly)
        // Row Height = 6.5mm
        
        const tableStartYFixed = 52;
        const columnsPerPage = 3;
        const rowsPerColumn = 20;
        const pageMarginX = 14;
        const tableGap = 5;
        const availableWidth = pageWidth - (pageMarginX * 2);
        const columnWidth = (availableWidth - (tableGap * (columnsPerPage - 1))) / columnsPerPage;

        for (let col = 0; col < columnsPerPage; col++) {
          const columnStartX = pageMarginX + (col * (columnWidth + tableGap));
          const columnData = [];
          
          // Generate exactly 20 rows for this column
          for (let r = 0; r < rowsPerColumn; r++) {
             // Calculate numbering (1-60 per page)
             const displayNum = (col * rowsPerColumn) + r + 1;
             
             // Calculate real data index
             const globalIndex = (pageIdx * slotsPerPage) + (displayNum - 1);
             const participant = minute.participants[globalIndex];
             
             let name = '';
             let unit = '';
             let paraf = '';
             let isPresent = false;
             let signatureUrl = null;

             if (participant) {
                name = participant.name;
                
                // RESOLVE UNIT ABBREVIATION
                let resolvedUnitName = participant.unitName || '';
                const userObj = allUsers.find(u => u.id === participant.userId);
                
                if (userObj && userObj.unitId) {
                    const unitObj = allUnits.find(u => u.id === userObj.unitId);
                    if (unitObj) {
                        resolvedUnitName = unitObj.abbreviation || unitObj.name;
                    }
                } else if (participant.unitName) {
                    const matchingUnit = allUnits.find(u => u.name === participant.unitName);
                    if (matchingUnit) {
                        resolvedUnitName = matchingUnit.abbreviation || matchingUnit.name;
                    }
                }
                unit = resolvedUnitName;

                if (participant.attendance === AttendanceStatus.TIDAK_HADIR) {
                  paraf = 'Tidak Hadir';
                } else if (participant.attendance === AttendanceStatus.HADIR) {
                   isPresent = true;
                   signatureUrl = participant.signature;
                }
             }

             // Push data. If participant is undefined, push empty strings for drawing empty boxes
             columnData.push({
               no: displayNum + '.',
               name: name,
               unit: unit,
               paraf: paraf,
               signature: signatureUrl,
               isPresent: isPresent
             });
          }

          // Use autoTable for this column
          autoTable(doc, {
            startY: tableStartYFixed,
            margin: { left: columnStartX, bottom: 5 },
            tableWidth: columnWidth,
            head: [['No.', 'NAMA', 'BAGIAN', 'PARAF']],
            body: columnData.map(d => [d.no, d.name, d.unit, d.paraf]),
            theme: 'grid',
            headStyles: { 
              fillColor: [242, 242, 242], // Light Gray Header
              textColor: [0, 0, 0],
              lineWidth: 0.1, 
              lineColor: [0,0,0],
              halign: 'center',
              valign: 'middle',
              fontStyle: 'bold',
              font: 'times',
              fontSize: 9,
              minCellHeight: 6.5
            },
            styles: {
              lineColor: [0,0,0], 
              lineWidth: 0.1,
              textColor: [0,0,0],
              fontSize: 9, 
              cellPadding: 1,
              font: 'times',
              minCellHeight: 6.5, // Fixed height to ensuring 20 rows fit (6.5 * 20 = 130mm)
              valign: 'middle',
              overflow: 'hidden' 
            },
            columnStyles: {
              0: { cellWidth: 8, halign: 'center' }, // No.
              1: { cellWidth: 'auto' }, // Nama
              2: { cellWidth: 20 }, // Bagian
              3: { cellWidth: 18 } // Paraf
            },
            didParseCell: (data) => {
               // Red text for "Tidak Hadir"
               if (data.section === 'body' && data.column.index === 3) {
                 const cellText = data.cell.raw as string;
                 if (cellText === 'Tidak Hadir') {
                     data.cell.styles.textColor = [220, 38, 38];
                     data.cell.styles.fontStyle = 'italic';
                     data.cell.styles.fontSize = 7;
                 }
               }
            },
            didDrawCell: (data) => {
              // Draw Signature Image if present
              if (data.section === 'body' && data.column.index === 3) {
                 const rowIndex = data.row.index;
                 const rowData = columnData[rowIndex];
                 
                 if (rowData.isPresent && rowData.signature) {
                      const imageWidth = 12; 
                      const imageHeight = 5; 
                      // Center image
                      const x = data.cell.x + (data.cell.width - imageWidth) / 2;
                      const y = data.cell.y + (data.cell.height - imageHeight) / 2;
                      try {
                        doc.addImage(rowData.signature, 'PNG', x, y, imageWidth, imageHeight);
                      } catch(e) {}
                 }
              }
            }
          });
        }
      }

      doc.save(`Daftar-Hadir-${minute.title.replace(/\s+/g, '-')}.pdf`);

    } catch (error) {
      console.error("Export failed", error);
      alert("Gagal mengexport PDF. Coba refresh halaman.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Daftar Notulen</h2>
          <p className="text-slate-500 mt-1">
            {userRole === UserRole.ADMIN ? 'Seluruh notulen rapat (Read Only)' : 'Kelola data notulen rapat'}
          </p>
        </div>
        {userRole === UserRole.NOTULIS && (
          <button 
            onClick={onCreate}
            className="bg-primary hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2"
          >
            <span className="text-lg">+</span> Tambah Notulen
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center">
        <div className="flex-1 w-full">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari Judul atau Lokasi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>
        <div className="w-full md:w-auto">
          <input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)} 
            className="bg-white text-slate-900 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
        <div className="w-full md:w-auto">
          <input 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)} 
            className="bg-white text-slate-900 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
      </div>

      {filteredMinutes.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <FileClock className="text-slate-400 mx-auto mb-4" size={32} />
          <h3 className="text-lg font-medium text-slate-900">Tidak ada notulen ditemukan</h3>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentMinutes.map((minute) => (
              <div 
                key={minute.id}
                onClick={() => onView(minute)}
                className="group bg-white rounded-xl border border-slate-200 hover:border-primary hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col h-full relative"
              >
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${minute.status === MinuteStatus.FINAL ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                      {minute.status === MinuteStatus.FINAL ? 'Final' : 'Draft'}
                    </span>
                    
                    <div className="flex gap-1">
                      <button 
                        onClick={(e) => !downloadingId && handleDownloadPDF(minute, e)} 
                        disabled={!!downloadingId}
                        className="text-slate-400 hover:text-primary p-1 disabled:opacity-50" 
                        title="Download PDF"
                      >
                        {downloadingId === minute.id ? <Clock size={18} className="animate-spin"/> : <Download size={18} />}
                      </button>
                      {userRole === UserRole.NOTULIS && onDelete && (
                        <button onClick={(e) => { e.stopPropagation(); onDelete(minute); }} className="text-slate-400 hover:text-red-500 p-1" title="Hapus Notulen"><Trash2 size={18} /></button>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-primary transition-colors line-clamp-2">{minute.title}</h3>
                  
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center text-sm text-slate-500">
                      <Calendar size={14} className="mr-2 text-slate-400" />
                      <span>{formatDate(minute.date)} &bull; {minute.time}</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-500">
                      <MapPin size={14} className="mr-2 text-slate-400" />
                      <span className="truncate">{minute.location}</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-500">
                      <UserCheck size={14} className="mr-2 text-slate-400" />
                      <span className="truncate">PIC: {minute.picName || '-'}</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-500">
                      <Users size={14} className="mr-2 text-slate-400" />
                      <span>{minute.participants?.length || 0} Peserta</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Pagination 
            currentPage={currentPage}
            totalItems={filteredMinutes.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
};

export default MinuteList;
