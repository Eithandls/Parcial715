App.registerPage('tipos-articulo', async (container) => {
  const loadData = async (search = '') => {
    try {
      const data = await API.getAll('tipos_articulo', search);
      
      const columns = [
        { key: 'id', label: 'ID', render: v => `<b>${v}</b>` },
        { key: 'descripcion', label: 'Descripción' },
        { key: 'estado', label: 'Estado', render: Components.badge },
        { key: 'acciones', label: 'Acciones', render: (_, r) => `
          <div style="display:flex; justify-content:flex-end; gap:8px;">
            <button class="btn btn-icon text-primary" onclick="window.TiposArticulo.edit(${r.id})">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn btn-icon text-error" onclick="window.TiposArticulo.delete(${r.id})">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        ` }
      ];

      document.getElementById('tipos-table-container').innerHTML = Components.dataTable(columns, data);
    } catch (e) {
      Components.showToast(e.message, 'error');
    }
  };

  window.TiposArticulo = {
    async showForm(id = null) {
      let data = { descripcion: '', estado: 'Activo' };
      if (id) {
        try {
          data = await API.getOne('tipos_articulo', id);
        } catch (e) {
          return Components.showToast('Error cargando datos', 'error');
        }
      }

      const body = `
        <form id="tipo-form" onsubmit="event.preventDefault(); window.TiposArticulo.save(${id || 'null'})">
          <div class="form-group">
            <label>Descripción</label>
            <input type="text" id="tipo-desc" class="form-control" required value="${data.descripcion}" placeholder="Ej: DVD Película">
          </div>
          <div class="form-group">
            <label>Estado</label>
            <select id="tipo-estado" class="form-control">
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
      Components.showModal(id ? 'Editar Tipo de Artículo' : 'Nuevo Tipo de Artículo', body);
    },
    
    async save(id) {
      const data = {
        descripcion: document.getElementById('tipo-desc').value,
        estado: document.getElementById('tipo-estado').value
      };
      
      try {
        if (id) await API.update('tipos_articulo', id, data);
        else await API.create('tipos_articulo', data);
        
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
          await API.remove('tipos_articulo', id);
          Components.showToast('Eliminado correctamente');
          loadData();
        } catch (e) {
          Components.showToast(e.message, 'error');
        }
      }
    }
  };

  container.innerHTML = `
    ${Components.pageHeader('Tipos de Artículos', 'Gestión de tipos de artículos disponibles', `
      <button class="btn btn-primary" onclick="window.TiposArticulo.showForm()">
        <span class="material-symbols-outlined">add</span> Nuevo Tipo
      </button>
    `)}
    <div class="card mb-md">
      <div class="input-with-icon" style="max-width:300px;">
        <span class="material-symbols-outlined">search</span>
        <input type="text" placeholder="Buscar por descripción..." oninput="window.TiposArticulo.search(this.value)">
      </div>
    </div>
    <div id="tipos-table-container">${Components.loading()}</div>
  `;

  // Debounce search
  let timeout = null;
  window.TiposArticulo.search = (val) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => loadData(val), 300);
  };

  loadData();
});
