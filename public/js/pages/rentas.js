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
      window.Rentas.rentasActivas = activas;

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
          <div style="display:flex; gap:6px;">
            <button class="btn btn-outline btn-sm" title="Imprimir Comprobante" onclick="Exporters.exportRentalReceipt(${JSON.stringify(r).replace(/"/g, '&quot;')}, 'pdf')">
              <span class="material-symbols-outlined" style="font-size:16px;">receipt</span>
            </button>
            <button class="btn btn-secondary btn-sm" onclick="window.Rentas.showDevolver(${r.id}, '${r.articulo_titulo.replace(/'/g, "\\'")}')">
               Devolver
            </button>
          </div>
        ` }
      ];

      const html = `
        <div class="card">
          <div class="page-header" style="margin-bottom:16px;">
            <h3 style="font-size:18px; color:var(--on-surface);">Rentas Activas (${activas.length})</h3>
            ${Components.exportButtons('window.Rentas.exportarActivas')}
          </div>
          ${Components.dataTable(columns, activas)}
        </div>
      `;
      document.getElementById('devoluciones-container').innerHTML = html;
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
                  <option value="">Seleccionar Empleado...</option>
                  ${(() => {
                    const matchId = App.user?.id;
                    const matchedEmp = empleados.find(e => e.usuario_id === matchId);
                    const defaultId = matchedEmp ? matchedEmp.id : (empleados[0]?.id ?? '');
                    return empleados.map(e => `<option value="${e.id}" ${e.id === defaultId ? 'selected' : ''}>${e.nombre} ${e.apellido}</option>`).join('');
                  })()}
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

            <div class="form-group mb-md">
              <label style="font-weight:600;">Método de Pago</label>
              <select id="renta-metodo-pago" class="form-control" onchange="window.Rentas.toggleCardPanel()">
                <option value="efectivo" selected>💵 Efectivo</option>
                <option value="tarjeta">💳 Tarjeta de Crédito / Débito</option>
              </select>
            </div>

            <div id="renta-card-panel" class="hidden card mb-md" style="background: var(--surface-container-low); border: 1px solid var(--outline-variant); padding: 16px; margin-bottom: 20px;">
              <h5 style="margin-bottom: 12px; color: var(--primary);">Datos de la Tarjeta</h5>
              ${Validators.renderCardFields('renta')}
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
      // Apply input masks immediately (card number groups of 4, MM/AA, 3-digit CVV)
      const formEl = document.getElementById('rentas-content');
      if (formEl && window.Validators) Validators.attachCedulaMasks(formEl);
    } else {
      document.getElementById('rentas-content').innerHTML = `
        <div id="devoluciones-container">${Components.loading()}</div>
      `;
      loadRentasActivas();
    }
  };

  window.Rentas = {
    rentasActivas: [],

    setMode(newMode) {
      mode = newMode;
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('btn-primary', btn.dataset.mode === mode);
        btn.classList.toggle('btn-outline', btn.dataset.mode !== mode);
      });
      renderContent();
    },

    toggleCardPanel() {
      const isCard = document.getElementById('renta-metodo-pago')?.value === 'tarjeta';
      const panel = document.getElementById('renta-card-panel');
      if (panel) {
        panel.classList.toggle('hidden', !isCard);
        if (isCard && window.Validators) {
          Validators.attachCardMasks(panel);
        }
      }
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
      if (dias < 1) dias = 1;

      const total = dias * costoDia;

      document.getElementById('renta-dias').textContent = dias;
      document.getElementById('renta-costo-dia').textContent = Components.formatCurrency(costoDia);
      document.getElementById('renta-total').textContent = Components.formatCurrency(total);
    },

    async saveRenta() {
      const clienteId = document.getElementById('renta-cliente').value;
      const empleadoId = document.getElementById('renta-empleado').value;
      const articuloId = document.getElementById('renta-articulo').value;
      const fechaRenta = document.getElementById('renta-desde').value;
      const fechaHasta = document.getElementById('renta-hasta').value;
      const comentario = document.getElementById('renta-comentario').value;
      const metodoPago = document.getElementById('renta-metodo-pago')?.value || 'efectivo';

      if (metodoPago === 'tarjeta') {
        const cardName = document.getElementById('renta-card-name')?.value?.trim();
        const cardNumber = document.getElementById('renta-card-number')?.value?.trim();
        const cardExpiry = document.getElementById('renta-card-expiry')?.value?.trim();
        const cardCvv = document.getElementById('renta-card-cvv')?.value?.trim();

        if (!cardName || !cardNumber || !cardExpiry || !cardCvv) {
          Components.showToast('Complete todos los datos de la tarjeta (titular, número, expiración y CVV)', 'error');
          return;
        }
        if (!Validators.isValidCardNumber(cardNumber)) {
          Components.showToast('Número de tarjeta no válido (verifique los 16 dígitos y el dígito verificador)', 'error');
          return;
        }
        if (!Validators.isValidExpiry(cardExpiry)) {
          Components.showToast('Fecha de expiración inválida o vencida. Formato: MM/AA', 'error');
          return;
        }
        if (cardCvv.length !== 3) {
          Components.showToast('El CVV debe tener exactamente 3 dígitos numéricos', 'error');
          return;
        }
      }

      const clienteObj = clientes.find(c => String(c.id) === String(clienteId));
      const articuloObj = articulos.find(a => String(a.id) === String(articuloId));
      
      const artSelect = document.getElementById('renta-articulo');
      const costoDia = parseFloat(artSelect.options[artSelect.selectedIndex]?.dataset.costo || 0);
      const start = new Date(fechaRenta);
      const end = new Date(fechaHasta);
      let dias = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (dias < 1) dias = 1;
      const total = dias * costoDia;

      const data = {
        cliente_id: clienteId,
        empleado_id: empleadoId,
        articulo_id: articuloId,
        fecha_renta: fechaRenta,
        fecha_devolucion_prevista: fechaHasta,
        comentario: comentario,
        metodo_pago: metodoPago
      };

      try {
        const res = await API.create('rentas', data);
        const rentaId = res.id || res.resultId || 'N/A';

        Components.showToast('Renta registrada exitosamente');
        
        const rentaCreated = {
          id: rentaId,
          cliente_nombre: clienteObj?.nombre || '',
          cliente_apellido: clienteObj?.apellido || '',
          cliente_cedula: clienteObj?.cedula || '',
          articulo_titulo: articuloObj?.titulo || '',
          fecha_renta: fechaRenta,
          fecha_devolucion_prevista: fechaHasta,
          dias: dias,
          monto_por_dia: costoDia,
          total: total
        };

        // Mostrar modal de confirmación con opciones para descargar el comprobante
        Components.showModal('¡Renta Registrada Con Éxito!', `
          <div style="text-align:center; padding: 12px 0;">
            <span class="material-symbols-outlined" style="font-size: 56px; color: var(--success); margin-bottom: 12px;">check_circle</span>
            <h4 style="font-size:20px; font-weight:700;">Comprobante de Renta #${rentaId}</h4>
            <p class="text-muted mb-md">La transacción fue procesada en el sistema.</p>
            
            <div style="background:var(--surface-container); padding:16px; border-radius:8px; text-align:left; margin-bottom:20px; font-size:14px;">
              <div style="margin-bottom:6px;"><strong>Cliente:</strong> ${rentaCreated.cliente_nombre} ${rentaCreated.cliente_apellido}</div>
              <div style="margin-bottom:6px;"><strong>Artículo:</strong> ${rentaCreated.articulo_titulo}</div>
              <div style="margin-bottom:6px;"><strong>Fechas:</strong> ${fechaRenta} al ${fechaHasta} (${dias} días)</div>
              <div style="font-size:16px; color:var(--primary); margin-top:8px;"><strong>Total:</strong> ${Components.formatCurrency(total)}</div>
            </div>

            <p style="font-weight:600; font-size:14px; margin-bottom:12px;">Descargar Comprobante / Recibo:</p>
            <div style="display:flex; justify-content:center; gap:8px;">
              <button class="btn btn-outline" onclick="Exporters.exportRentalReceipt(${JSON.stringify(rentaCreated).replace(/"/g, '&quot;')}, 'pdf')">
                <span class="material-symbols-outlined" style="color:#ef4444;">picture_as_pdf</span> PDF
              </button>
              <button class="btn btn-outline" onclick="Exporters.exportRentalReceipt(${JSON.stringify(rentaCreated).replace(/"/g, '&quot;')}, 'xls')">
                <span class="material-symbols-outlined" style="color:#10b981;">table_chart</span> Excel (.xls)
              </button>
              <button class="btn btn-outline" onclick="Exporters.exportRentalReceipt(${JSON.stringify(rentaCreated).replace(/"/g, '&quot;')}, 'xml')">
                <span class="material-symbols-outlined" style="color:#f59e0b;">code</span> XML
              </button>
            </div>
          </div>
        `, `<button class="btn btn-primary" onclick="Components.closeModal()">Cerrar</button>`);

        // Reload articles (stock changed)
        await loadDependencies();
        // Reset form
        renderContent();
      } catch(e) {
        Components.showToast(e.message, 'error');
      }
    },

    exportarActivas(format = 'pdf') {
      if (!this.rentasActivas || !this.rentasActivas.length) {
        return Components.showToast('No hay rentas activas para exportar', 'error');
      }

      const title = 'Reporte de Rentas Activas';
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `rentas_activas_${dateStr}.${format}`;

      const totalMonto = this.rentasActivas.reduce((sum, r) => sum + Number(r.total || 0), 0);
      const summary = [
        { label: 'Total Rentas Activas', value: this.rentasActivas.length.toString() },
        { label: 'Monto Total Pendiente', value: Components.formatCurrency(totalMonto) }
      ];

      const columns = [
        { key: 'id', label: 'ID Renta' },
        { key: 'cliente_nombre', label: 'Cliente', render: (v, r) => `${v} ${r.cliente_apellido}` },
        { key: 'articulo_titulo', label: 'Artículo' },
        { key: 'fecha_renta', label: 'Fecha Renta', render: Components.formatDate },
        { key: 'fecha_devolucion_prevista', label: 'Devolución Prevista', render: Components.formatDate },
        { key: 'total', label: 'Total', render: Components.formatCurrency }
      ];

      if (format === 'pdf') {
        Exporters.toPDF({ title, subtitle: 'Listado de artículos rentados actualmente sin devolver', summary, columns, data: this.rentasActivas, filename });
      } else if (format === 'xls') {
        Exporters.toXLS({ title, summary, columns, data: this.rentasActivas, filename });
      } else if (format === 'xml') {
        Exporters.toXML({ title, summary, columns, data: this.rentasActivas, filename });
      } else if (format === 'csv') {
        Exporters.toCSV({ columns, data: this.rentasActivas, filename });
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
