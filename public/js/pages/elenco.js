App.registerPage('elenco', async (container) => {
  const loadData = async (search = '') => {
    try {
      const data = await API.getAll('elenco', search);
      const columns = [
        { key: 'id', label: 'ID', render: v => `<b>${v}</b>` },
        { key: 'nombre', label: 'Nombre' },
        { key: 'tipo', label: 'Rol' },
        { key: 'estado', label: 'Estado', render: Components.badge },
        { key: 'acciones', label: 'Acciones', render: (_, r) => `
          <div style="display:flex; justify-content:flex-end; gap:8px;">
            <button class="btn btn-icon text-primary" onclick="window.Elenco.edit(${r.id})">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn btn-icon text-error" onclick="window.Elenco.delete(${r.id})">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        ` }
      ];
      document.getElementById('elenco-table-container').innerHTML = Components.dataTable(columns, data);
    } catch (e) {
      Components.showToast(e.message, 'error');
    }
  };

  window.Elenco = {
    async showForm(id = null) {
      let data = { nombre: '', tipo: 'Actor', estado: 'Activo' };
      if (id) {
        try { data = await API.getOne('elenco', id); } 
        catch (e) { return Components.showToast('Error', 'error'); }
      }

      const body = `
        <form onsubmit="event.preventDefault(); window.Elenco.save(${id || 'null'})">
          <div class="form-group">
            <label>Nombre Completo</label>
            <input type="text" id="elenco-nombre" class="form-control" required value="${data.nombre}" placeholder="Ej: Leonardo DiCaprio">
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label>Rol principal</label>
              <select id="elenco-tipo" class="form-control">
                <option value="Actor" ${data.tipo === 'Actor' ? 'selected' : ''}>Actor</option>
                <option value="Director" ${data.tipo === 'Director' ? 'selected' : ''}>Director</option>
                <option value="Productor" ${data.tipo === 'Productor' ? 'selected' : ''}>Productor</option>
                <option value="Artista" ${data.tipo === 'Artista' ? 'selected' : ''}>Artista Musical</option>
              </select>
            </div>
            <div class="form-group">
              <label>Estado</label>
              <select id="elenco-estado" class="form-control">
                <option value="Activo" ${data.estado === 'Activo' ? 'selected' : ''}>Activo</option>
                <option value="Inactivo" ${data.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
              </select>
            </div>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
            <button type="button" class="btn btn-outline" onclick="Components.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Guardar</button>
          </div>
        </form>
      `;
      Components.showModal(id ? 'Editar Miembro' : 'Nuevo Miembro del Elenco', body);
    },
    
    async save(id) {
      const data = {
        nombre: document.getElementById('elenco-nombre').value,
        tipo: document.getElementById('elenco-tipo').value,
        estado: document.getElementById('elenco-estado').value
      };
      
      try {
        if (id) await API.update('elenco', id, data);
        else await API.create('elenco', data);
        Components.closeModal();
        Components.showToast('Guardado correctamente');
        loadData();
      } catch (e) {
        Components.showToast(e.message, 'error');
      }
    },

    edit(id) { this.showForm(id); },
    
    async delete(id) {
      if (await Components.confirm('¿Estás seguro de eliminar este registro?')) {
        try {
          await API.remove('elenco', id);
          Components.showToast('Eliminado correctamente');
          loadData();
        } catch (e) {
          Components.showToast(e.message, 'error');
        }
      }
    }
  };

  container.innerHTML = `
    ${Components.pageHeader('Elenco', 'Gestión de actores, directores, artistas y productores', `
      <button class="btn btn-primary" onclick="window.Elenco.showForm()">
        <span class="material-symbols-outlined">add</span> Nuevo Miembro
      </button>
    `)}
    <div class="card mb-md">
      <div class="input-with-icon" style="max-width:300px;">
        <span class="material-symbols-outlined">search</span>
        <input type="text" placeholder="Buscar por nombre..." oninput="clearTimeout(window._to); window._to=setTimeout(()=>loadData(this.value), 300)">
      </div>
    </div>
    <div id="elenco-table-container">${Components.loading()}</div>
  `;
  loadData();
});
