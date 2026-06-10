App.registerPage('mis-rentas', async (container) => {
  container.innerHTML = Components.loading();
  try {
    const rentas = await API.request('GET', '/api/mis-rentas');
    const columns = [
      { key: 'id', label: 'ID', render: v => `<b>#${v}</b>` },
      { key: 'articulo_titulo', label: 'Artículo' },
      { key: 'fecha_renta', label: 'Fecha Renta', render: Components.formatDate },
      { key: 'fecha_devolucion_prevista', label: 'Dev. Prevista', render: Components.formatDate },
      { key: 'fecha_devolucion_real', label: 'Dev. Real', render: (v) => v ? Components.formatDate(v) : '<span class="text-muted">Pendiente</span>' },
      { key: 'dias', label: 'Días' },
      { key: 'total', label: 'Total', render: Components.formatCurrency },
      { key: 'estado', label: 'Estado', render: Components.badge },
    ];

    container.innerHTML = `
      ${Components.pageHeader('Mis Rentas', 'Historial de tus rentas en Cinema Club')}
      ${Components.dataTable(columns, rentas)}
    `;
  } catch (e) {
    container.innerHTML = `<div class="card"><h3 class="text-error">Error</h3><p>${e.message}</p></div>`;
  }
});
