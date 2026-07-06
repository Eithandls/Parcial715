App.registerPage('clientes', async (container) => {
  const loadData = async (search = '') => {
    try {
      const data = await API.getAll('clientes', search);
      const columns = [
        { key: 'id', label: 'ID', render: v => `<b>${v}</b>` },
        { key: 'nombre', label: 'Cliente', render: (v, r) => `${v} ${r.apellido}` },
        { key: 'cedula', label: 'Cédula' },
        { key: 'telefono', label: 'Teléfono' },
        { key: 'tipo_persona', label: 'Tipo' },
        { key: 'estado', label: 'Estado', render: Components.badge },
        { key: 'acciones', label: 'Acciones', render: (_, r) => `
          <div style="display:flex; justify-content:flex-end; gap:8px;">
            <button class="btn btn-icon text-primary" onclick="window.Clientes.edit(${r.id})">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn btn-icon text-error" onclick="window.Clientes.delete(${r.id})">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        ` }
      ];
      document.getElementById('clientes-table-container').innerHTML = Components.dataTable(columns, data);
    } catch (e) {
      Components.showToast(e.message, 'error');
    }
  };

  window.Clientes = {
    async showForm(id = null) {
      let data = { nombre: '', apellido: '', cedula: '', telefono: '', email: '', direccion: '', tipo_persona: 'Fisica', estado: 'Activo' };
      if (id) {
        try { data = await API.getOne('clientes', id); } 
        catch (e) { return Components.showToast('Error', 'error'); }
      }

      const body = `
        <form onsubmit="event.preventDefault(); window.Clientes.save(${id || 'null'})">
          <div class="grid-2 mb-sm">
            <div class="form-group">
              <label>Nombre</label>
              <input type="text" id="cli-nombre" class="form-control" required minlength="2" maxlength="80" value="${data.nombre}">
            </div>
            <div class="form-group">
              <label>Apellido</label>
              <input type="text" id="cli-apellido" class="form-control" required minlength="2" maxlength="80" value="${data.apellido}">
            </div>
          </div>
          
          <div class="grid-2 mb-sm">
            <div class="form-group">
              <label>Cédula</label>
              <input type="text" id="cli-cedula" data-cedula inputmode="numeric" class="form-control" maxlength="13" value="${data.cedula || ''}" placeholder="000-0000000-0">
              <small class="text-muted">Se valida el dígito verificador dominicano.</small>
            </div>
            <div class="form-group">
              <label>Teléfono</label>
              <input type="tel" id="cli-telefono" class="form-control" pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}" maxlength="12" value="${data.telefono || ''}" placeholder="809-000-0000">
            </div>
          </div>

          <div class="form-group">
            <label>Email</label>
            <input type="email" id="cli-email" class="form-control" maxlength="160" value="${data.email || ''}">
          </div>

          <div class="form-group">
            <label>Dirección</label>
            <textarea id="cli-direccion" class="form-control" rows="2" maxlength="240">${data.direccion || ''}</textarea>
          </div>

          <div class="grid-2 mb-sm">
            <div class="form-group">
              <label>Tipo de Persona</label>
              <select id="cli-tipo" class="form-control">
                <option value="Fisica" ${data.tipo_persona === 'Fisica' ? 'selected' : ''}>Física</option>
                <option value="Juridica" ${data.tipo_persona === 'Juridica' ? 'selected' : ''}>Jurídica</option>
              </select>
            </div>
            <div class="form-group">
              <label>Estado</label>
              <select id="cli-estado" class="form-control">
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
      Components.showModal(id ? 'Editar Cliente' : 'Nuevo Cliente', body);
    },
    
    async save(id) {
      const data = {
        nombre: document.getElementById('cli-nombre').value,
        apellido: document.getElementById('cli-apellido').value,
        cedula: document.getElementById('cli-cedula').value,
        telefono: document.getElementById('cli-telefono').value,
        email: document.getElementById('cli-email').value,
        direccion: document.getElementById('cli-direccion').value,
        tipo_persona: document.getElementById('cli-tipo').value,
        estado: document.getElementById('cli-estado').value
      };
      try {
        if (id) await API.update('clientes', id, data);
        else await API.create('clientes', data);
        Components.closeModal();
        Components.showToast('Guardado correctamente');
        loadData();
      } catch (e) {
        Components.showToast(e.message, 'error');
      }
    },

    edit(id) { this.showForm(id); },
    
    async delete(id) {
      const confirmHtml = `
        <div style="text-align:center; padding:12px 0;">
          <span class="material-symbols-outlined" style="font-size:48px; color:var(--error); margin-bottom:12px;">warning</span>
          <h4 style="margin-bottom:8px;">¿Eliminar este cliente?</h4>
          <p class="text-muted">Esta acción no se puede deshacer. Se borrará permanentemente de la base de datos.</p>
          <p class="text-muted" style="margin-top:8px; font-size:13px;">Si solo quieres desactivarlo, usa la opción <b>Inactivo</b> en el formulario de edición.</p>
        </div>
      `;
      Components.showModal('Confirmar Eliminación', confirmHtml, `
        <button class="btn btn-outline" onclick="Components.closeModal()">Cancelar</button>
        <button class="btn btn-error" onclick="window.Clientes.confirmarDelete(${id})">
          <span class="material-symbols-outlined">delete_forever</span> Sí, eliminar permanentemente
        </button>
      `);
    },

    async confirmarDelete(id) {
      try {
        await API.request('DELETE', `/api/clientes/${id}/permanente`);
        Components.closeModal();
        Components.showToast('Cliente eliminado permanentemente');
        loadData();
      } catch (e) {
        Components.showToast(e.message, 'error');
      }
    }
  };

  container.innerHTML = `
    ${Components.pageHeader('Clientes', 'Gestión de clientes registrados', `
      <button class="btn btn-primary" onclick="window.Clientes.showForm()">
        <span class="material-symbols-outlined">add</span> Nuevo Cliente
      </button>
    `)}
    <div class="card mb-md">
      <div class="input-with-icon" style="max-width:300px;">
        <span class="material-symbols-outlined">search</span>
        <input type="text" placeholder="Buscar por nombre..." oninput="clearTimeout(window._to); window._to=setTimeout(()=>window.Clientes.loadData(this.value), 300)">
      </div>
    </div>
    <div id="clientes-table-container">${Components.loading()}</div>
  `;
  window.Clientes.loadData = loadData;
  loadData();
});
