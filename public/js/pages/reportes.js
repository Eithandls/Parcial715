App.registerPage('reportes', async (container) => {
  let tipos = [];
  try {
    tipos = await API.getAll('tipos_articulo');
  } catch(e) {}

  // Fechas por defecto (Mes actual)
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  let currentData = null;

  window.Reportes = {
    async generar() {
      const params = {
        fecha_desde: document.getElementById('rep-desde').value,
        fecha_hasta: document.getElementById('rep-hasta').value,
        tipo_articulo_id: document.getElementById('rep-tipo').value
      };

      document.getElementById('reportes-content').innerHTML = Components.loading();

      try {
        const res = await API.reportes(params);
        currentData = res.data;

        let html = `<div class="grid-4 mb-lg">
          ${Components.kpiCard('receipt_long', 'Total de Rentas', res.summary.totalRentas, '', 'primary')}
          ${Components.kpiCard('account_balance', 'Ingresos Totales', Components.formatCurrency(res.summary.ingresosTotales), '', 'success')}
          ${Components.kpiCard('avg_time', 'Promedio por Renta', Components.formatCurrency(res.summary.promedioRenta), '', 'secondary')}
          ${Components.kpiCard('star', 'Más Rentado', res.summary.articuloMasRentado || 'N/A', '', 'warning')}
        </div>`;

        const columns = [
          { key: 'fecha_renta', label: 'Fecha', render: Components.formatDate },
          { key: 'cliente_nombre', label: 'Cliente', render: (v, r) => `${v} ${r.cliente_apellido}` },
          { key: 'articulo_titulo', label: 'Artículo' },
          { key: 'tipo_articulo', label: 'Tipo' },
          { key: 'dias', label: 'Días' },
          { key: 'total', label: 'Ingreso', render: Components.formatCurrency },
        ];

        html += `<div class="card">
          <div class="page-header" style="margin-bottom:16px;">
            <h3 style="font-size:18px; color:var(--on-surface);">Detalle de Transacciones</h3>
            ${Components.exportButtons('window.Reportes.exportar')}
          </div>
          ${Components.dataTable(columns, res.data)}
        </div>`;

        document.getElementById('reportes-content').innerHTML = html;
      } catch (e) {
        document.getElementById('reportes-content').innerHTML = `<p class="text-error">${e.message}</p>`;
      }
    },

    exportar(format = 'pdf') {
      if (!currentData || currentData.length === 0) {
        return Components.showToast('No hay datos para exportar', 'error');
      }

      const desde = document.getElementById('rep-desde').value;
      const hasta = document.getElementById('rep-hasta').value;

      const title = 'Reporte Financiero de Rentas';
      const subtitle = `Período: ${desde} al ${hasta}`;
      const filename = `reporte_financiero_${desde}_al_${hasta}.${format}`;

      const summary = [
        { label: 'Total de Rentas', value: currentData.length.toString() },
        { label: 'Ingresos Totales', value: Components.formatCurrency(currentData.reduce((s, r) => s + (r.total || 0), 0)) }
      ];

      const columns = [
        { key: 'id', label: 'ID Renta' },
        { key: 'fecha_renta', label: 'Fecha Renta', render: Components.formatDate },
        { key: 'cliente_nombre', label: 'Cliente', render: (v, r) => `${v} ${r.cliente_apellido}` },
        { key: 'articulo_titulo', label: 'Artículo' },
        { key: 'tipo_articulo', label: 'Tipo' },
        { key: 'dias', label: 'Días' },
        { key: 'total', label: 'Ingreso (RD$)', render: Components.formatCurrency }
      ];

      if (format === 'pdf') {
        Exporters.toPDF({ title, subtitle, summary, columns, data: currentData, filename });
      } else if (format === 'xls') {
        Exporters.toXLS({ title, summary, columns, data: currentData, filename });
      } else if (format === 'xml') {
        Exporters.toXML({ title, summary, columns, data: currentData, filename });
      } else if (format === 'csv') {
        Exporters.toCSV({ columns, data: currentData, filename });
      }
    }
  };

  container.innerHTML = `
    ${Components.pageHeader('Reportes Financieros', 'Análisis de ingresos y rentas por período')}
    
    <div class="card mb-lg">
      <form onsubmit="event.preventDefault(); window.Reportes.generar()">
        <div class="grid-3 align-center">
          <div class="form-group mb-0">
            <label>Desde Fecha</label>
            <input type="date" id="rep-desde" class="form-control" value="${firstDay}" required>
          </div>
          <div class="form-group mb-0">
            <label>Hasta Fecha</label>
            <input type="date" id="rep-hasta" class="form-control" value="${lastDay}" required>
          </div>
          <div class="form-group mb-0">
            <label>Tipo de Artículo</label>
            <select id="rep-tipo" class="form-control">
              <option value="Todos">Todos los tipos</option>
              ${tipos.map(t => `<option value="${t.id}">${t.descripcion}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="margin-top:16px; display:flex; justify-content:flex-end;">
          <button type="submit" class="btn btn-primary"><span class="material-symbols-outlined">analytics</span> Generar Reporte</button>
        </div>
      </form>
    </div>

    <div id="reportes-content"></div>
  `;

  // Init
  window.Reportes.generar();
});
