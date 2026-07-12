const HomePage = {
  currentMonth: null,

  async render(params) {
    const content = $('#page-content');
    const navbar = $('#navbar');
    navbar.style.display = '';
    content.style.paddingBottom = '';

    this.currentMonth = params?.month || getCurrentMonth();

    content.innerHTML = '<div class="loading">Cargando...</div>';

    try {
      const [summary, transactions, categories, recurring] = await Promise.all([
        API.summary.get(this.currentMonth),
        API.transactions.list(this.currentMonth),
        API.categories.list(),
        API.transactions.recurringTotal(this.currentMonth).catch(() => ({ total: 0, items: [] }))
      ]);

      this.renderContent(content, summary, transactions, categories, recurring);
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><p>Error: ${err.message}</p></div>`;
    }
  },

  renderContent(content, summary, transactions, categories, recurring) {
    const catMap = {};
    categories.forEach(c => catMap[c.id] = c);

    content.innerHTML = '';

    const header = create('div', { className: 'home-header' });
    const monthNav = createMonthSelector(this.currentMonth, (newMonth) => {
      this.currentMonth = newMonth;
      Router.navigate(`/home?month=${newMonth}`);
    });
    header.appendChild(monthNav);

    const incomeHidden = localStorage.getItem('pate_hide_income') === 'true';

    const statsRow = create('div', { className: 'stats-row' });

    const savingsColor = summary.ahorro >= 0 ? 'var(--success)' : 'var(--danger)';
    const savingsSign = summary.ahorro >= 0 ? '+' : '';

    statsRow.appendChild(this.createStat('Gastos', formatearEuro(summary.gastosNetos), 'var(--expense-color)'));

    const incomeCard = this.createStat('Ingresos', formatearEuro(summary.ingresos), 'var(--income-color)');
    const savingsCard = this.createStat('Ahorro', `${savingsSign}${formatearEuro(summary.ahorro)}`, savingsColor);
    if (incomeHidden) {
      incomeCard.querySelector('.stat-value').classList.add('income-blurred');
      savingsCard.querySelector('.stat-value').classList.add('income-blurred');
    }
    statsRow.appendChild(incomeCard);

    statsRow.appendChild(savingsCard);

    header.appendChild(statsRow);

    const eyeRow = create('div', { className: 'eye-toggle-row' });
    const eyeBtn = create('button', {
      className: 'eye-toggle-btn',
      innerHTML: incomeHidden
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
      title: incomeHidden ? 'Mostrar ingresos' : 'Ocultar ingresos'
    });
    on(eyeBtn, 'click', () => {
      const nowHidden = localStorage.getItem('pate_hide_income') !== 'true';
      localStorage.setItem('pate_hide_income', nowHidden);
      this.render({ month: this.currentMonth });
    });
    eyeRow.appendChild(eyeBtn);
    header.appendChild(eyeRow);

    content.appendChild(header);

    if (recurring && recurring.total > 0) {
      const fixedSection = create('div', { className: 'summary-section' });
      fixedSection.appendChild(create('h3', { textContent: 'Gastos fijos', style: { marginBottom: '12px' } }));
      fixedSection.appendChild(create('div', {
        className: 'fixed-expenses-total',
        style: { fontSize: 'var(--font-xl)', fontWeight: '700', color: 'var(--expense-color)', marginBottom: '12px' },
        textContent: formatearEuro(recurring.total)
      }));

      recurring.items.forEach(item => {
        const cat = catMap[item.categoryId];
        const row = create('div', { className: 'fixed-expense-row' });
        row.innerHTML = `
          <span class="category-badge">
            <span class="category-dot" style="background:${cat?.color || '#6c6c7c'}"></span>
            ${item.titulo}
          </span>
          <span style="font-weight:600;">${formatearEuro(item.monto)}</span>
        `;
        fixedSection.appendChild(row);
      });

      content.appendChild(fixedSection);
    }

    if (transactions.length > 0 || this.hasActiveFilters()) {
      const txSection = create('div');

      const txHeader = create('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' } });
      txHeader.appendChild(create('h3', {
        textContent: 'Transacciones',
        style: { fontSize: 'var(--font-md)', margin: 0 }
      }));
      const filterBtn = create('button', {
        className: 'btn btn-sm btn-ghost',
        textContent: this.hasActiveFilters() ? 'Filtrando' : 'Filtrar'
      });
      if (this.hasActiveFilters()) filterBtn.style.color = 'var(--accent)';
      on(filterBtn, 'click', () => this.showFilterModal(categories, transactions));
      txHeader.appendChild(filterBtn);
      txSection.appendChild(txHeader);

      const filtered = this.applyFilters(transactions);

      if (filtered.length === 0) {
        txSection.appendChild(create('div', {
          className: 'empty-state',
          innerHTML: '<p class="empty-state-text">No hay transacciones con estos filtros</p>'
        }));
      } else {
        const grouped = groupTransactionsByDate(filtered);
        grouped.forEach(group => {
          const dayHeader = create('div', { className: 'day-header', textContent: formatFechaLarga(group.fecha) });
          txSection.appendChild(dayHeader);

          group.items.forEach(tx => {
            const cat = catMap[tx.categoryId];
            const item = create('div', { className: 'transaction-item' });

            const colors = { expense: 'var(--expense-color)', income: 'var(--income-color)', refund: 'var(--refund-color)' };
            const icons = { expense: '💸', income: '💰', refund: '↩️' };

            const iconBg = colors[tx.tipo] || 'var(--text-muted)';
            const icon = create('div', {
              className: 'transaction-icon',
              style: { background: `${iconBg}22`, color: iconBg },
              textContent: icons[tx.tipo]
            });

            const info = create('div', { className: 'transaction-info' });
            info.appendChild(create('div', { className: 'transaction-title', textContent: tx.titulo }));

            const catName = tx.tipo === 'income' ? 'Ingreso' : (tx.tipo === 'refund' ? 'Reembolso' : (cat ? cat.nombre : 'Sin categoría'));
            info.appendChild(create('div', { className: 'transaction-category', textContent: catName }));

            const sign = tx.tipo === 'expense' ? '-' : '+';
            const amountClass = tx.tipo;
            const amount = create('div', {
              className: `transaction-amount ${amountClass}`,
              textContent: `${sign}${formatearEuro(tx.monto)}`
            });

            item.appendChild(icon);
            item.appendChild(info);
            item.appendChild(amount);

            item.style.cursor = 'pointer';
            on(item, 'click', () => this.showTransactionOptions(tx, catMap));

            txSection.appendChild(item);
          });
        });
      }

      content.appendChild(txSection);
    } else {
      content.appendChild(create('div', {
        className: 'empty-state',
        innerHTML: '<div class="empty-state-icon">📊</div><p class="empty-state-text">No hay transacciones este mes</p>'
      }));
    }

    const fab = create('button', {
      className: 'fab',
      textContent: '+',
      title: 'Agregar transacción'
    });
    on(fab, 'click', () => TransactionForm.show(() => this.render({ month: this.currentMonth })));
    content.appendChild(fab);
  },

  createStat(label, value, color) {
    const card = create('div', { className: 'stat-card' });
    card.appendChild(create('div', { className: 'stat-label', textContent: label }));
    const val = create('div', { className: 'stat-value', textContent: value });
    val.style.color = color;
    card.appendChild(val);
    return card;
  },

  showTransactionOptions(tx, catMap) {
    const footer = create('div', { style: { display: 'flex', gap: '8px' } });
    footer.appendChild(create('button', {
      className: 'btn btn-ghost',
      textContent: 'Cancelar',
      onClick: () => Modal.hide()
    }));
    footer.appendChild(create('button', {
      className: 'btn btn-primary',
      textContent: 'Editar',
      onClick: () => {
        Modal.hide();
        TransactionForm.show(() => this.render({ month: this.currentMonth }), tx);
      }
    }));
    footer.appendChild(create('button', {
      className: 'btn btn-danger',
      textContent: 'Eliminar'
    }));

    on(footer.lastChild, 'click', async () => {
      try {
        await API.transactions.delete(tx.id);
        Modal.hide();
        showToast('Transacción eliminada');
        this.render({ month: this.currentMonth });
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    const catName = tx.tipo === 'income' ? 'Ingreso' : (tx.tipo === 'refund' ? 'Reembolso' : (catMap[tx.categoryId]?.nombre || ''));
    const clasifLabel = tx.clasificacion === 'fijo' ? 'Fijo' : 'Variable';
    const clasifBadge = tx.tipo === 'expense' ? ` <span style="font-size:var(--font-xs);padding:2px 6px;border-radius:10px;background:var(--bg-hover);color:var(--text-muted);">${clasifLabel}</span>` : '';
    Modal.show('Transacción', `
      <p><strong>${tx.titulo}</strong></p>
      <p style="color:var(--text-secondary); margin: 8px 0;">${catName}${clasifBadge} - ${formatFechaCorta(tx.fecha)}</p>
      <p style="font-size:var(--font-xl); font-weight:700; color: var(--${tx.tipo === 'expense' ? 'expense' : tx.tipo === 'income' ? 'income' : 'refund'}-color);">
        ${tx.tipo === 'expense' ? '-' : '+'}${formatearEuro(tx.monto)}
      </p>
    `, { footer });
  },

  filters: {
    tipo: '',
    categoryId: '',
    clasificacion: '',
    texto: '',
    montoMin: '',
    montoMax: '',
    fechaDesde: '',
    fechaHasta: ''
  },

  hasActiveFilters() {
    return Object.values(this.filters).some(v => v !== '');
  },

  applyFilters(transactions) {
    return transactions.filter(tx => {
      if (this.filters.tipo && tx.tipo !== this.filters.tipo) return false;
      if (this.filters.categoryId && tx.categoryId !== this.filters.categoryId) return false;
      if (this.filters.clasificacion && tx.clasificacion !== this.filters.clasificacion) return false;
      if (this.filters.texto) {
        const q = this.filters.texto.toLowerCase();
        if (!tx.titulo.toLowerCase().includes(q)) return false;
      }
      if (this.filters.montoMin && tx.monto < parseFloat(this.filters.montoMin)) return false;
      if (this.filters.montoMax && tx.monto > parseFloat(this.filters.montoMax)) return false;
      if (this.filters.fechaDesde && tx.fecha < this.filters.fechaDesde) return false;
      if (this.filters.fechaHasta && tx.fecha > this.filters.fechaHasta) return false;
      return true;
    });
  },

  showFilterModal(categories, transactions) {
    const form = create('div');

    const tipoGroup = create('div', { className: 'form-group' });
    tipoGroup.appendChild(create('label', { textContent: 'Tipo' }));
    const tipoSelect = create('select', { className: 'form-control' });
    tipoSelect.appendChild(create('option', { value: '', textContent: 'Todos' }));
    tipoSelect.appendChild(create('option', { value: 'expense', textContent: 'Gasto' }));
    tipoSelect.appendChild(create('option', { value: 'income', textContent: 'Ingreso' }));
    tipoSelect.appendChild(create('option', { value: 'refund', textContent: 'Reembolso' }));
    tipoSelect.value = this.filters.tipo;
    tipoGroup.appendChild(tipoSelect);
    form.appendChild(tipoGroup);

    const catGroup = create('div', { className: 'form-group' });
    catGroup.appendChild(create('label', { textContent: 'Categoría' }));
    const catSelect = create('select', { className: 'form-control' });
    catSelect.appendChild(create('option', { value: '', textContent: 'Todas' }));
    const parents = categories.filter(c => !c.parentId);
    const childrenMap = {};
    categories.forEach(c => {
      if (c.parentId) {
        if (!childrenMap[c.parentId]) childrenMap[c.parentId] = [];
        childrenMap[c.parentId].push(c);
      }
    });
    parents.forEach(cat => {
      catSelect.appendChild(create('option', { value: cat.id, textContent: cat.nombre }));
      (childrenMap[cat.id] || []).forEach(child => {
        catSelect.appendChild(create('option', { value: child.id, textContent: `  └ ${child.nombre}` }));
      });
    });
    catSelect.value = this.filters.categoryId;
    catGroup.appendChild(catSelect);
    form.appendChild(catGroup);

    const clasifGroup = create('div', { className: 'form-group' });
    clasifGroup.appendChild(create('label', { textContent: 'Clasificación' }));
    const clasifSelect = create('select', { className: 'form-control' });
    clasifSelect.appendChild(create('option', { value: '', textContent: 'Todas' }));
    clasifSelect.appendChild(create('option', { value: 'fijo', textContent: 'Fijo' }));
    clasifSelect.appendChild(create('option', { value: 'variable', textContent: 'Variable' }));
    clasifSelect.value = this.filters.clasificacion;
    clasifGroup.appendChild(clasifSelect);
    form.appendChild(clasifGroup);

    const textGroup = create('div', { className: 'form-group' });
    textGroup.appendChild(create('label', { textContent: 'Buscar por título' }));
    const textInput = create('input', {
      className: 'form-control',
      type: 'text',
      placeholder: 'Texto a buscar...',
      value: this.filters.texto
    });
    textGroup.appendChild(textInput);
    form.appendChild(textGroup);

    const montoRow = create('div', { style: { display: 'flex', gap: '8px' } });
    const minGroup = create('div', { className: 'form-group', style: { flex: 1 } });
    minGroup.appendChild(create('label', { textContent: 'Monto mínimo' }));
    const minInput = create('input', {
      className: 'form-control',
      type: 'number',
      step: '0.01',
      min: '0',
      placeholder: '0',
      value: this.filters.montoMin
    });
    minGroup.appendChild(minInput);
    montoRow.appendChild(minGroup);
    const maxGroup = create('div', { className: 'form-group', style: { flex: 1 } });
    maxGroup.appendChild(create('label', { textContent: 'Monto máximo' }));
    const maxInput = create('input', {
      className: 'form-control',
      type: 'number',
      step: '0.01',
      min: '0',
      placeholder: 'Sin límite',
      value: this.filters.montoMax
    });
    maxGroup.appendChild(maxInput);
    montoRow.appendChild(maxGroup);
    form.appendChild(montoRow);

    const fechaRow = create('div', { style: { display: 'flex', gap: '8px' } });
    const fdGroup = create('div', { className: 'form-group', style: { flex: 1 } });
    fdGroup.appendChild(create('label', { textContent: 'Desde' }));
    const fdInput = create('input', {
      className: 'form-control',
      type: 'date',
      value: this.filters.fechaDesde
    });
    fdGroup.appendChild(fdInput);
    fechaRow.appendChild(fdGroup);
    const fhGroup = create('div', { className: 'form-group', style: { flex: 1 } });
    fhGroup.appendChild(create('label', { textContent: 'Hasta' }));
    const fhInput = create('input', {
      className: 'form-control',
      type: 'date',
      value: this.filters.fechaHasta
    });
    fhGroup.appendChild(fhInput);
    fechaRow.appendChild(fhGroup);
    form.appendChild(fechaRow);

    const footer = create('div', { style: { display: 'flex', gap: '8px' } });
    footer.appendChild(create('button', {
      className: 'btn btn-ghost',
      textContent: 'Limpiar',
      onClick: () => {
        this.filters = { tipo: '', categoryId: '', clasificacion: '', texto: '', montoMin: '', montoMax: '', fechaDesde: '', fechaHasta: '' };
        Modal.hide();
        this.render({ month: this.currentMonth });
      }
    }));
    footer.appendChild(create('button', {
      className: 'btn btn-primary',
      textContent: 'Aplicar',
      onClick: () => {
        this.filters.tipo = tipoSelect.value;
        this.filters.categoryId = catSelect.value;
        this.filters.clasificacion = clasifSelect.value;
        this.filters.texto = textInput.value.trim();
        this.filters.montoMin = minInput.value;
        this.filters.montoMax = maxInput.value;
        this.filters.fechaDesde = fdInput.value;
        this.filters.fechaHasta = fhInput.value;
        Modal.hide();
        this.render({ month: this.currentMonth });
      }
    }));

    Modal.show('Filtrar transacciones', form, { footer });
  }
};
