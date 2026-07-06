App.registerPage('idiomas', async (container) => {
  const loadData = async (search = '') => {
    try {
      const data = await API.getAll('idiomas', search);
      const columns = [
        { key: 'id', label: 'ID', render: v => `<b>${v}</b>` },
        { key: 'descripcion', label: 'Descripción' },
        { key: 'estado', label: 'Estado', render: Components.badge },
        { key: 'acciones', label: 'Acciones', render: (_, r) => `
          <div style="display:flex; justify-content:flex-end; gap:8px;">
            <button class="btn btn-icon text-primary" onclick="window.Idiomas.edit(${r.id})">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn btn-icon text-error" onclick="window.Idiomas.delete(${r.id})">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        ` }
      ];
      document.getElementById('idiomas-table-container').innerHTML = Components.dataTable(columns, data);
    } catch (e) {
      Components.showToast(e.message, 'error');
    }
  };

  window.Idiomas = {
    async showForm(id = null) {
      let data = { descripcion: '', estado: 'Activo' };
      if (id) {
        try { data = await API.getOne('idiomas', id); } 
        catch (e) { return Components.showToast('Error', 'error'); }
      }

      const body = `
        <form onsubmit="event.preventDefault(); window.Idiomas.save(${id || 'null'})">
          <div class="form-group">
            <label>Descripción del Idioma</label>
            <input type="text" id="idioma-desc" class="form-control" required minlength="2" maxlength="60" value="${data.descripcion}" placeholder="Ej: Español, Inglés">
          </div>
          <div class="form-group">
            <label>Estado</label>
            <select id="idioma-estado" class="form-control">
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
      Components.showModal(id ? 'Editar Idioma' : 'Nuevo Idioma', body);
    },
    
    async save(id) {
      const data = {
        descripcion: document.getElementById('idioma-desc').value,
        estado: document.getElementById('idioma-estado').value
      };
      try {
        if (id) await API.update('idiomas', id, data);
        else await API.create('idiomas', data);
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
          await API.remove('idiomas', id);
          Components.showToast('Eliminado correctamente');
          loadData();
        } catch (e) {
          Components.showToast(e.message, 'error');
        }
      }
    }
  };

  container.innerHTML = `
    ${Components.pageHeader('Idiomas', 'Gestión de idiomas disponibles', `
      <button class="btn btn-primary" onclick="window.Idiomas.showForm()">
        <span class="material-symbols-outlined">add</span> Nuevo Idioma
      </button>
    `)}
    <div class="card mb-md">
      <div class="input-with-icon" style="max-width:300px;">
        <span class="material-symbols-outlined">search</span>
        <input type="text" placeholder="Buscar por idioma..." oninput="clearTimeout(window._to); window._to=setTimeout(()=>loadData(this.value), 300)">
      </div>
    </div>
    <div id="idiomas-table-container">${Components.loading()}</div>
  `;
  loadData();
});
