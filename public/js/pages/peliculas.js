App.registerPage('peliculas', async (container) => {
  let generos = [], tipos = [], idiomas = [], elencos = [], peliculasData = [];

  const loadRefs = async () => {
    try { generos = await API.getAll('generos'); } catch (e) {}
    try { tipos = await API.getAll('tipos_articulo'); } catch (e) {}
    try { idiomas = await API.getAll('idiomas'); } catch (e) {}
    try { elencos = await API.getAll('elenco'); } catch (e) {}
  };

  const loadData = async () => {
    try {
      const fGenero = document.getElementById('flt-genero')?.value || '';
      const fTipo = document.getElementById('flt-tipo')?.value || '';
      const fIdioma = document.getElementById('flt-idioma')?.value || '';
      const fSearch = document.getElementById('flt-search')?.value || '';

      let url = '/api/peliculas/completo?';
      if (fGenero) url += `genero_id=${fGenero}&`;
      if (fTipo) url += `tipo_id=${fTipo}&`;
      if (fIdioma) url += `idioma_id=${fIdioma}&`;
      if (fSearch) url += `search=${encodeURIComponent(fSearch)}&`;

      peliculasData = await API.request('GET', url);

      const columns = [
        { key: 'id', label: 'ID', render: v => `<b>#${v}</b>` },
        { key: 'titulo', label: 'Título' },
        { key: 'genero', label: 'Género' },
        {
          key: 'articulos', label: 'Formatos', render: (arts) => {
            if (!arts || arts.length === 0) return '<span class="text-muted">—</span>';
            return arts.map(a => {
              const badge = a.cantidad_disponible > 0 ? 'badge-active' : 'badge-overdue';
              return `<span class="badge ${badge}" style="margin:2px;">${a.tipo_articulo.split(' ')[0]} ${a.idioma}</span>`;
            }).join(' ');
          }
        },
        {
          key: 'elenco', label: 'Elenco', render: (el) => {
            if (!el || el.length === 0) return '<span class="text-muted">—</span>';
            return el.slice(0, 3).map(e => e.nombre).join(', ') + (el.length > 3 ? '...' : '');
          }
        },
        { key: 'acciones', label: 'Acciones', render: (_, r) => `
          <div style="display:flex; justify-content:flex-end; gap:8px;">
            <button class="btn btn-icon text-primary" onclick="window.Peliculas.edit(${r.id})">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn btn-icon text-error" onclick="window.Peliculas.delete(${r.id})">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        ` }
      ];
      document.getElementById('peliculas-table-container').innerHTML = Components.dataTable(columns, peliculasData);
    } catch (e) {
      Components.showToast(e.message, 'error');
    }
  };

  window.Peliculas = {
    async showNew() {
      await loadRefs();
      const body = `
        <form onsubmit="event.preventDefault(); window.Peliculas.crearYEditar()">
          <div style="max-height:65vh; overflow-y:auto; padding-right:4px;">
            <h4 style="margin-bottom:12px; color:var(--primary); display:flex; align-items:center; gap:8px;">
              <span class="material-symbols-outlined">info</span> Datos de la Película
            </h4>
            <div class="form-group">
              <label>Título</label>
              <input type="text" id="new-titulo" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Género</label>
              <select id="new-genero" class="form-control" required>
                <option value="">Seleccionar...</option>
                ${generos.map(g => `<option value="${g.id}">${g.descripcion}</option>`).join('')}
              </select>
            </div>
            <div class="grid-2">
              <div class="form-group">
                <label>Duración (min)</label>
                <input type="number" id="new-duracion" class="form-control">
              </div>
              <div class="form-group">
                <label>Año</label>
                <input type="number" id="new-anio" class="form-control">
              </div>
            </div>
            <div class="form-group">
              <label>Sinopsis</label>
              <textarea id="new-sinopsis" class="form-control" rows="2"></textarea>
            </div>

            <hr style="margin:16px 0; border:none; border-top:1px solid var(--outline-variant);">

            <h4 style="margin-bottom:12px; color:var(--primary); display:flex; align-items:center; gap:8px;">
              <span class="material-symbols-outlined">inventory_2</span> Formatos Disponibles
            </h4>
            <div id="new-formatos-container">
              <div class="formato-row" style="display:flex; gap:8px; align-items:end; margin-bottom:8px;">
                <div class="form-group" style="flex:1; margin:0;">
                  <label style="font-size:12px;">Formato</label>
                  <select class="form-control fmt-tipo" required>
                    ${tipos.map(t => `<option value="${t.id}">${t.descripcion}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group" style="flex:1; margin:0;">
                  <label style="font-size:12px;">Idioma</label>
                  <select class="form-control fmt-idioma" required>
                    ${idiomas.map(i => `<option value="${i.id}">${i.descripcion}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group" style="width:70px; margin:0;">
                  <label style="font-size:12px;">Stock</label>
                  <input type="number" class="form-control fmt-stock" value="2" min="0">
                </div>
                <div class="form-group" style="width:100px; margin:0;">
                  <label style="font-size:12px;">Precio/día</label>
                  <input type="number" class="form-control fmt-precio" value="100" min="0" required>
                </div>
              </div>
            </div>
            <button type="button" class="btn btn-outline w-full" style="margin-bottom:16px;" onclick="window.Peliculas.agregarFilaFormato()">
              <span class="material-symbols-outlined">add</span> Agregar otro formato
            </button>

            <hr style="margin:16px 0; border:none; border-top:1px solid var(--outline-variant);">

            <h4 style="margin-bottom:12px; color:var(--primary); display:flex; align-items:center; gap:8px;">
              <span class="material-symbols-outlined">theater_comedy</span> Elenco
            </h4>
            <div class="grid-2">
              <div class="form-group">
                <label>Director(es) — separados por coma</label>
                <textarea id="new-elenco-director" class="form-control" rows="2" placeholder="Ej: Christopher Nolan, Steven Spielberg"></textarea>
              </div>
              <div class="form-group">
                <label>Reparto — separados por coma</label>
                <textarea id="new-elenco-reparto" class="form-control" rows="4" placeholder="Ej: Leonardo DiCaprio, Tom Hanks, Morgan Freeman"></textarea>
              </div>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
              <button type="button" class="btn btn-outline" onclick="Components.closeModal()">Cancelar</button>
              <button type="submit" class="btn btn-primary">Crear Película</button>
            </div>
          </div>
        </form>
      `;
      Components.showModal('Nueva Película', body);
    },

    async crearYEditar() {
      const formatRows = document.querySelectorAll('#new-formatos-container .formato-row');
      const formatos = Array.from(formatRows).map(row => ({
        tipo_articulo_id: parseInt(row.querySelector('.fmt-tipo').value),
        idioma_id: parseInt(row.querySelector('.fmt-idioma').value),
        cantidad_disponible: parseInt(row.querySelector('.fmt-stock').value) || 1,
        costo_dia: parseFloat(row.querySelector('.fmt-precio').value) || 0
      }));

      const data = {
        titulo: document.getElementById('new-titulo').value,
        genero_id: document.getElementById('new-genero').value,
        duracion: document.getElementById('new-duracion').value || null,
        anio: document.getElementById('new-anio').value || null,
        sinopsis: document.getElementById('new-sinopsis').value || null,
        formatos,
        elenco_director: document.getElementById('new-elenco-director').value,
        elenco_reparto: document.getElementById('new-elenco-reparto').value
      };
      try {
        await API.request('POST', '/api/peliculas/completo', data);
        Components.closeModal();
        Components.showToast('Película creada con formatos y elenco');
        loadData();
      } catch (e) { Components.showToast(e.message, 'error'); }
    },

    agregarFilaFormato() {
      const container = document.getElementById('new-formatos-container');
      const row = document.createElement('div');
      row.className = 'formato-row';
      row.style.cssText = 'display:flex; gap:8px; align-items:end; margin-bottom:8px;';
      row.innerHTML = `
        <div class="form-group" style="flex:1; margin:0;">
          <select class="form-control fmt-tipo" required>
            ${tipos.map(t => `<option value="${t.id}">${t.descripcion}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="flex:1; margin:0;">
          <select class="form-control fmt-idioma" required>
            ${idiomas.map(i => `<option value="${i.id}">${i.descripcion}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="width:70px; margin:0;">
          <input type="number" class="form-control fmt-stock" value="2" min="0">
        </div>
        <div class="form-group" style="width:100px; margin:0;">
          <input type="number" class="form-control fmt-precio" value="100" min="0" required>
        </div>
        <button type="button" class="btn btn-icon text-error" onclick="this.parentElement.remove()" style="margin-bottom:4px;">
          <span class="material-symbols-outlined">remove_circle</span>
        </button>
      `;
      container.appendChild(row);
    },

    async edit(id) {
      await loadRefs();
      const peli = peliculasData.find(p => p.id == id);
      if (!peli) return Components.showToast('No encontrado', 'error');

      let articulos = peli.articulos || [];
      let elencoActual = peli.elenco || [];

      const renderForm = () => {
        const body = `
          <div style="max-height:70vh; overflow-y:auto;">
            <h4 style="margin-bottom:12px; color:var(--primary); display:flex; align-items:center; gap:8px;">
              <span class="material-symbols-outlined">info</span> Datos de la Película
            </h4>
            <form onsubmit="event.preventDefault(); window.Peliculas.savePelicula(${id})">
              <div class="form-group">
                <label>Título</label>
                <input type="text" id="pel-titulo" class="form-control" value="${peli.titulo}" required>
              </div>
              <div class="grid-3 mb-md">
                <div class="form-group">
                  <label>Género</label>
                  <select id="pel-genero" class="form-control">
                    ${generos.map(g => `<option value="${g.id}" ${g.id == peli.genero_id ? 'selected' : ''}>${g.descripcion}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label>Duración</label>
                  <input type="number" id="pel-duracion" class="form-control" value="${peli.duracion || ''}">
                </div>
                <div class="form-group">
                  <label>Año</label>
                  <input type="number" id="pel-anio" class="form-control" value="${peli.anio || ''}">
                </div>
              </div>
              <div class="form-group">
                <label>Sinopsis</label>
                <textarea id="pel-sinopsis" class="form-control" rows="2">${peli.sinopsis || ''}</textarea>
              </div>
              <div class="form-group" style="width:30%">
                <label>Estado</label>
                <select id="pel-estado" class="form-control">
                  <option value="Activo">Activo</option>
                  <option value="Inactivo" ${peli.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
                </select>
              </div>
              <button type="submit" class="btn btn-primary w-full" style="margin-bottom:24px;">Guardar Película</button>
            </form>

            <hr style="margin:16px 0; border:none; border-top:1px solid var(--outline-variant);">

            <h4 style="margin-bottom:12px; color:var(--primary); display:flex; align-items:center; gap:8px;">
              <span class="material-symbols-outlined">inventory_2</span> Formatos (Artículos)
            </h4>
            <div id="pel-articulos-list">
              ${articulos.map(a => `
                <div style="display:flex; align-items:center; gap:8px; padding:8px; background:var(--surface-container); border-radius:6px; margin-bottom:6px;">
                  <span class="badge ${a.cantidad_disponible > 0 ? 'badge-active' : 'badge-overdue'}">${a.tipo_articulo.split(' ')[0]}</span>
                  <span style="flex:1;">${a.idioma} — Stock: ${a.cantidad_disponible} — ${Components.formatCurrency(a.costo_dia)}/día</span>
                  <button class="btn btn-icon text-error" onclick="window.Peliculas.removerArticulo(${a.id})" style="font-size:16px;">
                    <span class="material-symbols-outlined">remove_circle</span>
                  </button>
                </div>
              `).join('') || '<p class="text-muted">Sin artículos</p>'}
            </div>
            <button class="btn btn-outline w-full" onclick="window.Peliculas.agregarArticulo(${id})">
              <span class="material-symbols-outlined">add</span> Agregar Formato
            </button>

            <hr style="margin:16px 0; border:none; border-top:1px solid var(--outline-variant);">

            <h4 style="margin-bottom:12px; color:var(--primary); display:flex; align-items:center; gap:8px;">
              <span class="material-symbols-outlined">theater_comedy</span> Elenco
            </h4>
            <div id="pel-elenco-list">
              ${elencoActual.map(e => `
                <div style="display:flex; align-items:center; gap:8px; padding:6px 8px; background:var(--surface-container); border-radius:6px; margin-bottom:4px;">
                  <span class="badge badge-inactive" style="font-size:10px;">${e.tipo}</span>
                  <span style="flex:1;">${e.nombre}</span>
                  <button class="btn btn-icon text-error" onclick="window.Peliculas.removerElenco(${id}, ${e.id})" style="font-size:16px;">
                    <span class="material-symbols-outlined">remove_circle</span>
                  </button>
                </div>
              `).join('') || '<p class="text-muted">Sin elenco</p>'}
            </div>
            <div style="display:flex; gap:8px; margin-top:8px;">
              <select id="pel-nuevo-elenco" class="form-control">
                <option value="">Seleccionar miembro...</option>
                ${elencos.filter(e => !elencoActual.some(a => a.id === e.id)).map(e =>
                  `<option value="${e.id}">${e.nombre} (${e.tipo})</option>`
                ).join('')}
              </select>
              <button class="btn btn-primary" onclick="window.Peliculas.agregarElenco(${id})">Agregar</button>
            </div>
          </div>
        `;
        Components.showModal(`Editar: ${peli.titulo}`, body, `
          <button class="btn btn-outline" onclick="Components.closeModal()">Cerrar</button>
        `);
      };
      renderForm();
    },

    async savePelicula(id) {
      const data = {
        titulo: document.getElementById('pel-titulo').value,
        genero_id: document.getElementById('pel-genero').value,
        duracion: document.getElementById('pel-duracion').value,
        anio: document.getElementById('pel-anio').value,
        sinopsis: document.getElementById('pel-sinopsis').value,
        estado: document.getElementById('pel-estado').value
      };
      try {
        await API.update('peliculas', id, data);
        Components.showToast('Película actualizada');
        loadData();
      } catch (e) { Components.showToast(e.message, 'error'); }
    },

    async agregarArticulo(pelicula_id) {
      const peli = peliculasData.find(p => p.id == pelicula_id);
      const body = `
        <form onsubmit="event.preventDefault(); window.Peliculas.guardarArticulo(${pelicula_id})">
          <div class="form-group">
            <label>Título</label>
            <input type="text" id="art-titulo" class="form-control" value="${peli.titulo}">
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label>Formato</label>
              <select id="art-tipo" class="form-control" required>
                ${tipos.map(t => `<option value="${t.id}">${t.descripcion}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Idioma</label>
              <select id="art-idioma" class="form-control" required>
                ${idiomas.map(i => `<option value="${i.id}">${i.descripcion}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label>Stock</label>
              <input type="number" id="art-stock" class="form-control" value="2" min="0">
            </div>
            <div class="form-group">
              <label>Costo por día</label>
              <input type="number" id="art-costo" class="form-control" value="100" min="0">
            </div>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:16px;">
            <button type="button" class="btn btn-outline" onclick="Components.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Guardar</button>
          </div>
        </form>
      `;
      Components.showModal('Agregar Formato', body);
    },

    async guardarArticulo(pelicula_id) {
      const data = {
        titulo: document.getElementById('art-titulo').value,
        tipo_articulo_id: document.getElementById('art-tipo').value,
        idioma_id: document.getElementById('art-idioma').value,
        costo_dia: document.getElementById('art-costo').value,
        cantidad_disponible: document.getElementById('art-stock').value,
        pelicula_id: pelicula_id,
        estado: 'Activo'
      };
      try {
        await API.create('articulos', data);
        Components.closeModal();
        Components.showToast('Formato agregado');
        window.Peliculas.edit(pelicula_id);
        loadData();
      } catch (e) { Components.showToast(e.message, 'error'); }
    },

    async removerArticulo(articulo_id) {
      if (!await Components.confirm('¿Desactivar este artículo?')) return;
      try {
        await API.remove('articulos', articulo_id);
        Components.showToast('Artículo desactivado');
        Components.closeModal();
        loadData();
      } catch (e) { Components.showToast(e.message, 'error'); }
    },

    async agregarElenco(pelicula_id) {
      const elenco_id = document.getElementById('pel-nuevo-elenco').value;
      if (!elenco_id) return Components.showToast('Selecciona un miembro', 'error');
      try {
        const primerArt = peliculasData.find(p => p.id == pelicula_id)?.articulos?.[0];
        if (primerArt) {
          const current = await API.request('GET', `/api/articulos/${primerArt.id}/elenco`);
          const newIds = [...current.map(e => e.id), parseInt(elenco_id)];
          await API.request('POST', `/api/articulos/${primerArt.id}/elenco`, { elenco_ids: newIds });
        } else {
          const arts = await API.getAll('articulos', '', `pelicula_id=${pelicula_id}`);
          if (arts.length > 0) {
            const current = await API.request('GET', `/api/articulos/${arts[0].id}/elenco`);
            const newIds = [...current.map(e => e.id), parseInt(elenco_id)];
            await API.request('POST', `/api/articulos/${arts[0].id}/elenco`, { elenco_ids: newIds });
          } else {
            return Components.showToast('Crea un artículo primero', 'error');
          }
        }
        Components.showToast('Miembro agregado');
        window.Peliculas.edit(pelicula_id);
        loadData();
      } catch (e) { Components.showToast(e.message, 'error'); }
    },

    async removerElenco(pelicula_id, elenco_id) {
      try {
        const primerArt = peliculasData.find(p => p.id == pelicula_id)?.articulos?.[0];
        if (primerArt) {
          const current = await API.request('GET', `/api/articulos/${primerArt.id}/elenco`);
          const newIds = current.filter(e => e.id !== elenco_id).map(e => e.id);
          await API.request('POST', `/api/articulos/${primerArt.id}/elenco`, { elenco_ids: newIds });
        }
        Components.showToast('Miembro removido');
        window.Peliculas.edit(pelicula_id);
        loadData();
      } catch (e) { Components.showToast(e.message, 'error'); }
    },

    async delete(id) {
      if (await Components.confirm('¿Estás seguro de eliminar esta película?')) {
        try {
          await API.remove('peliculas', id);
          Components.showToast('Eliminado correctamente');
          loadData();
        } catch (e) { Components.showToast(e.message, 'error'); }
      }
    }
  };

  container.innerHTML = `
    ${Components.pageHeader('Películas', 'Gestión completa de películas, formatos y elenco', `
      <button class="btn btn-primary" onclick="window.Peliculas.showNew()">
        <span class="material-symbols-outlined">add</span> Nueva Película
      </button>
    `)}
    <div class="card mb-md">
      <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:end;">
        <div class="input-with-icon" style="max-width:250px;">
          <span class="material-symbols-outlined">search</span>
          <input type="text" id="flt-search" placeholder="Buscar por título...">
        </div>
        <div class="form-group" style="min-width:150px; margin:0;">
          <label style="font-size:12px;">Género</label>
          <select id="flt-genero" class="form-control">
            <option value="">Todos</option>
          </select>
        </div>
        <div class="form-group" style="min-width:150px; margin:0;">
          <label style="font-size:12px;">Formato</label>
          <select id="flt-tipo" class="form-control">
            <option value="">Todos</option>
          </select>
        </div>
        <div class="form-group" style="min-width:150px; margin:0;">
          <label style="font-size:12px;">Idioma</label>
          <select id="flt-idioma" class="form-control">
            <option value="">Todos</option>
          </select>
        </div>
        <button class="btn btn-primary" onclick="window.Peliculas.loadData()">
          <span class="material-symbols-outlined">search</span> Buscar
        </button>
      </div>
    </div>
    <div id="peliculas-table-container">${Components.loading()}</div>
  `;
  window.Peliculas.loadData = loadData;

  // Populate filter dropdowns
  await loadRefs();
  const genSel = document.getElementById('flt-genero');
  genSel.innerHTML = '<option value="">Todos</option>' + generos.map(g => `<option value="${g.id}">${g.descripcion}</option>`).join('');
  const tipSel = document.getElementById('flt-tipo');
  tipSel.innerHTML = '<option value="">Todos</option>' + tipos.map(t => `<option value="${t.id}">${t.descripcion}</option>`).join('');
  const idiSel = document.getElementById('flt-idioma');
  idiSel.innerHTML = '<option value="">Todos</option>' + idiomas.map(i => `<option value="${i.id}">${i.descripcion}</option>`).join('');

  loadData();
});
