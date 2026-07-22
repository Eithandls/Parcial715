/**
 * Cinema Club - Export Utility Module
 * Soporta exportación a PDF, XLS (Excel), XML y CSV con diseño limpio y profesional.
 */

window.Exporters = {
  /**
   * Helper para escapar caracteres especiales en XML
   */
  escapeXML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  },

  /**
   * Helper para descargar un Blob con el nombre de archivo dado
   */
  downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Exportar a PDF usando jsPDF + autoTable (con fallback a ventana de impresión estilizada)
   */
  toPDF({ title, subtitle, summary = [], columns = [], data = [], filename = 'reporte.pdf' }) {
    if (!data || data.length === 0) {
      return Components.showToast('No hay datos para exportar', 'error');
    }

    // Intentar usando jsPDF si está cargado
    if (window.jspdf && window.jspdf.jsPDF) {
      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();

        // Encabezado Corporativo
        doc.setFillColor(79, 70, 229); // Primary color #4f46e5
        doc.rect(0, 0, pageWidth, 24, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Cinema Club', 14, 12);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Sistema de Renta de Películas', 14, 18);
        doc.text(`Fecha: ${new Date().toLocaleString('es-DO')}`, pageWidth - 14, 15, { align: 'right' });

        // Título del Reporte
        let currentY = 32;
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 14, currentY);
        currentY += 6;

        if (subtitle) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text(subtitle, 14, currentY);
          currentY += 8;
        } else {
          currentY += 2;
        }

        // Resumen / KPIs
        if (summary && summary.length > 0) {
          doc.setFillColor(241, 245, 249);
          doc.roundedRect(14, currentY, pageWidth - 28, 14 + (Math.ceil(summary.length / 2) - 1) * 6, 2, 2, 'F');
          
          doc.setFontSize(9);
          let itemX = 18;
          let itemY = currentY + 6;
          summary.forEach((item, index) => {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(79, 70, 229);
            doc.text(`${item.label}: `, itemX, itemY);
            
            const labelWidth = doc.getTextWidth(`${item.label}: `);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 41, 59);
            doc.text(`${item.value}`, itemX + labelWidth, itemY);

            if (index % 2 === 0) {
              itemX = pageWidth / 2 + 5;
            } else {
              itemX = 18;
              itemY += 6;
            }
          });
          currentY += 18 + (Math.ceil(summary.length / 2) - 1) * 6;
        }

        // Mapear Columnas y Datos para autoTable
        const tableHeaders = columns.map(c => c.label);
        const tableData = data.map(row => {
          return columns.map(col => {
            let val = row[col.key];
            if (col.render) {
              val = col.render(val, row);
              // Remover HTML tags si los hubiera
              val = String(val).replace(/<[^>]*>?/gm, '');
            }
            return val ?? '';
          });
        });

        // Generar Tabla con autoTable
        doc.autoTable({
          startY: currentY,
          head: [tableHeaders],
          body: tableData,
          theme: 'striped',
          headStyles: {
            fillColor: [79, 70, 229],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [51, 65, 85]
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252]
          },
          margin: { left: 14, right: 14 },
          didDrawPage: (dataArg) => {
            // Pie de página
            const str = `Página ${doc.internal.getNumberOfPages()}`;
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(str, pageWidth - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
            doc.text('Cinema Club — Documento Generado Oficial', 14, doc.internal.pageSize.getHeight() - 10);
          }
        });

        doc.save(filename);
        Components.showToast('Reporte PDF descargado exitosamente');
        return;
      } catch (err) {
        console.warn('Fallback a vista de impresión:', err);
      }
    }

    // Fallback: Ventana de impresión limpia
    this.printFallback({ title, subtitle, summary, columns, data });
  },

  /**
   * Ventana de Impresión Estilizada como Fallback para PDF
   */
  printFallback({ title, subtitle, summary, columns, data }) {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      return Components.showToast('Por favor permite ventanas emergentes para exportar', 'error');
    }

    const summaryHtml = summary && summary.length ? `
      <div style="display: flex; gap: 16px; margin-bottom: 20px; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
        ${summary.map(s => `<div><strong style="color:#4f46e5;">${s.label}:</strong> <span>${s.value}</span></div>`).join('')}
      </div>
    ` : '';

    const tableHeaders = columns.map(c => `<th>${c.label}</th>`).join('');
    const tableRows = data.map(row => {
      const cells = columns.map(col => {
        let val = row[col.key];
        if (col.render) {
          val = col.render(val, row);
          val = String(val).replace(/<[^>]*>?/gm, '');
        }
        return `<td>${val ?? ''}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title} - Cinema Club</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; padding: 24px; margin: 0; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 20px; }
          .brand { font-size: 22px; font-weight: bold; color: #4f46e5; }
          .subtitle { font-size: 12px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
          th { background: #4f46e5; color: white; text-align: left; padding: 8px 10px; font-weight: 600; }
          td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background: #f8fafc; }
          .footer { margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: space-between; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">Cinema Club</div>
            <div class="subtitle">Sistema de Renta de Películas</div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #64748b;">
            Fecha: ${new Date().toLocaleString('es-DO')}
          </div>
        </div>
        <h2>${title}</h2>
        ${subtitle ? `<p style="color:#64748b; font-size:13px; margin-top:-8px;">${subtitle}</p>` : ''}
        ${summaryHtml}
        <table>
          <thead><tr>${tableHeaders}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <div class="footer">
          <span>Cinema Club — Reporte Oficial</span>
          <span>Página 1</span>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  },

  /**
   * Exportar a Excel (.xls con formato HTML estilizado y codificación UTF-8)
   */
  toXLS({ title, summary = [], columns = [], data = [], filename = 'reporte.xls' }) {
    if (!data || data.length === 0) {
      return Components.showToast('No hay datos para exportar', 'error');
    }

    const summaryRows = summary && summary.length ? summary.map(s => `
      <tr>
        <td colspan="2" style="font-weight:bold; background-color:#f1f5f9; color:#4f46e5;">${this.escapeXML(s.label)}:</td>
        <td colspan="${columns.length - 2}" style="background-color:#f1f5f9; color:#1e293b;">${this.escapeXML(s.value)}</td>
      </tr>
    `).join('') : '';

    const headers = columns.map(c => `
      <th style="background-color:#4f46e5; color:#ffffff; font-weight:bold; border:1px solid #cbd5e1; padding:8px; text-align:left;">
        ${this.escapeXML(c.label)}
      </th>
    `).join('');

    const rows = data.map((row, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const cells = columns.map(col => {
        let val = row[col.key];
        if (col.render) {
          val = col.render(val, row);
          val = String(val).replace(/<[^>]*>?/gm, '');
        }
        return `<td style="background-color:${bg}; border:1px solid #e2e8f0; padding:6px; color:#334155;">${this.escapeXML(val ?? '')}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    const xlsContent = `\uFEFF
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${this.escapeXML(title.substring(0, 30))}</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body>
        <h2>${this.escapeXML(title)}</h2>
        <p style="color:#64748b;">Generado el ${new Date().toLocaleString('es-DO')}</p>
        <table border="1" style="border-collapse:collapse; font-family:Arial, sans-serif; font-size:12px;">
          ${summaryRows ? `<thead>${summaryRows}<tr><td colspan="${columns.length}"></td></tr></thead>` : ''}
          <thead>
            <tr>${headers}</tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
      </html>
    `;

    this.downloadBlob(xlsContent, filename, 'application/vnd.ms-excel;charset=utf-8');
    Components.showToast('Archivo Excel (.xls) descargado exitosamente');
  },

  /**
   * Exportar a XML formateado y limpio
   */
  toXML({ title, summary = [], columns = [], data = [], filename = 'reporte.xml' }) {
    if (!data || data.length === 0) {
      return Components.showToast('No hay datos para exportar', 'error');
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<cinema_club_reporte>\n`;
    xml += `  <meta>\n`;
    xml += `    <titulo>${this.escapeXML(title)}</titulo>\n`;
    xml += `    <fecha_generacion>${new Date().toISOString()}</fecha_generacion>\n`;
    xml += `    <total_registros>${data.length}</total_registros>\n`;
    xml += `  </meta>\n`;

    if (summary && summary.length) {
      xml += `  <resumen>\n`;
      summary.forEach(s => {
        const tag = s.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
        xml += `    <${tag}>${this.escapeXML(s.value)}</${tag}>\n`;
      });
      xml += `  </resumen>\n`;
    }

    xml += `  <items>\n`;
    data.forEach((row, i) => {
      xml += `    <item id="${row.id || i + 1}">\n`;
      columns.forEach(col => {
        let val = row[col.key];
        if (col.render) {
          val = col.render(val, row);
          val = String(val).replace(/<[^>]*>?/gm, '');
        }
        const tag = col.key.toLowerCase().replace(/[^a-z0-9]/g, '_');
        xml += `      <${tag}>${this.escapeXML(val ?? '')}</${tag}>\n`;
      });
      xml += `    </item>\n`;
    });
    xml += `  </items>\n`;
    xml += `</cinema_club_reporte>`;

    this.downloadBlob(xml, filename, 'application/xml;charset=utf-8');
    Components.showToast('Archivo XML descargado exitosamente');
  },

  /**
   * Exportar a CSV con BOM UTF-8
   */
  toCSV({ columns = [], data = [], filename = 'reporte.csv' }) {
    if (!data || data.length === 0) {
      return Components.showToast('No hay datos para exportar', 'error');
    }

    const headers = columns.map(c => `"${c.label.replace(/"/g, '""')}"`);
    const rows = data.map(row => {
      return columns.map(col => {
        let val = row[col.key];
        if (col.render) {
          val = col.render(val, row);
          val = String(val).replace(/<[^>]*>?/gm, '');
        }
        return `"${String(val ?? '').replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    this.downloadBlob(csvContent, filename, 'text/csv;charset=utf-8');
    Components.showToast('Archivo CSV descargado exitosamente');
  },

  /**
   * Exportar Comprobante / Recibo Individual de Renta (PDF, XLS, XML)
   */
  exportRentalReceipt(renta, format = 'pdf') {
    if (!renta) return Components.showToast('Datos de la renta no válidos', 'error');

    const title = `Comprobante de Renta #${renta.id}`;
    const filename = `comprobante_renta_${renta.id}_${new Date().toISOString().split('T')[0]}.${format}`;

    const summary = [
      { label: 'Número Renta', value: `#${renta.id}` },
      { label: 'Cliente', value: `${renta.cliente_nombre || ''} ${renta.cliente_apellido || ''}` },
      { label: 'Cédula Cliente', value: renta.cliente_cedula || 'N/A' },
      { label: 'Artículo Renta', value: renta.articulo_titulo || '' },
      { label: 'Fecha Renta', value: renta.fecha_renta ? renta.fecha_renta.split('T')[0] : '' },
      { label: 'Devolución Prevista', value: renta.fecha_devolucion_prevista ? renta.fecha_devolucion_prevista.split('T')[0] : '' },
      { label: 'Días Rentados', value: `${renta.dias || 1} días` },
      { label: 'Costo por Día', value: Components.formatCurrency(renta.monto_por_dia || (renta.total / (renta.dias || 1))) },
      { label: 'Total Pagado', value: Components.formatCurrency(renta.total) }
    ];

    const columns = [
      { key: 'campo', label: 'Detalle' },
      { key: 'valor', label: 'Información' }
    ];

    const data = summary.map(s => ({ campo: s.label, valor: s.value }));

    if (format === 'pdf') {
      this.toPDF({ title, subtitle: 'Comprobante Oficial de Renta de Película', summary: [], columns, data, filename });
    } else if (format === 'xls') {
      this.toXLS({ title, summary: [], columns, data, filename });
    } else if (format === 'xml') {
      this.toXML({ title, summary: [], columns, data, filename });
    }
  }
};
