App.registerPage('generos', async (container) => {
  const loadData = async (search = '') => {
    try {
      const data = await API.getAll('generos', search);
      const columns = [
        { key: 'id', label: 'ID', render: v => `<b>${v}</b>` },
        { key: 'descripcion', label: 'Descripción' },
        { key: 'estado', label: 'Estado', render: Components.badge },
        { key: 'acciones', label: 'Acciones', render: (_, r) => `
          <div style="display:flex; justify-content:flex-end; gap:8px;">
            <button class="btn btn-icon text-primary" onclick="window.Generos.edit(${r.id})">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn btn-icon text-error" onclick="window.Generos.delete(${r.id})">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        ` }
      ];
      document.getElementById('generos-table-container').innerHTML = Components.dataTable(columns, data);
    } catch (e) {
      Components.showToast(e.message, 'error');
    }
  };

  window.Generos = {
    async showForm(id = null) {
      let data = { descripcion: '', estado: 'Activo' };
      if (id) {
        try { data = await API.getOne('generos', id); } 
        catch (e) { return Components.showToast('Error', 'error'); }
      }

      const body = `
        <form onsubmit="event.preventDefault(); window.Generos.save(${id || 'null'})">
          <div class="form-group">
            <label>Descripción del Género</label>
            <input type="text" id="genero-desc" class="form-control" required value="${data.descripcion}" placeholder="Ej: Acción, Comedia">
          </div>
          <div class="form-group">
            <label>Estado</label>
            <select id="genero-estado" class="form-control">
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
      Components.showModal(id ? 'Editar Género' : 'Nuevo Género', body);
    },
    
    async save(id) {
      const data = {
        descripcion: document.getElementById('genero-desc').value,
        estado: document.getElementById('genero-estado').value
      };
      try {
        if (id) await API.update('generos', id, data);
        else await API.create('generos', data);
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
          await API.remove('generos', id);
          Components.showToast('Eliminado correctamente');
          loadData();
        } catch (e) {
          Components.showToast(e.message, 'error');
        }
      }
    }
  };

  container.innerHTML = `
    ${Components.pageHeader('Géneros', 'Gestión de géneros cinematográficos', `
      <button class="btn btn-primary" onclick="window.Generos.showForm()">
        <span class="material-symbols-outlined">add</span> Nuevo Género
      </button>
    `)}
    <div class="card mb-md">
      <div class="input-with-icon" style="max-width:300px;">
        <span class="material-symbols-outlined">search</span>
        <input type="text" placeholder="Buscar por género..." oninput="clearTimeout(window._to); window._to=setTimeout(()=>loadData(this.value), 300)">
      </div>
    </div>
    <div id="generos-table-container">${Components.loading()}</div>
  `;
  loadData();
});
