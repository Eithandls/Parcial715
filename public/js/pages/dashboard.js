App.registerPage('dashboard', async (container) => {
  try {
    const data = await API.dashboard();

    window.Dashboard = {
      rentasRecientes: data.rentasRecientes || [],

      exportar(format = 'pdf') {
        if (!this.rentasRecientes.length) {
          return Components.showToast('No hay rentas recientes para exportar', 'error');
        }

        const title = 'Rentas Recientes — Cinema Club';
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `rentas_recientes_${dateStr}.${format}`;

        const summary = [
          { label: 'Rentas Recientes Registradas', value: this.rentasRecientes.length.toString() },
          { label: 'Fecha Exportación', value: new Date().toLocaleDateString('es-DO') }
        ];

        const columns = [
          { key: 'id', label: 'ID Renta' },
          { key: 'cliente_nombre', label: 'Cliente', render: (v, r) => `${v} ${r.cliente_apellido}` },
          { key: 'articulo_titulo', label: 'Artículo' },
          { key: 'fecha_renta', label: 'Fecha Renta', render: Components.formatDate },
          { key: 'estado', label: 'Estado' },
          { key: 'total', label: 'Total', render: Components.formatCurrency }
        ];

        if (format === 'pdf') {
          Exporters.toPDF({ title, subtitle: 'Últimas rentas del sistema', summary, columns, data: this.rentasRecientes, filename });
        } else if (format === 'xls') {
          Exporters.toXLS({ title, summary, columns, data: this.rentasRecientes, filename });
        } else if (format === 'xml') {
          Exporters.toXML({ title, summary, columns, data: this.rentasRecientes, filename });
        } else if (format === 'csv') {
          Exporters.toCSV({ columns, data: this.rentasRecientes, filename });
        }
      }
    };
    
    let html = Components.pageHeader(
      'Dashboard', 
      'Vista general del sistema Cinema Club',
      `<button class="btn btn-outline" onclick="App.navigate('rentas')">
         <span class="material-symbols-outlined">add</span> Nueva Renta
       </button>`
    );

    // KPIs
    html += `<div class="grid-4 mb-lg">
      ${Components.kpiCard('movie', 'Total Artículos', data.kpis.totalArticulos, '', 'primary')}
      ${Components.kpiCard('shopping_cart', 'Rentas Activas', data.kpis.rentasActivas, '', 'secondary')}
      ${Components.kpiCard('schedule', 'Dev. Pendientes Hoy', data.kpis.devPendientesHoy, data.kpis.devPendientesHoy > 0 ? `${data.kpis.devPendientesHoy} Alertas` : 'Al día', 'warning')}
      ${Components.kpiCard('payments', 'Ingresos del Mes', Components.formatCurrency(data.kpis.ingresosMes), '', 'success')}
    </div>`;

    // Content Grid
    html += `<div class="grid-2">
      <!-- Rentas Recientes -->
      <div class="card" style="grid-column: span 2;">
        <div class="page-header" style="margin-bottom:16px;">
          <h3 style="font-size:18px; color:var(--on-surface);">Rentas Recientes</h3>
          <div style="display:flex; gap:12px; align-items:center;">
            ${Components.exportButtons('window.Dashboard.exportar')}
            <button class="btn btn-icon" title="Ver todas en Consultas" onclick="App.navigate('consultas')"><span class="material-symbols-outlined">arrow_forward</span></button>
          </div>
        </div>
        ${Components.dataTable([
          { key: 'id', label: 'ID', render: v => `<b>#${v}</b>` },
          { key: 'cliente_nombre', label: 'Cliente', render: (v, r) => `${v} ${r.cliente_apellido}` },
          { key: 'articulo_titulo', label: 'Artículo' },
          { key: 'fecha_renta', label: 'Fecha Renta', render: Components.formatDate },
          { key: 'estado', label: 'Estado', render: Components.badge },
          { key: 'total', label: 'Total', render: Components.formatCurrency }
        ], data.rentasRecientes)}
      </div>
    </div>`;

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div class="card"><h3 class="text-error">Error</h3><p>${err.message}</p></div>`;
  }
});
