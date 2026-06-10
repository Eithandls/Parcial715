App.registerPage('consultas', async (container) => {
  let clientes = [], articulos = [], tipos = [];
  try {
    [clientes, articulos, tipos] = await Promise.all([
      API.getAll('clientes', ''),
      API.getAll('articulos', ''),
      API.getAll('tipos_articulo', '')
    ]);
  } catch(e) {}

  window.Consultas = {
    async buscar() {
      const params = {
        cliente_id: document.getElementById('q-cliente').value,
        fecha_desde: document.getElementById('q-desde').value,
        fecha_hasta: document.getElementById('q-hasta').value,
        articulo_id: document.getElementById('q-articulo').value,
        tipo_articulo_id: document.getElementById('q-tipo').value,
        estado: document.getElementById('q-estado').value
      };

      // Remove empty params
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      document.getElementById('consultas-results').innerHTML = Components.loading();

      try {
        const data = await API.consultas(params);
        
        const columns = [
          { key: 'id', label: 'ID Renta', render: v => `<b>#${v}</b>` },
          { key: 'cliente_nombre', label: 'Cliente', render: (v, r) => `${v} ${r.cliente_apellido}` },
          { key: 'articulo_titulo', label: 'Artículo' },
          { key: 'tipo_articulo', label: 'Tipo' },
          { key: 'fecha_renta', label: 'Fecha Renta', render: Components.formatDate },
          { key: 'fecha_devolucion_prevista', label: 'Fecha Dev.', render: Components.formatDate },
          { key: 'estado', label: 'Estado', render: Components.badge },
          { key: 'total', label: 'Total', render: Components.formatCurrency }
        ];

        document.getElementById('consultas-results').innerHTML = Components.dataTable(columns, data);
      } catch (e) {
        document.getElementById('consultas-results').innerHTML = `<p class="text-error">${e.message}</p>`;
      }
    }
  };

  container.innerHTML = `
    ${Components.pageHeader('Consultas Dinámicas', 'Búsqueda avanzada de rentas por múltiples criterios')}
    
    <div class="card mb-lg">
      <form onsubmit="event.preventDefault(); window.Consultas.buscar()">
        <div class="grid-3 mb-md">
          <div class="form-group">
            <label>Cliente</label>
            <select id="q-cliente" class="form-control">
              <option value="">Todos los clientes</option>
              ${clientes.map(c => `<option value="${c.id}">${c.nombre} ${c.apellido}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Artículo</label>
            <select id="q-articulo" class="form-control">
              <option value="">Todos los artículos</option>
              ${articulos.map(a => `<option value="${a.id}">${a.titulo}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Tipo de Artículo</label>
            <select id="q-tipo" class="form-control">
              <option value="">Todos los tipos</option>
              ${tipos.map(t => `<option value="${t.id}">${t.descripcion}</option>`).join('')}
            </select>
          </div>
        </div>
        
        <div class="grid-3 mb-md">
          <div class="form-group">
            <label>Fecha Desde</label>
            <input type="date" id="q-desde" class="form-control">
          </div>
          <div class="form-group">
            <label>Fecha Hasta</label>
            <input type="date" id="q-hasta" class="form-control">
          </div>
          <div class="form-group">
            <label>Estado de Renta</label>
            <select id="q-estado" class="form-control">
              <option value="Todos">Todos los estados</option>
              <option value="Activa">Activa</option>
              <option value="Devuelta">Devuelta</option>
              <option value="Vencida">Vencida</option>
            </select>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px;">
          <button type="reset" class="btn btn-outline" onclick="setTimeout(window.Consultas.buscar, 10)">Limpiar Filtros</button>
          <button type="submit" class="btn btn-primary"><span class="material-symbols-outlined">search</span> Buscar Resultados</button>
        </div>
      </form>
    </div>

    <div id="consultas-results">
      <div class="card text-center text-muted" style="padding: 40px;">
        <span class="material-symbols-outlined" style="font-size: 48px;">manage_search</span>
        <p>Aplica filtros y presiona buscar para ver los resultados.</p>
      </div>
    </div>
  `;

  // Init default search
  window.Consultas.buscar();
});
