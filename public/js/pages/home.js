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

    if (summary.porCategoria.length > 0) {
      const catSection = create('div', { className: 'summary-section' });
      catSection.appendChild(create('h3', { textContent: 'Por categoría', style: { marginBottom: '16px' } }));

      const maxNeto = Math.max(...summary.porCategoria.map(c => c.neto || 0), 1);

      const renderCatBar = (cat, depth) => {
        const neto = cat.neto || 0;
        if (neto <= 0 && (!cat.children || cat.children.length === 0)) return;

        const bar = create('div', { className: 'category-bar' });
        if (depth > 0) bar.classList.add('category-bar-child');
        bar.style.paddingLeft = `${depth * 16}px`;

        const pct = Math.max((neto / maxNeto) * 100, 0);
        bar.innerHTML = `
          <div class="category-bar-header">
            <span class="category-bar-name">
              <span class="category-dot" style="background:${cat.color || '#6c6c7c'}; display:inline-block;"></span>
              ${cat.nombre}
            </span>
            <span class="category-bar-amount">${formatearEuro(neto)}</span>
          </div>
          <div class="category-bar-track">
            <div class="category-bar-fill" style="width:${pct}%; background:${cat.color || '#6c6c7c'};"></div>
          </div>
        `;
        catSection.appendChild(bar);

        (cat.children || []).forEach(child => renderCatBar(child, depth + 1));
      };

      summary.porCategoria.forEach(cat => renderCatBar(cat, 0));
      content.appendChild(catSection);
    }

    if (transactions.length > 0) {
      const txSection = create('div');
      txSection.appendChild(create('h3', {
        textContent: 'Transacciones',
        style: { marginBottom: '12px', fontSize: 'var(--font-md)' }
      }));

      const grouped = groupTransactionsByDate(transactions);
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
  }
};
