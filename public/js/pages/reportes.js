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
            <button class="btn btn-outline" onclick="window.Reportes.exportCSV()">
              <span class="material-symbols-outlined">download</span> Exportar CSV
            </button>
          </div>
          ${Components.dataTable(columns, res.data)}
        </div>`;

        document.getElementById('reportes-content').innerHTML = html;
      } catch (e) {
        document.getElementById('reportes-content').innerHTML = `<p class="text-error">${e.message}</p>`;
      }
    },

    exportCSV() {
      if (!currentData || currentData.length === 0) return Components.showToast('No hay datos para exportar', 'error');

      const headers = ['ID Renta', 'Fecha Renta', 'Cliente', 'Articulo', 'Tipo', 'Dias', 'Total (RD$)'];
      const rows = currentData.map(r => [
        r.id,
        r.fecha_renta.split('T')[0],
        `"${r.cliente_nombre} ${r.cliente_apellido}"`,
        `"${r.articulo_titulo}"`,
        `"${r.tipo_articulo}"`,
        r.dias,
        r.total
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(e => e.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `reporte_rentas_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
