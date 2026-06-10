App.registerPage('articulos', async (container) => {
  let tipos = [], generos = [], idiomas = [];
  
  // Pre-load data for selects
  try {
    tipos = await API.getAll('tipos_articulo');
    generos = await API.getAll('generos');
    idiomas = await API.getAll('idiomas');
  } catch(e) {}

  const loadData = async (search = '') => {
    try {
      const data = await API.getAll('articulos', search);
      const columns = [
        { key: 'id', label: 'ID', render: v => `<b>${v}</b>` },
        { key: 'titulo', label: 'Título' },
        { key: 'tipo_articulo', label: 'Tipo' },
        { key: 'genero', label: 'Género' },
        { key: 'idioma', label: 'Idioma' },
        { key: 'duracion', label: 'Duración', render: v => `${v} min` },
        { key: 'costo_dia', label: 'Costo/Día', render: Components.formatCurrency },
        { key: 'cantidad_disponible', label: 'Stock' },
        { key: 'estado', label: 'Estado', render: Components.badge },
        { key: 'acciones', label: 'Acciones', render: (_, r) => `
          <div style="display:flex; justify-content:flex-end; gap:4px;">
            <button class="btn btn-icon text-secondary" title="Elenco" onclick="window.Articulos.manageElenco(${r.id})">
              <span class="material-symbols-outlined">people</span>
            </button>
            <button class="btn btn-icon text-primary" onclick="window.Articulos.edit(${r.id})">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn btn-icon text-error" onclick="window.Articulos.delete(${r.id})">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        ` }
      ];
      document.getElementById('articulos-table-container').innerHTML = Components.dataTable(columns, data);
    } catch (e) {
      Components.showToast(e.message, 'error');
    }
  };

  window.Articulos = {
    async showForm(id = null) {
      let data = { titulo: '', tipo_articulo_id: '', genero_id: '', idioma_id: '', duracion: '', anio: '', sinopsis: '', costo_dia: '', cantidad_disponible: 1, estado: 'Activo' };
      if (id) {
        try { data = await API.getOne('articulos', id); } 
        catch (e) { return Components.showToast('Error', 'error'); }
      }

      const body = `
        <form onsubmit="event.preventDefault(); window.Articulos.save(${id || 'null'})">
          <div class="form-group">
            <label>Título de la Obra</label>
            <input type="text" id="art-titulo" class="form-control" required value="${data.titulo}">
          </div>
          
          <div class="grid-3 mb-md">
            <div class="form-group">
              <label>Tipo</label>
              <select id="art-tipo" class="form-control" required>
                <option value="">Seleccionar...</option>
                ${tipos.map(t => `<option value="${t.id}" ${t.id == data.tipo_articulo_id ? 'selected' : ''}>${t.descripcion}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Género</label>
              <select id="art-genero" class="form-control" required>
                <option value="">Seleccionar...</option>
                ${generos.map(t => `<option value="${t.id}" ${t.id == data.genero_id ? 'selected' : ''}>${t.descripcion}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Idioma</label>
              <select id="art-idioma" class="form-control" required>
                <option value="">Seleccionar...</option>
                ${idiomas.map(t => `<option value="${t.id}" ${t.id == data.idioma_id ? 'selected' : ''}>${t.descripcion}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="grid-4 mb-md">
            <div class="form-group">
              <label>Duración (min)</label>
              <input type="number" id="art-duracion" class="form-control" value="${data.duracion}">
            </div>
            <div class="form-group">
              <label>Año</label>
              <input type="number" id="art-anio" class="form-control" value="${data.anio}">
            </div>
            <div class="form-group">
              <label>Costo Diario (RD$)</label>
              <input type="number" step="0.01" id="art-costo" class="form-control" required value="${data.costo_dia}">
            </div>
            <div class="form-group">
              <label>Stock</label>
              <input type="number" id="art-stock" class="form-control" required value="${data.cantidad_disponible}">
            </div>
          </div>

          <div class="form-group">
            <label>Sinopsis</label>
            <textarea id="art-sinopsis" class="form-control" rows="3">${data.sinopsis || ''}</textarea>
          </div>

          <div class="form-group" style="width: 30%">
            <label>Estado</label>
            <select id="art-estado" class="form-control">
              <option value="Activo" ${data.estado === 'Activo' ? 'selected' : ''}>Activo</option>
              <option value="Inactivo" ${data.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
            </select>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
            <button type="button" class="btn btn-outline" onclick="Components.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Guardar</button>
          </div>
        </form>
      `;
      Components.showModal(id ? 'Editar Artículo' : 'Nuevo Artículo', body);
    },
    
    async save(id) {
      const data = {
        titulo: document.getElementById('art-titulo').value,
        tipo_articulo_id: document.getElementById('art-tipo').value,
        genero_id: document.getElementById('art-genero').value,
        idioma_id: document.getElementById('art-idioma').value,
        duracion: document.getElementById('art-duracion').value,
        anio: document.getElementById('art-anio').value,
        costo_dia: document.getElementById('art-costo').value,
        cantidad_disponible: document.getElementById('art-stock').value,
        sinopsis: document.getElementById('art-sinopsis').value,
        estado: document.getElementById('art-estado').value
      };
      try {
        if (id) await API.update('articulos', id, data);
        else await API.create('articulos', data);
        Components.closeModal();
        Components.showToast('Guardado correctamente');
        loadData();
      } catch (e) {
        Components.showToast(e.message, 'error');
      }
    },

    edit(id) { this.showForm(id); },
    
    async delete(id) {
      if (await Components.confirm('¿Estás seguro de eliminar este artículo?')) {
        try {
          await API.remove('articulos', id);
          Components.showToast('Eliminado correctamente');
          loadData();
        } catch (e) {
          Components.showToast(e.message, 'error');
        }
      }
    },

    async manageElenco(id) {
      try {
        const articuloElenco = await API.getArticuloElenco(id);
        const currentNames = articuloElenco.map(e => e.nombre).join(', ');

        const body = `
          <p style="margin-bottom:12px;">Ingrese los nombres del elenco separados por coma:</p>
          <div style="margin-bottom:12px;">
            <label style="font-size:12px;">Director(es)</label>
            <textarea id="art-elenco-director" class="form-control" rows="2" placeholder="Christopher Nolan, Steven Spielberg">${articuloElenco.filter(e => e.tipo === 'Director').map(e => e.nombre).join(', ')}</textarea>
          </div>
          <div style="margin-bottom:12px;">
            <label style="font-size:12px;">Reparto (Actores)</label>
            <textarea id="art-elenco-reparto" class="form-control" rows="3" placeholder="Leonardo DiCaprio, Tom Hanks">${articuloElenco.filter(e => e.tipo === 'Actor').map(e => e.nombre).join(', ')}</textarea>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:16px;">
            <button class="btn btn-outline" onclick="Components.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="window.Articulos.saveElencoTexto(${id})">Guardar Elenco</button>
          </div>
        `;
        Components.showModal('Gestionar Elenco', body);
      } catch(e) {
        Components.showToast(e.message, 'error');
      }
    },

    async saveElencoTexto(id) {
      const directorText = document.getElementById('art-elenco-director').value;
      const repartoText = document.getElementById('art-elenco-reparto').value;
      try {
        await API.request('POST', `/api/articulos/${id}/elenco/texto`, { director: directorText, reparto: repartoText });
        Components.closeModal();
        Components.showToast('Elenco actualizado exitosamente');
      } catch(e) {
        Components.showToast(e.message, 'error');
      }
    }
  };

  container.innerHTML = `
    ${Components.pageHeader('Catálogo de Artículos', 'Gestión de películas y música', `
      <button class="btn btn-primary" onclick="window.Articulos.showForm()">
        <span class="material-symbols-outlined">add</span> Nuevo Artículo
      </button>
    `)}
    <div class="card mb-md">
      <div class="input-with-icon" style="max-width:300px;">
        <span class="material-symbols-outlined">search</span>
        <input type="text" placeholder="Buscar por título..." oninput="clearTimeout(window._to); window._to=setTimeout(()=>loadData(this.value), 300)">
      </div>
    </div>
    <div id="articulos-table-container">${Components.loading()}</div>
  `;
  loadData();
});
