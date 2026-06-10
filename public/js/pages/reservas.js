App.registerPage('reservas', async (container) => {
  const loadData = async () => {
    try {
      const data = await API.getAll('reservas');
      const columns = [
        { key: 'id', label: 'ID', render: v => `<b>#${v}</b>` },
        { key: 'cliente_nombre', label: 'Cliente', render: (v, r) => `${v} ${r.cliente_apellido}` },
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
            return `
              <button class="btn btn-success btn-sm" onclick="window.Reservas.completar(${r.id})" style="background:var(--success);color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;">
                Completar
              </button>
              <button class="btn btn-danger btn-sm" onclick="window.Reservas.cancelar(${r.id})" style="background:var(--error);color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;">
                Cancelar
              </button>
            `;
          }
          return '—';
        }}
      ];
      document.getElementById('reservas-table-container').innerHTML = Components.dataTable(columns, data);
    } catch (e) {
      Components.showToast(e.message, 'error');
    }
  };

  window.Reservas = {
    async completar(id) {
      if (!await Components.confirm('¿Completar esta reserva? Se creará una renta por 3 días automáticamente.')) return;
      try {
        await API.update('reservas', id, { estado: 'Completada' });
        Components.showToast('Reserva completada y renta creada exitosamente');
        loadData();
      } catch (e) {
        Components.showToast(e.message, 'error');
      }
    },
    async cancelar(id) {
      if (!await Components.confirm('¿Cancelar esta reserva?')) return;
      try {
        await API.update('reservas', id, { estado: 'Cancelada' });
        Components.showToast('Reserva cancelada');
        loadData();
      } catch (e) {
        Components.showToast(e.message, 'error');
      }
    }
  };

  container.innerHTML = `
    ${Components.pageHeader('Reservas', 'Gestión de reservas anticipadas de clientes')}
    <div id="reservas-table-container">${Components.loading()}</div>
  `;
  loadData();
});
