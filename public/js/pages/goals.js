const GoalsPage = {
  async render() {
    const content = $('#page-content');
    const navbar = $('#navbar');
    navbar.style.display = '';
    content.style.paddingBottom = '';

    content.innerHTML = '<div class="loading">Cargando...</div>';

    try {
      const goals = await API.goals.list();
      this.renderContent(content, goals);
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><p>Error: ${err.message}</p></div>`;
    }
  },

  renderContent(content, goals) {
    content.innerHTML = '';

    const header = create('div', { className: 'goals-header' });
    header.appendChild(create('h2', { className: 'page-title', textContent: 'Metas financieras' }));
    content.appendChild(header);

    if (goals.length > 0) {
      goals.forEach(goal => {
        content.appendChild(this.renderGoalCard(goal));
      });
    } else {
      content.appendChild(create('div', {
        className: 'empty-state',
        innerHTML: '<div class="empty-state-icon">🎯</div><div class="empty-state-text">No tenés metas configuradas</div>'
      }));
    }

    const createBtn = create('button', {
      className: 'btn btn-primary btn-full',
      textContent: '+ Crear nueva meta',
      style: { marginTop: 'var(--space-md)' }
    });
    on(createBtn, 'click', () => this.openCreateModal());
    content.appendChild(createBtn);
  },

  renderGoalCard(goal) {
    const card = create('div', { className: 'goal-card' });

    const header = create('div', { className: 'goal-card-header' });
    const titleText = goal.tipo === 'gasto_categoria'
      ? `Límite de gasto — ${(goal.categoryName || 'Categoría').replace(/^\s*[└─]\s*/, '')}`
      : goal.tipo === 'gasto_general'
        ? 'Límite de gasto general'
        : 'Meta de ahorro mensual';
    const title = create('div', { className: 'goal-card-title', textContent: titleText });

    const actions = create('div', { className: 'goal-card-actions' });
    const editBtn = create('button', {
      className: 'icon-btn',
      innerHTML: '✏️',
      title: 'Editar meta'
    });
    on(editBtn, 'click', () => this.openEditModal(goal));

    const deleteBtn = create('button', {
      className: 'icon-btn danger',
      innerHTML: '🗑️',
      title: 'Eliminar meta'
    });
    on(deleteBtn, 'click', async () => {
      if (confirm('¿Eliminar esta meta?')) {
        await API.goals.delete(goal.id);
        showToast('Meta eliminada');
        this.render();
      }
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    header.appendChild(title);
    header.appendChild(actions);
    card.appendChild(header);

    const modeLabels = {
      monto_fijo: `${formatearEuro(goal.montoFijo)}/mes`,
      porcentaje_salario: `${goal.porcentaje}% del salario`,
      porcentaje_ingresos_dinamico: `${goal.porcentaje}% de ingresos`
    };
    card.appendChild(create('div', { className: 'goal-card-detail', textContent: modeLabels[goal.modo] || goal.modo }));

    if (goal.meses && goal.meses.length > 0) {
      const sorted = [...goal.meses].sort();
      const rangeText = sorted.length === 1
        ? formatMonth(sorted[0])
        : `${formatMonth(sorted[0])} - ${formatMonth(sorted[sorted.length - 1])}`;
      card.appendChild(create('div', { className: 'goal-card-range', textContent: rangeText }));
    }

    return card;
  },

  async openCreateModal() {
    const body = create('div', { className: 'goal-modal-body' });

    const tipoGroup = this.renderTipoSelector();
    const catGroup = await this.renderCategoriaSelector();
    catGroup.style.display = 'none';
    const metodoGroup = this.renderMetodoSelector();
    const camposGroup = this.renderCamposDinamicos();
    const periodoGroup = this.renderPeriodoSelector();

    body.appendChild(tipoGroup);
    body.appendChild(catGroup);
    body.appendChild(metodoGroup);
    body.appendChild(camposGroup);
    body.appendChild(periodoGroup);

    const tipoSelect = $('#goal-tipo', body);
    const metodoSelect = $('#goal-modo', body);
    this.updateCamposDinamicos(metodoSelect.value, camposGroup);

    on(tipoSelect, 'change', () => {
      catGroup.style.display = tipoSelect.value === 'gasto_categoria' ? '' : 'none';
    });
    on(metodoSelect, 'change', () => this.updateCamposDinamicos(metodoSelect.value, camposGroup));

    const errorDiv = create('div', { className: 'goal-modal-error', style: { display: 'none' } });
    body.appendChild(errorDiv);

    const saveBtn = create('button', { className: 'btn btn-primary btn-full', textContent: 'Guardar meta' });

    const showError = (msg) => {
      errorDiv.textContent = msg;
      errorDiv.style.display = '';
    };
    const hideError = () => { errorDiv.style.display = 'none'; };

    on(saveBtn, 'click', async () => {
      hideError();
      const data = this.gatherFormData(body);
      if (!data) return;

      try {
        const existingGoals = await API.goals.list();
        const conflict = this.findConflict(existingGoals, data);
        if (conflict) {
          const replace = confirm(conflict.msg);
          if (!replace) return;
          await API.goals.delete(conflict.goal.id);
        }

        await API.goals.create(data);
        Modal.hide();
        showToast('Meta guardada');
        this.render();
      } catch (err) {
        showError(err.message);
      }
    });

    const footer = create('div', { style: { display: 'flex', gap: '8px', marginTop: '16px' } });
    footer.appendChild(saveBtn);

    Modal.show('Crear nueva meta', body, { footer });
  },

  async openEditModal(goal) {
    const body = create('div', { className: 'goal-modal-body' });

    const tipoGroup = this.renderTipoSelector();
    const catGroup = await this.renderCategoriaSelector();
    const metodoGroup = this.renderMetodoSelector();
    const camposGroup = this.renderCamposDinamicos();
    const periodoGroup = this.renderPeriodoSelector();

    body.appendChild(tipoGroup);
    body.appendChild(catGroup);
    body.appendChild(metodoGroup);
    body.appendChild(camposGroup);
    body.appendChild(periodoGroup);

    const tipoSelect = $('#goal-tipo', body);
    const metodoSelect = $('#goal-modo', body);
    tipoSelect.value = goal.tipo;
    catGroup.style.display = goal.tipo === 'gasto_categoria' ? '' : 'none';
    metodoSelect.value = goal.modo;
    this.updateCamposDinamicos(goal.modo, camposGroup);

    if (goal.tipo === 'gasto_categoria' && goal.categoryId) {
      const catSelect = $('#goal-category', body);
      if (catSelect) catSelect.value = goal.categoryId;
    }

    if (goal.modo === 'monto_fijo') {
      $('#goal-monto', body).value = goal.montoFijo || '';
    } else {
      $('#goal-porcentaje', body).value = goal.porcentaje || '';
      if (goal.modo === 'porcentaje_salario') {
        $('#goal-salario', body).value = goal.salarioEstimado || '';
      }
    }

    if (goal.meses && goal.meses.length === 1) {
      $('#goal-month-single', body).value = goal.meses[0];
    } else if (goal.meses && goal.meses.length > 1) {
      const sorted = [...goal.meses].sort();
      $('#goal-month-from', body).value = sorted[0];
      $('#goal-month-to', body).value = sorted[sorted.length - 1];
      const tabMultiple = $('.goal-duration-tab:nth-child(2)', body);
      if (tabMultiple) tabMultiple.click();
    }

    on(tipoSelect, 'change', () => {
      catGroup.style.display = tipoSelect.value === 'gasto_categoria' ? '' : 'none';
    });
    on(metodoSelect, 'change', () => this.updateCamposDinamicos(metodoSelect.value, camposGroup));

    const errorDiv = create('div', { className: 'goal-modal-error', style: { display: 'none' } });
    body.appendChild(errorDiv);

    const saveBtn = create('button', { className: 'btn btn-primary btn-full', textContent: 'Actualizar meta' });

    const showError = (msg) => {
      errorDiv.textContent = msg;
      errorDiv.style.display = '';
    };
    const hideError = () => { errorDiv.style.display = 'none'; };

    on(saveBtn, 'click', async () => {
      hideError();
      const data = this.gatherFormData(body);
      if (!data) return;

      try {
        await API.goals.delete(goal.id);
        await API.goals.create(data);
        Modal.hide();
        showToast('Meta actualizada');
        this.render();
      } catch (err) {
        showError(err.message);
      }
    });

    const footer = create('div', { style: { display: 'flex', gap: '8px', marginTop: '16px' } });
    footer.appendChild(saveBtn);

    Modal.show('Editar meta', body, { footer });
  },

  renderTipoSelector() {
    const group = create('div', { className: 'form-group' });
    group.appendChild(create('label', { textContent: 'Tipo de meta' }));

    const select = create('select', { className: 'form-control', id: 'goal-tipo' });
    select.appendChild(create('option', { value: 'ahorro_mensual', textContent: 'Meta de ahorro mensual' }));
    select.appendChild(create('option', { value: 'gasto_categoria', textContent: 'Límite de gasto por categoría' }));
    select.appendChild(create('option', { value: 'gasto_general', textContent: 'Límite de gasto general' }));
    group.appendChild(select);

    return group;
  },

  async renderCategoriaSelector() {
    const group = create('div', { className: 'form-group', id: 'goal-categoria-group' });
    group.appendChild(create('label', { textContent: 'Categoría / Subcategoría' }));

    const select = create('select', { className: 'form-control', id: 'goal-category' });
    select.appendChild(create('option', { value: '', textContent: 'Seleccionar categoría...' }));

    try {
      const categories = await API.categories.list();
      const catMap = {};
      categories.forEach(c => catMap[c.id] = c);

      const parents = categories.filter(c => !c.parentId);
      const childrenMap = {};
      categories.forEach(c => {
        if (c.parentId) {
          if (!childrenMap[c.parentId]) childrenMap[c.parentId] = [];
          childrenMap[c.parentId].push(c);
        }
      });

      parents.forEach(cat => {
        select.appendChild(create('option', { value: cat.id, textContent: cat.nombre }));
        (childrenMap[cat.id] || []).forEach(child => {
          select.appendChild(create('option', { value: child.id, textContent: `  └ ${child.nombre}` }));
        });
      });
    } catch {
      select.appendChild(create('option', { value: '', textContent: 'Error al cargar categorías', disabled: true }));
    }

    group.appendChild(select);
    return group;
  },

  renderMetodoSelector() {
    const group = create('div', { className: 'form-group', id: 'goal-metodo-group' });
    group.appendChild(create('label', { textContent: 'Método de cálculo' }));

    const select = create('select', { className: 'form-control', id: 'goal-modo' });
    select.appendChild(create('option', { value: 'monto_fijo', textContent: 'Monto fijo por mes' }));
    select.appendChild(create('option', { value: 'porcentaje_salario', textContent: 'Porcentaje del salario' }));
    select.appendChild(create('option', { value: 'porcentaje_ingresos_dinamico', textContent: 'Porcentaje de ingresos (dinámico)' }));
    group.appendChild(select);

    return group;
  },

  renderCamposDinamicos() {
    const container = create('div', { id: 'goal-campos-container' });

    const montoGroup = create('div', { className: 'form-group', id: 'goal-campo-monto' });
    montoGroup.appendChild(create('label', { textContent: 'Monto mensual (€)' }));
    montoGroup.appendChild(create('input', {
      className: 'form-control', type: 'number', id: 'goal-monto',
      placeholder: '0', min: '0', step: '0.01'
    }));
    container.appendChild(montoGroup);

    const salarioGroup = create('div', { className: 'form-group', id: 'goal-campo-salario', style: { display: 'none' } });
    salarioGroup.appendChild(create('label', { textContent: 'Salario estimado (€)' }));
    salarioGroup.appendChild(create('input', {
      className: 'form-control', type: 'number', id: 'goal-salario',
      placeholder: '0', min: '0', step: '0.01'
    }));
    container.appendChild(salarioGroup);

    const porcentajeGroup = create('div', { className: 'form-group', id: 'goal-campo-porcentaje', style: { display: 'none' } });
    porcentajeGroup.appendChild(create('label', { textContent: 'Porcentaje (%)' }));
    porcentajeGroup.appendChild(create('input', {
      className: 'form-control', type: 'number', id: 'goal-porcentaje',
      placeholder: '0', min: '1', max: '100'
    }));
    container.appendChild(porcentajeGroup);

    return container;
  },

  updateCamposDinamicos(valor, container) {
    const montoGroup = $('#goal-campo-monto', container);
    const salarioGroup = $('#goal-campo-salario', container);
    const porcentajeGroup = $('#goal-campo-porcentaje', container);

    montoGroup.style.display = valor === 'monto_fijo' ? '' : 'none';
    salarioGroup.style.display = valor === 'porcentaje_salario' ? '' : 'none';
    porcentajeGroup.style.display = valor !== 'monto_fijo' ? '' : 'none';
  },

  renderPeriodoSelector() {
    const section = create('div', { className: 'goal-periodo-section' });
    section.appendChild(create('label', { textContent: 'Período', style: { marginBottom: '8px', display: 'block', fontWeight: '500' } }));

    const tabs = create('div', { className: 'goal-duration-tabs' });
    const tabUnico = create('button', { className: 'goal-duration-tab active', textContent: 'Mes único' });
    const tabMultiple = create('button', { className: 'goal-duration-tab', textContent: 'Múltiples meses' });
    tabs.appendChild(tabUnico);
    tabs.appendChild(tabMultiple);
    section.appendChild(tabs);

    const inputsContainer = create('div', { className: 'goal-month-inputs' });

    const singleContainer = create('div', { id: 'goal-periodo-single' });
    singleContainer.appendChild(create('input', {
      className: 'form-control', type: 'month', id: 'goal-month-single'
    }));
    inputsContainer.appendChild(singleContainer);

    const rangeContainer = create('div', { className: 'goal-month-range', id: 'goal-periodo-range', style: { display: 'none' } });
    const desdeGroup = create('div', { className: 'form-group' });
    desdeGroup.appendChild(create('label', { textContent: 'Desde' }));
    desdeGroup.appendChild(create('input', {
      className: 'form-control', type: 'month', id: 'goal-month-from'
    }));
    rangeContainer.appendChild(desdeGroup);

    const hastaGroup = create('div', { className: 'form-group' });
    hastaGroup.appendChild(create('label', { textContent: 'Hasta' }));
    hastaGroup.appendChild(create('input', {
      className: 'form-control', type: 'month', id: 'goal-month-to'
    }));
    hastaGroup.appendChild(create('span', { className: 'goal-month-hint', textContent: '(incluido)' }));
    rangeContainer.appendChild(hastaGroup);
    inputsContainer.appendChild(rangeContainer);

    section.appendChild(inputsContainer);

    on(tabUnico, 'click', (e) => {
      e.preventDefault();
      tabUnico.classList.add('active');
      tabMultiple.classList.remove('active');
      singleContainer.style.display = '';
      rangeContainer.style.display = 'none';
    });

    on(tabMultiple, 'click', (e) => {
      e.preventDefault();
      tabMultiple.classList.add('active');
      tabUnico.classList.remove('active');
      singleContainer.style.display = 'none';
      rangeContainer.style.display = '';
    });

    return section;
  },

  gatherFormData(body) {
    const tipo = $('#goal-tipo', body).value;
    const modo = $('#goal-modo', body).value;

    const data = { tipo, modo };

    if (tipo === 'gasto_categoria') {
      const catSelect = $('#goal-category', body);
      const categoryId = catSelect ? catSelect.value : '';
      if (!categoryId) {
        showToast('Seleccioná una categoría', 'error');
        return null;
      }
      data.categoryId = categoryId;
      const selectedOption = catSelect.options[catSelect.selectedIndex];
      data.categoryName = selectedOption ? selectedOption.textContent.replace(/^\s*[└─]\s*/, '').trim() : '';
    }

    if (modo === 'monto_fijo') {
      data.montoFijo = parseFloat($('#goal-monto', body).value);
      if (!data.montoFijo || data.montoFijo <= 0) {
        showToast('Ingresá un monto válido', 'error');
        return null;
      }
    } else {
      data.porcentaje = parseFloat($('#goal-porcentaje', body).value);
      if (!data.porcentaje || data.porcentaje <= 0 || data.porcentaje > 100) {
        showToast('Ingresá un porcentaje válido', 'error');
        return null;
      }
      if (modo === 'porcentaje_salario') {
        data.salarioEstimado = parseFloat($('#goal-salario', body).value);
        if (!data.salarioEstimado || data.salarioEstimado <= 0) {
          showToast('Ingresá tu salario estimado', 'error');
          return null;
        }
      }
    }

    const isRange = $('#goal-periodo-range', body).style.display !== 'none';

    if (isRange) {
      const from = $('#goal-month-from', body).value;
      const to = $('#goal-month-to', body).value;
      if (!from || !to) {
        showToast('Seleccioná los meses de inicio y fin', 'error');
        return null;
      }
      if (from > to) {
        showToast('El mes de fin debe ser posterior al de inicio', 'error');
        return null;
      }
      data.meses = this.generateMonthRange(from, to);
    } else {
      const single = $('#goal-month-single', body).value;
      if (!single) {
        showToast('Seleccioná un mes', 'error');
        return null;
      }
      data.meses = [single];
    }

    return data;
  },

  findConflict(existingGoals, newData) {
    for (const existing of existingGoals) {
      const monthsOverlap = existing.meses && existing.meses.some(m => newData.meses.includes(m));
      if (!monthsOverlap) continue;

      if (newData.tipo === 'ahorro_mensual' && existing.tipo === 'ahorro_mensual') {
        const sorted = [...existing.meses].sort();
        const rangeText = sorted.length === 1
          ? formatMonth(sorted[0])
          : `${formatMonth(sorted[0])} - ${formatMonth(sorted[sorted.length - 1])}`;
        return {
          goal: existing,
          msg: `Ya tenés una meta de ahorro para ${rangeText}. ¿Querés reemplazarla con esta nueva meta?`
        };
      }

      if (newData.tipo === 'gasto_categoria' && existing.tipo === 'gasto_categoria' && existing.categoryId === newData.categoryId) {
        const catName = (existing.categoryName || 'Categoría').replace(/^\s*[└─]\s*/, '');
        const sorted = [...existing.meses].sort();
        const rangeText = sorted.length === 1
          ? formatMonth(sorted[0])
          : `${formatMonth(sorted[0])} - ${formatMonth(sorted[sorted.length - 1])}`;
        return {
          goal: existing,
          msg: `Ya tenés un límite de gasto para "${catName}" en ${rangeText}. ¿Querés reemplazarlo con este nuevo límite?`
        };
      }

      if (newData.tipo === 'gasto_general' && existing.tipo === 'gasto_general') {
        const sorted = [...existing.meses].sort();
        const rangeText = sorted.length === 1
          ? formatMonth(sorted[0])
          : `${formatMonth(sorted[0])} - ${formatMonth(sorted[sorted.length - 1])}`;
        return {
          goal: existing,
          msg: `Ya tenés un límite de gasto general para ${rangeText}. ¿Querés reemplazarlo con este nuevo límite?`
        };
      }
    }
    return null;
  },

  generateMonthRange(from, to) {
    const months = [];
    let [y, m] = from.split('-').map(Number);
    const [endY, endM] = to.split('-').map(Number);
    while (y < endY || (y === endY && m <= endM)) {
      months.push(`${y}-${String(m).padStart(2, '0')}`);
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return months;
  }
};
