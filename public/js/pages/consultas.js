App.registerPage('consultas', async (container) => {
  let clientes = [], articulos = [], tipos = [], empleados = [], generos = [], idiomas = [];
  try {
    [clientes, articulos, tipos, empleados, generos, idiomas] = await Promise.all([
      API.getAll('clientes', ''),
      API.getAll('articulos', ''),
      API.getAll('tipos_articulo', ''),
      API.getAll('empleados', ''),
      API.getAll('generos', ''),
      API.getAll('idiomas', '')
    ]);
  } catch (e) {
    Components.showToast('No se pudieron cargar todos los filtros', 'error');
  }

  const activos = rows => rows.filter(row => row.estado !== 'Eliminado' && row.estado !== 'Inactivo');
  clientes = activos(clientes);
  articulos = activos(articulos);
  tipos = activos(tipos);
  empleados = activos(empleados);
  generos = activos(generos);
  idiomas = activos(idiomas);

  const escapeHTML = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const getValue = id => document.getElementById(id)?.value || '';
  const setSelectOptions = (id, rows, label, placeholder = 'Todos') => {
    const select = document.getElementById(id);
    if (!select) return;
    const current = select.value;
    select.innerHTML = `<option value="">${placeholder}</option>` + rows
      .map(row => `<option value="${row.id}">${escapeHTML(label(row))}</option>`)
      .join('');
    if (current && rows.some(row => String(row.id) === String(current))) {
      select.value = current;
    }
  };

  const matchingArticles = () => {
    const tipo = getValue('q-tipo');
    const genero = getValue('q-genero');
    const idioma = getValue('q-idioma');
    return articulos.filter(articulo => {
      if (tipo && String(articulo.tipo_articulo_id) !== String(tipo)) return false;
      if (genero && String(articulo.genero_id) !== String(genero)) return false;
      if (idioma && String(articulo.idioma_id) !== String(idioma)) return false;
      return true;
    });
  };

  const articleLabel = articulo => {
    const tipo = tipos.find(row => row.id === articulo.tipo_articulo_id)?.descripcion || 'Sin formato';
    const genero = generos.find(row => row.id === articulo.genero_id)?.descripcion || 'Sin género';
    const idioma = idiomas.find(row => row.id === articulo.idioma_id)?.descripcion || 'Sin idioma';
    return `${articulo.titulo} — ${tipo}, ${genero}, ${idioma}`;
  };

  const syncArticleFilter = () => {
    const select = document.getElementById('q-articulo');
    if (!select) return;
    const filtered = matchingArticles();
    const previous = select.value;
    setSelectOptions('q-articulo', filtered, articleLabel);
    if (previous && !filtered.some(articulo => String(articulo.id) === String(previous))) {
      select.value = '';
      Components.showToast('Quité el artículo porque no coincide con los filtros elegidos', 'error');
    }
    const counter = document.getElementById('q-articulos-count');
    if (counter) counter.textContent = `${filtered.length} artículo${filtered.length === 1 ? '' : 's'} coinciden`;
  };

  const syncAttributeFiltersFromArticle = () => {
    const articuloId = getValue('q-articulo');
    if (!articuloId) return;
    const articulo = articulos.find(row => String(row.id) === String(articuloId));
    if (!articulo) return;
    document.getElementById('q-tipo').value = articulo.tipo_articulo_id || '';
    document.getElementById('q-genero').value = articulo.genero_id || '';
    document.getElementById('q-idioma').value = articulo.idioma_id || '';
    syncArticleFilter();
    document.getElementById('q-articulo').value = articuloId;
  };

  window.Consultas = {
    lastResults: [],

    params() {
      const params = {
        texto: document.getElementById('q-texto').value.trim(),
        cliente_id: document.getElementById('q-cliente').value,
        empleado_id: document.getElementById('q-empleado').value,
        articulo_id: document.getElementById('q-articulo').value,
        tipo_articulo_id: document.getElementById('q-tipo').value,
        genero_id: document.getElementById('q-genero').value,
        idioma_id: document.getElementById('q-idioma').value,
        fecha_desde: document.getElementById('q-desde').value,
        fecha_hasta: document.getElementById('q-hasta').value,
        total_min: document.getElementById('q-total-min').value,
        total_max: document.getElementById('q-total-max').value,
        estado: document.getElementById('q-estado').value,
        orden: document.getElementById('q-orden').value,
        limite: document.getElementById('q-limite').value
      };
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });
      return params;
    },

    validate(params) {
      if (params.fecha_desde && params.fecha_hasta && params.fecha_desde > params.fecha_hasta) {
        throw new Error('La fecha desde no puede ser posterior a la fecha hasta');
      }
      const totalMin = params.total_min !== undefined ? Number(params.total_min) : null;
      const totalMax = params.total_max !== undefined ? Number(params.total_max) : null;
      if (totalMin !== null && (!Number.isFinite(totalMin) || totalMin < 0)) throw new Error('El total mínimo no es válido');
      if (totalMax !== null && (!Number.isFinite(totalMax) || totalMax < 0)) throw new Error('El total máximo no es válido');
      if (totalMin !== null && totalMax !== null && totalMin > totalMax) {
        throw new Error('El total mínimo no puede ser mayor al máximo');
      }
    },

    async buscar() {
      const results = document.getElementById('consultas-results');
      try {
        const params = this.params();
        this.validate(params);
        results.innerHTML = Components.loading();
        const data = await API.consultas(params);
        this.lastResults = data;

        const total = data.reduce((sum, row) => sum + Number(row.total || 0), 0);
        const vencidas = data.filter(row => row.estado_calculado === 'Vencida').length;
        const summary = `
          <div class="grid-3 mb-md">
            ${Components.kpiCard('receipt_long', 'Resultados', data.length, '', 'primary')}
            ${Components.kpiCard('payments', 'Monto acumulado', Components.formatCurrency(total), '', 'success')}
            ${Components.kpiCard('schedule', 'Rentas vencidas', vencidas, '', vencidas ? 'warning' : 'primary')}
          </div>`;

        const columns = [
          { key: 'id', label: 'Renta', render: value => `<b>#${value}</b>` },
          { key: 'cliente_nombre', label: 'Cliente', render: (value, row) => escapeHTML(`${value} ${row.cliente_apellido}`) },
          { key: 'articulo_titulo', label: 'Artículo', render: escapeHTML },
          { key: 'tipo_articulo', label: 'Formato', render: escapeHTML },
          { key: 'genero', label: 'Género', render: escapeHTML },
          { key: 'idioma', label: 'Idioma', render: escapeHTML },
          { key: 'empleado_nombre', label: 'Empleado', render: (value, row) => escapeHTML(`${value} ${row.empleado_apellido}`) },
          { key: 'fecha_renta', label: 'Fecha renta', render: Components.formatDate },
          { key: 'fecha_devolucion_prevista', label: 'Dev. prevista', render: Components.formatDate },
          { key: 'estado_calculado', label: 'Estado', render: Components.badge },
          { key: 'total', label: 'Total', render: Components.formatCurrency }
        ];

        results.innerHTML = summary + Components.dataTable(columns, data);
      } catch (error) {
        results.innerHTML = `<div class="card"><p class="text-error">${error.message}</p></div>`;
        Components.showToast(error.message, 'error');
      }
    },

    limpiar() {
      document.getElementById('consultas-form').reset();
      syncArticleFilter();
      this.buscar();
    },

    exportar(format = 'pdf') {
      if (!this.lastResults || !this.lastResults.length) {
        return Components.showToast('No hay resultados para exportar', 'error');
      }

      const title = 'Consulta Flexible de Rentas';
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `consulta_rentas_${dateStr}.${format}`;

      const totalMonto = this.lastResults.reduce((sum, r) => sum + Number(r.total || 0), 0);
      const summary = [
        { label: 'Total Registros', value: this.lastResults.length.toString() },
        { label: 'Monto Acumulado', value: Components.formatCurrency(totalMonto) }
      ];

      const columns = [
        { key: 'id', label: 'Renta' },
        { key: 'cliente_nombre', label: 'Cliente', render: (v, r) => `${v} ${r.cliente_apellido}` },
        { key: 'articulo_titulo', label: 'Artículo' },
        { key: 'tipo_articulo', label: 'Formato' },
        { key: 'genero', label: 'Género' },
        { key: 'idioma', label: 'Idioma' },
        { key: 'empleado_nombre', label: 'Empleado', render: (v, r) => `${v} ${r.empleado_apellido}` },
        { key: 'fecha_renta', label: 'Fecha', render: Components.formatDate },
        { key: 'estado_calculado', label: 'Estado' },
        { key: 'total', label: 'Total', render: Components.formatCurrency }
      ];

      if (format === 'pdf') {
        Exporters.toPDF({ title, subtitle: `Registros encontrados: ${this.lastResults.length}`, summary, columns, data: this.lastResults, filename });
      } else if (format === 'xls') {
        Exporters.toXLS({ title, summary, columns, data: this.lastResults, filename });
      } else if (format === 'xml') {
        Exporters.toXML({ title, summary, columns, data: this.lastResults, filename });
      } else if (format === 'csv') {
        Exporters.toCSV({ columns, data: this.lastResults, filename });
      }
    }
  };

  const options = (rows, label) => rows.map(row => `<option value="${row.id}">${escapeHTML(label(row))}</option>`).join('');

  container.innerHTML = `
    ${Components.pageHeader(
      'Consultas flexibles',
      'Combina filtros, ordena resultados y exporta la información que necesites',
      Components.exportButtons('window.Consultas.exportar')
    )}

    <div class="card mb-lg">
      <form id="consultas-form" onsubmit="event.preventDefault(); window.Consultas.buscar()">
        <div class="form-group mb-md">
          <label for="q-texto">Búsqueda general</label>
          <input type="search" id="q-texto" class="form-control" maxlength="100" placeholder="Título, cliente, correo o empleado">
        </div>

        <div class="grid-3 mb-md">
          <div class="form-group"><label for="q-cliente">Cliente</label><select id="q-cliente" class="form-control"><option value="">Todos</option>${options(clientes, c => `${c.nombre} ${c.apellido}`)}</select></div>
          <div class="form-group"><label for="q-empleado">Empleado</label><select id="q-empleado" class="form-control"><option value="">Todos</option>${options(empleados, e => `${e.nombre} ${e.apellido}`)}</select></div>
          <div class="form-group"><label for="q-articulo">Artículo</label><select id="q-articulo" class="form-control"><option value="">Todos</option>${options(articulos, articleLabel)}</select><small id="q-articulos-count" class="text-muted">${articulos.length} artículos coinciden</small></div>
        </div>

        <div class="grid-3 mb-md">
          <div class="form-group"><label for="q-tipo">Formato</label><select id="q-tipo" class="form-control"><option value="">Todos</option>${options(tipos, t => t.descripcion)}</select></div>
          <div class="form-group"><label for="q-genero">Género</label><select id="q-genero" class="form-control"><option value="">Todos</option>${options(generos, g => g.descripcion)}</select></div>
          <div class="form-group"><label for="q-idioma">Idioma</label><select id="q-idioma" class="form-control"><option value="">Todos</option>${options(idiomas, i => i.descripcion)}</select></div>
        </div>

        <div class="grid-3 mb-md">
          <div class="form-group"><label for="q-desde">Fecha desde</label><input type="date" id="q-desde" class="form-control"></div>
          <div class="form-group"><label for="q-hasta">Fecha hasta</label><input type="date" id="q-hasta" class="form-control"></div>
          <div class="form-group"><label for="q-estado">Estado</label><select id="q-estado" class="form-control"><option value="Todos">Todos</option><option value="Activa">Activa</option><option value="Devuelta">Devuelta</option><option value="Vencida">Vencida</option></select></div>
        </div>

        <div class="grid-3 mb-md">
          <div class="form-group"><label for="q-total-min">Total mínimo</label><input type="number" id="q-total-min" class="form-control" min="0" step="0.01" placeholder="RD$ 0.00"></div>
          <div class="form-group"><label for="q-total-max">Total máximo</label><input type="number" id="q-total-max" class="form-control" min="0" step="0.01" placeholder="Sin límite"></div>
          <div class="form-group"><label for="q-orden">Ordenar por</label><select id="q-orden" class="form-control"><option value="fecha_desc">Más recientes</option><option value="fecha_asc">Más antiguas</option><option value="total_desc">Mayor total</option><option value="total_asc">Menor total</option><option value="cliente_asc">Cliente A–Z</option></select></div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:end; gap:12px; flex-wrap:wrap;">
          <div class="form-group" style="margin:0; min-width:150px;"><label for="q-limite">Máximo de filas</label><select id="q-limite" class="form-control"><option value="50">50</option><option value="100">100</option><option value="200" selected>200</option><option value="500">500</option></select></div>
          <div style="display:flex; gap:12px;"><button type="button" class="btn btn-outline" onclick="window.Consultas.limpiar()">Limpiar filtros</button><button type="submit" class="btn btn-primary"><span class="material-symbols-outlined">search</span> Consultar</button></div>
        </div>
      </form>
    </div>

    <div id="consultas-results">${Components.loading()}</div>
  `;

  ['q-tipo', 'q-genero', 'q-idioma'].forEach(id => {
    document.getElementById(id).addEventListener('change', syncArticleFilter);
  });
  document.getElementById('q-articulo').addEventListener('change', syncAttributeFiltersFromArticle);

  window.Consultas.buscar();
});
