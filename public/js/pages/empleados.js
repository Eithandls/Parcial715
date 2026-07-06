App.registerPage('empleados', async (container) => {
  const loadData = async (search = '') => {
    try {
      const data = await API.getAll('empleados', search);
      const columns = [
        { key: 'id', label: 'ID', render: v => `<b>${v}</b>` },
        { key: 'nombre', label: 'Empleado', render: (v, r) => `${v} ${r.apellido}` },
        { key: 'cedula', label: 'Cédula' },
        { key: 'cargo', label: 'Cargo' },
        { key: 'username', label: 'Usuario', render: v => v || '<span class="text-muted">Sin acceso</span>' },
        { key: 'tanda', label: 'Tanda' },
        { key: 'estado', label: 'Estado', render: Components.badge },
        { key: 'acciones', label: 'Acciones', render: (_, r) => `
          <div style="display:flex; justify-content:flex-end; gap:8px;">
            <button class="btn btn-icon text-primary" onclick="window.Empleados.edit(${r.id})">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn btn-icon text-error" onclick="window.Empleados.delete(${r.id})">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        ` }
      ];
      document.getElementById('empleados-table-container').innerHTML = Components.dataTable(columns, data);
    } catch (e) {
      Components.showToast(e.message, 'error');
    }
  };

  window.Empleados = {
    async showForm(id = null) {
      let data = { nombre: '', apellido: '', cedula: '', cargo: '', tanda: 'Matutina', porciento_comision: 0, fecha_ingreso: '', estado: 'Activo', usuario_id: null, username: '', acceso_email: '' };
      if (id) {
        try { data = await API.getOne('empleados', id); } 
        catch (e) { return Components.showToast('Error', 'error'); }
      }

      const body = `
        <form onsubmit="event.preventDefault(); window.Empleados.save(${id || 'null'})">
          <div class="grid-2 mb-sm">
            <div class="form-group">
              <label>Nombre</label>
              <input type="text" id="emp-nombre" class="form-control" required minlength="2" maxlength="80" value="${data.nombre}">
            </div>
            <div class="form-group">
              <label>Apellido</label>
              <input type="text" id="emp-apellido" class="form-control" required minlength="2" maxlength="80" value="${data.apellido}">
            </div>
          </div>
          
          <div class="grid-2 mb-sm">
            <div class="form-group">
              <label>Cédula</label>
              <input type="text" id="emp-cedula" data-cedula inputmode="numeric" class="form-control" maxlength="13" value="${data.cedula || ''}" placeholder="000-0000000-0">
              <small class="text-muted">Se valida el dígito verificador dominicano.</small>
            </div>
            <div class="form-group">
              <label>Cargo</label>
              <input type="text" id="emp-cargo" class="form-control" minlength="2" maxlength="80" value="${data.cargo || ''}">
            </div>
          </div>

          <div class="grid-3 mb-sm">
            <div class="form-group">
              <label>Tanda</label>
              <select id="emp-tanda" class="form-control">
                <option value="Matutina" ${data.tanda === 'Matutina' ? 'selected' : ''}>Matutina</option>
                <option value="Vespertina" ${data.tanda === 'Vespertina' ? 'selected' : ''}>Vespertina</option>
                <option value="Nocturna" ${data.tanda === 'Nocturna' ? 'selected' : ''}>Nocturna</option>
              </select>
            </div>
            <div class="form-group">
              <label>% Comisión</label>
              <input type="number" step="0.1" min="0" max="100" id="emp-comision" class="form-control" value="${data.porciento_comision || 0}">
            </div>
            <div class="form-group">
              <label>Fecha Ingreso</label>
              <input type="date" id="emp-fecha" class="form-control" value="${data.fecha_ingreso || ''}">
            </div>
          </div>

          <div class="form-group" style="width: 30%;">
            <label>Estado</label>
            <select id="emp-estado" class="form-control">
              <option value="Activo" ${data.estado === 'Activo' ? 'selected' : ''}>Activo</option>
              <option value="Inactivo" ${data.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
            </select>
          </div>

          <hr style="margin:20px 0; border:none; border-top:1px solid var(--outline-variant);">
          <h4 style="margin-bottom:12px; color:var(--primary); display:flex; align-items:center; gap:8px;">
            <span class="material-symbols-outlined">login</span> Acceso al sistema
          </h4>
          <div class="grid-2 mb-sm">
            <div class="form-group">
              <label>Usuario</label>
              <input type="text" id="emp-username" class="form-control" required minlength="3" maxlength="30" pattern="[A-Za-z0-9._-]+" autocomplete="username" value="${data.username || ''}" placeholder="Ej: jperez">
            </div>
            <div class="form-group">
              <label>Correo de acceso</label>
              <input type="email" id="emp-email" class="form-control" required maxlength="160" autocomplete="email" value="${data.acceso_email || ''}" placeholder="empleado@correo.com">
            </div>
          </div>
          <div class="form-group">
            <label>Contraseña ${data.usuario_id ? '(dejar vacía para conservar la actual)' : ''}</label>
            <input type="password" id="emp-password" class="form-control" ${data.usuario_id ? '' : 'required'} minlength="6" maxlength="72" autocomplete="new-password" placeholder="Mínimo 6 caracteres">
            <small class="text-muted">Esta cuenta se creará automáticamente con rol empleado.</small>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
            <button type="button" class="btn btn-outline" onclick="Components.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Guardar</button>
          </div>
        </form>
      `;
      Components.showModal(id ? 'Editar Empleado' : 'Nuevo Empleado', body);
    },
    
    async save(id) {
      const data = {
        nombre: document.getElementById('emp-nombre').value,
        apellido: document.getElementById('emp-apellido').value,
        cedula: document.getElementById('emp-cedula').value,
        cargo: document.getElementById('emp-cargo').value,
        tanda: document.getElementById('emp-tanda').value,
        porciento_comision: document.getElementById('emp-comision').value,
        fecha_ingreso: document.getElementById('emp-fecha').value,
        estado: document.getElementById('emp-estado').value,
        username: document.getElementById('emp-username').value,
        email: document.getElementById('emp-email').value,
        password: document.getElementById('emp-password').value
      };
      try {
        if (id) await API.update('empleados', id, data);
        else await API.create('empleados', data);
        Components.closeModal();
        Components.showToast(id ? 'Empleado y acceso actualizados' : 'Empleado y usuario creados correctamente');
        loadData();
      } catch (e) {
        Components.showToast(e.message, 'error');
      }
    },

    edit(id) { this.showForm(id); },
    
    async delete(id) {
      if (await Components.confirm('¿Estás seguro de eliminar este empleado?')) {
        try {
          await API.remove('empleados', id);
          Components.showToast('Eliminado correctamente');
          loadData();
        } catch (e) {
          Components.showToast(e.message, 'error');
        }
      }
    }
  };

  container.innerHTML = `
    ${Components.pageHeader('Empleados', 'Gestión del personal de Cinema Club', `
      <button class="btn btn-primary" onclick="window.Empleados.showForm()">
        <span class="material-symbols-outlined">add</span> Nuevo Empleado
      </button>
    `)}
    <div class="card mb-md">
      <div class="input-with-icon" style="max-width:300px;">
        <span class="material-symbols-outlined">search</span>
        <input type="text" placeholder="Buscar por nombre..." oninput="clearTimeout(window._to); window._to=setTimeout(()=>loadData(this.value), 300)">
      </div>
    </div>
    <div id="empleados-table-container">${Components.loading()}</div>
  `;
  loadData();
});
