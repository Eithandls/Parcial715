App.registerPage('mis-reservas', async (container) => {
  container.innerHTML = Components.loading();
  try {
    const reservas = await API.request('GET', '/api/mis-reservas');
    const columns = [
      { key: 'id', label: 'ID', render: v => `<b>#${v}</b>` },
      { key: 'articulo_titulo', label: 'Artículo' },
      { key: 'tipo_articulo', label: 'Formato' },
      { key: 'idioma', label: 'Idioma' },
      { key: 'fecha_reserva', label: 'Fecha Reserva', render: v => Components.formatDate(v.split(' ')[0]) },
      { key: 'fecha_estimada_disponible', label: 'Disponible Desde', render: Components.formatDate },
      { key: 'estado', label: 'Estado', render: (v) => {
        const lower = String(v).toLowerCase();
        let cls = 'badge-inactive';
        if (lower === 'pendiente') cls = 'badge-rented';
        else if (lower === 'completada') cls = 'badge-active';
        else if (lower === 'cancelada') cls = 'badge-overdue';
        return `<span class="badge ${cls}">${v}</span>`;
      }},
      { key: 'acciones', label: 'Acción', render: (_, r) => {
        if (r.estado === 'Pendiente') {
          return `<button class="btn btn-danger btn-sm" onclick="window.MisReservas.cancelar(${r.id})">Cancelar</button>`;
        }
        return '—';
      }}
    ];

    container.innerHTML = `
      ${Components.pageHeader('Mis Reservas', 'Reservas anticipadas de formatos agotados')}
      ${Components.dataTable(columns, reservas)}
    `;

    window.MisReservas = {
      async cancelar(id) {
        if (!await Components.confirm('¿Cancelar esta reserva?')) return;
        try {
          await API.request('DELETE', `/api/reservas/${id}`);
          Components.showToast('Reserva cancelada');
          App.navigate('mis-reservas');
        } catch (e) {
          Components.showToast(e.message, 'error');
        }
      }
    };
  } catch (e) {
    container.innerHTML = `<div class="card"><h3 class="text-error">Error</h3><p>${e.message}</p></div>`;
  }
});
