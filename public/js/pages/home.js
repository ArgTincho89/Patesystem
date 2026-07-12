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
      const [summary, transactions, categories] = await Promise.all([
        API.summary.get(this.currentMonth),
        API.transactions.list(this.currentMonth),
        API.categories.list()
      ]);

      this.renderContent(content, summary, transactions, categories);
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><p>Error: ${err.message}</p></div>`;
    }
  },

  renderContent(content, summary, transactions, categories) {
    const catMap = {};
    categories.forEach(c => catMap[c.id] = c);

    content.innerHTML = '';

    const header = create('div', { className: 'home-header' });
    const monthNav = createMonthSelector(this.currentMonth, (newMonth) => {
      this.currentMonth = newMonth;
      Router.navigate(`/home?month=${newMonth}`);
    });
    header.appendChild(monthNav);

    const statsRow = create('div', { className: 'stats-row' });

    const savingsColor = summary.ahorro >= 0 ? 'var(--success)' : 'var(--danger)';
    const savingsSign = summary.ahorro >= 0 ? '+' : '';

    statsRow.appendChild(this.createStat('Gastos', formatearEuro(summary.gastosNetos), 'var(--expense-color)'));
    statsRow.appendChild(this.createStat('Ingresos', formatearEuro(summary.ingresos), 'var(--income-color)'));
    statsRow.appendChild(this.createStat('Ahorro', `${savingsSign}${formatearEuro(summary.ahorro)}`, savingsColor));

    header.appendChild(statsRow);
    content.appendChild(header);

    if (summary.porCategoria.length > 0) {
      const catSection = create('div', { className: 'summary-section' });
      catSection.appendChild(create('h3', { textContent: 'Por categoría', style: { marginBottom: '16px' } }));

      const maxNeto = Math.max(...summary.porCategoria.map(c => c.neto), 1);

      summary.porCategoria.forEach(cat => {
        const bar = create('div', { className: 'category-bar' });
        const pct = (cat.neto / maxNeto) * 100;
        bar.innerHTML = `
          <div class="category-bar-header">
            <span class="category-bar-name">
              <span class="category-dot" style="background:${cat.color || '#6c6c7c'}; display:inline-block;"></span>
              ${cat.nombre}
            </span>
            <span class="category-bar-amount">${formatearEuro(cat.neto)}</span>
          </div>
          <div class="category-bar-track">
            <div class="category-bar-fill" style="width:${pct}%; background:${cat.color || '#6c6c7c'};"></div>
          </div>
        `;
        catSection.appendChild(bar);
      });
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
    Modal.show('Transacción', `
      <p><strong>${tx.titulo}</strong></p>
      <p style="color:var(--text-secondary); margin: 8px 0;">${catName} - ${formatFechaCorta(tx.fecha)}</p>
      <p style="font-size:var(--font-xl); font-weight:700; color: var(--${tx.tipo === 'expense' ? 'expense' : tx.tipo === 'income' ? 'income' : 'refund'}-color);">
        ${tx.tipo === 'expense' ? '-' : '+'}${formatearEuro(tx.monto)}
      </p>
    `, { footer });
  }
};
