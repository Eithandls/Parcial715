App.registerPage('rentas', async (container) => {
  let mode = 'nueva'; // 'nueva' or 'devolver'
  let clientes = [], articulos = [], empleados = [];

  const loadDependencies = async () => {
    try {
      [clientes, articulos, empleados] = await Promise.all([
        API.getAll('clientes', ''),
        API.getAll('articulos', ''),
        API.getAll('empleados', '')
      ]);
      // Filter only active
      clientes = clientes.filter(c => c.estado === 'Activo');
      articulos = articulos.filter(a => a.estado === 'Activo' && a.cantidad_disponible > 0);
      empleados = empleados.filter(e => e.estado === 'Activo');
    } catch(e) {
      console.error(e);
    }
  };

  const loadRentasActivas = async () => {
    try {
      const data = await API.getAll('rentas');
      const activas = data.filter(r => r.estado === 'Activa');
      const columns = [
        { key: 'id', label: 'ID', render: v => `<b>#${v}</b>` },
        { key: 'cliente_nombre', label: 'Cliente', render: (v, r) => `${v} ${r.cliente_apellido}` },
        { key: 'articulo_titulo', label: 'Artículo' },
        { key: 'fecha_renta', label: 'Fecha Renta', render: Components.formatDate },
        { key: 'fecha_devolucion_prevista', label: 'Devolución Prevista', render: (v) => {
          const isOverdue = new Date(v) < new Date(new Date().toDateString());
          return `<span style="color: ${isOverdue ? 'var(--error)' : 'inherit'}; font-weight: ${isOverdue ? 'bold' : 'normal'}">${Components.formatDate(v)}</span>`;
        }},
        { key: 'total', label: 'Total', render: Components.formatCurrency },
        { key: 'acciones', label: 'Acción', render: (_, r) => `
          <button class="btn btn-secondary btn-sm" onclick="window.Rentas.showDevolver(${r.id}, '${r.articulo_titulo}')">
             Devolver
          </button>
        ` }
      ];
      document.getElementById('devoluciones-container').innerHTML = Components.dataTable(columns, activas);
    } catch (e) {
      Components.showToast('Error cargando rentas activas', 'error');
    }
  };

  const renderContent = () => {
    if (mode === 'nueva') {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      
      document.getElementById('rentas-content').innerHTML = `
        <div class="card" style="max-width: 800px; margin: 0 auto;">
          <h3 class="mb-lg">Registrar Nueva Renta</h3>
          <form onsubmit="event.preventDefault(); window.Rentas.saveRenta()">
            <div class="grid-2 mb-md">
              <div class="form-group">
                <label>Cliente</label>
                <select id="renta-cliente" class="form-control" required>
                  <option value="">Seleccionar Cliente...</option>
                  ${clientes.map(c => `<option value="${c.id}">${c.nombre} ${c.apellido} (${c.cedula})</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>Empleado (Cajero)</label>
                <select id="renta-empleado" class="form-control" required>
                  <option value="${App.user?.id || ''}" selected>${App.user?.nombre || 'Seleccionar...'}</option>
                  ${empleados.map(e => `<option value="${e.id}">${e.nombre} ${e.apellido}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="form-group mb-md">
              <label>Artículo a Rentar</label>
              <select id="renta-articulo" class="form-control" required onchange="window.Rentas.calcTotal()">
                <option value="">Seleccionar Artículo Disponible...</option>
                ${articulos.map(a => `<option value="${a.id}" data-costo="${a.costo_dia}">[${a.tipo_articulo}] ${a.titulo} - ${Components.formatCurrency(a.costo_dia)}/día</option>`).join('')}
              </select>
            </div>

            <div class="grid-2 mb-lg">
              <div class="form-group">
                <label>Fecha Renta</label>
                <input type="date" id="renta-desde" class="form-control" required value="${today}" onchange="window.Rentas.calcTotal()">
              </div>
              <div class="form-group">
                <label>Fecha Devolución Prevista</label>
                <input type="date" id="renta-hasta" class="form-control" required value="${tomorrow}" onchange="window.Rentas.calcTotal()">
              </div>
            </div>

            <div style="background: var(--surface-container); padding: 16px; border-radius: 8px; margin-bottom: 24px;">
              <div style="display:flex; justify-content:space-between; margin-bottom: 8px;">
                <span>Días de renta:</span>
                <span id="renta-dias" class="font-bold">1</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom: 8px;">
                <span>Costo por día:</span>
                <span id="renta-costo-dia" class="font-bold">RD$ 0.00</span>
              </div>
              <div style="border-top: 1px solid var(--outline-variant); margin: 8px 0;"></div>
              <div style="display:flex; justify-content:space-between; font-size: 18px; color: var(--primary);">
                <b>Total a Pagar:</b>
                <b id="renta-total">RD$ 0.00</b>
              </div>
            </div>

            <div class="form-group">
              <label>Comentario (Opcional)</label>
              <textarea id="renta-comentario" class="form-control" rows="2"></textarea>
            </div>

            <div style="display:flex; justify-content:flex-end;">
              <button type="submit" class="btn btn-primary btn-lg">Registrar Renta</button>
            </div>
          </form>
        </div>
      `;
    } else {
      document.getElementById('rentas-content').innerHTML = `
        <div id="devoluciones-container">${Components.loading()}</div>
      `;
      loadRentasActivas();
    }
  };

  window.Rentas = {
    setMode(newMode) {
      mode = newMode;
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('btn-primary', btn.dataset.mode === mode);
        btn.classList.toggle('btn-outline', btn.dataset.mode !== mode);
      });
      renderContent();
    },

    calcTotal() {
      const artSelect = document.getElementById('renta-articulo');
      const desde = document.getElementById('renta-desde').value;
      const hasta = document.getElementById('renta-hasta').value;
      
      if (!artSelect.value || !desde || !hasta) return;

      const costoDia = parseFloat(artSelect.options[artSelect.selectedIndex].dataset.costo || 0);
      
      const start = new Date(desde);
      const end = new Date(hasta);
      let dias = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (dias < 1) dias = 1; // Minimo 1 dia

      const total = dias * costoDia;

      document.getElementById('renta-dias').textContent = dias;
      document.getElementById('renta-costo-dia').textContent = Components.formatCurrency(costoDia);
      document.getElementById('renta-total').textContent = Components.formatCurrency(total);
    },

    async saveRenta() {
      const data = {
        cliente_id: document.getElementById('renta-cliente').value,
        empleado_id: document.getElementById('renta-empleado').value,
        articulo_id: document.getElementById('renta-articulo').value,
        fecha_renta: document.getElementById('renta-desde').value,
        fecha_devolucion_prevista: document.getElementById('renta-hasta').value,
        comentario: document.getElementById('renta-comentario').value
      };

      try {
        await API.create('rentas', data);
        Components.showToast('Renta registrada exitosamente');
        // Reload articles (stock changed)
        await loadDependencies();
        // Reset form
        renderContent();
      } catch(e) {
        Components.showToast(e.message, 'error');
      }
    },

    showDevolver(id, titulo) {
      const today = new Date().toISOString().split('T')[0];
      const body = `
        <p>¿Registrar devolución del artículo <b>${titulo}</b>?</p>
        <div class="form-group mt-md">
          <label>Fecha Devolución Real</label>
          <input type="date" id="dev-fecha" class="form-control" value="${today}" required>
        </div>
        <div class="form-group">
          <label>Comentario (Estado del artículo, cargos extra, etc.)</label>
          <textarea id="dev-comentario" class="form-control" rows="3"></textarea>
        </div>
      `;
      Components.showModal('Procesar Devolución', body, `
        <button class="btn btn-outline" onclick="Components.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="window.Rentas.processDevolucion(${id})">Confirmar Devolución</button>
      `);
    },

    async processDevolucion(id) {
      const data = {
        fecha_devolucion_real: document.getElementById('dev-fecha').value,
        comentario: document.getElementById('dev-comentario').value
      };
      try {
        await API.devolver(id, data);
        Components.closeModal();
        Components.showToast('Devolución procesada correctamente');
        // Reload stock
        await loadDependencies();
        loadRentasActivas();
      } catch(e) {
        Components.showToast(e.message, 'error');
      }
    }
  };

  container.innerHTML = `
    ${Components.pageHeader('Operaciones de Renta', 'Registro de rentas y devoluciones de artículos')}
    
    <div style="display:flex; gap:12px; margin-bottom: 24px;">
      <button class="btn btn-primary tab-btn" data-mode="nueva" onclick="window.Rentas.setMode('nueva')">
        <span class="material-symbols-outlined">add_circle</span> Nueva Renta
      </button>
      <button class="btn btn-outline tab-btn" data-mode="devolver" onclick="window.Rentas.setMode('devolver')">
        <span class="material-symbols-outlined">assignment_return</span> Devoluciones
      </button>
    </div>

    <div id="rentas-content">${Components.loading()}</div>
  `;

  await loadDependencies();
  renderContent();
});
