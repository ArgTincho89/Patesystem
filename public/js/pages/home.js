const HomePage = {
  currentMonth: null,
  activeAnalyticsTab: 'resumen',
  chartResizeObserver: null,
  favorite: null,
  desktopStatsRow: null,
  desktopAnalyticsRoot: null,

  async render(params) {
    const content = $('#page-content');
    const navbar = $('#navbar');
    const desktop = App.isDesktop();
    navbar.style.display = '';
    content.style.paddingBottom = '';

    this.currentMonth = params?.month || getCurrentMonth();

    if (params?.month) {
      content.classList.remove('visible');
      await new Promise(r => setTimeout(r, 120));
    }

    content.classList.add('page-content-fade');
    content.innerHTML = '<div class="loading">Cargando...</div>';

    try {
      const [summary, transactions, categories, goals, burnRate] = await Promise.all([
        API.summary.get(this.currentMonth),
        API.transactions.list(this.currentMonth),
        API.categories.list(),
        desktop ? API.goals.list(this.currentMonth).catch(() => []) : Promise.resolve([]),
        desktop ? API.summary.burnRate(this.currentMonth, 1).catch(() => null) : Promise.resolve(null)
      ]);

      this.renderContent(content, summary, transactions, categories, { desktop, goals, burnRate });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          content.classList.add('visible');
        });
      });
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><p>Error: ${err.message}</p></div>`;
      content.classList.add('visible');
    }
  },

  renderContent(content, summary, transactions, categories, options = {}) {
    if (options.desktop) {
      this.renderDesktopContent(content, summary, transactions, categories, options);
      return;
    }

    const catMap = {};
    categories.forEach(c => catMap[c.id] = c);

    content.innerHTML = '';

    let transactionPane = content;
    if (options.desktop) {
      const workspace = create('div', { className: 'desktop-home-workspace' });
      const transactionsPanel = create('section', { className: 'desktop-home-transactions', 'aria-label': 'Inicio' });
      const analyticsPanel = create('section', { className: 'desktop-home-analytics', 'aria-label': 'Analítica' });
      const analyticsScroll = create('div', { className: 'desktop-home-analytics-scroll' });

      transactionsPanel.appendChild(create('h1', { className: 'page-title desktop-home-title', textContent: 'Inicio' }));
      analyticsPanel.appendChild(create('h2', { className: 'page-title desktop-analytics-title', textContent: 'Analítica' }));
      analyticsPanel.appendChild(analyticsScroll);
      workspace.appendChild(transactionsPanel);
      workspace.appendChild(analyticsPanel);
      content.appendChild(workspace);
      transactionPane = transactionsPanel;

      SummaryPage.renderContent(analyticsScroll, summary, options.goals || [], options.burnRate, {
        hideMonthNav: true,
        categoryDisclosure: true
      });
    }

    const monthNav = createMonthSelector(this.currentMonth, (newMonth) => {
      this.currentMonth = newMonth;
      Router.navigate(`/home?month=${newMonth}`);
    }, { allowFuture: true });
    transactionPane.appendChild(monthNav);

    const incomeHidden = localStorage.getItem('pate_hide_income') === 'true';

    const statsRow = create('div', { className: 'stats-row' });

    const savingsColor = summary.ahorro >= 0 ? 'var(--success)' : 'var(--danger)';
    const savingsSign = summary.ahorro >= 0 ? '+' : '';

    const incomeCard = this.createStat('Ingresos', formatearEuro(summary.ingresos), 'var(--income-color)');
    statsRow.appendChild(incomeCard);
    statsRow.appendChild(this.createStat('Gastos', formatearEuro(summary.gastosNetos), 'var(--expense-color)'));
    const savingsCard = this.createStat('Ahorro', `${savingsSign}${formatearEuro(summary.ahorro)}`, savingsColor);
    statsRow.appendChild(savingsCard);

    const incomeVal = incomeCard.querySelector('.stat-value');
    const savingsVal = savingsCard.querySelector('.stat-value');
    if (incomeHidden) {
      incomeVal.classList.add('income-blurred');
      savingsVal.classList.add('income-blurred');
    }

    if (!options.desktop) transactionPane.appendChild(statsRow);

    if (transactions.length > 0 || this.hasActiveFilters()) {
      const txSection = create('div');

      const txHeader = create('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' } });
      txHeader.appendChild(create('h3', {
        textContent: 'Transacciones',
        style: { fontSize: 'var(--font-md)', margin: 0 }
      }));

      const txActions = create('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } });

      const SVG_EYE_OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
      const SVG_EYE_CLOSED = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

      const eyeBtn = create('button', {
        className: 'eye-toggle-btn',
        innerHTML: incomeHidden ? SVG_EYE_CLOSED : SVG_EYE_OPEN,
        title: incomeHidden ? 'Mostrar ingresos' : 'Ocultar ingresos'
      });
      on(eyeBtn, 'click', () => {
        const nowHidden = localStorage.getItem('pate_hide_income') !== 'true';
        localStorage.setItem('pate_hide_income', nowHidden);
        incomeVal.classList.toggle('income-blurred', nowHidden);
        savingsVal.classList.toggle('income-blurred', nowHidden);
        eyeBtn.innerHTML = nowHidden ? SVG_EYE_CLOSED : SVG_EYE_OPEN;
        eyeBtn.title = nowHidden ? 'Mostrar ingresos' : 'Ocultar ingresos';
      });
      txActions.appendChild(eyeBtn);

      const filterBtn = create('button', {
        className: 'btn btn-sm btn-ghost btn-filter',
        textContent: this.hasActiveFilters() ? 'Filtrando' : 'Filtrar'
      });
      if (this.hasActiveFilters()) filterBtn.style.color = 'var(--accent)';
      on(filterBtn, 'click', () => this.showFilterModal(categories, transactions));
      txActions.appendChild(filterBtn);
      txHeader.appendChild(txActions);
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

             const catName = tx.tipo === 'income' ? `Ingreso${tx.clasificacion ? ` (${tx.clasificacion})` : ''}` : (tx.tipo === 'refund' ? 'Reembolso' : (cat ? cat.nombre : 'Sin categoría'));
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

      transactionPane.appendChild(txSection);
    } else {
      transactionPane.appendChild(create('div', {
        className: 'empty-state',
        innerHTML: '<div class="empty-state-icon">📊</div><p class="empty-state-text">No hay transacciones este mes</p>'
      }));
    }

    const fab = create('button', {
      className: 'fab',
      textContent: '+',
      title: 'Agregar transacción'
    });
    on(fab, 'click', () => TransactionForm.show(
      () => this.render({ month: this.currentMonth })
    ));
    content.appendChild(fab);
  },

  renderDesktopContent(content, summary, transactions, categories, options) {
    this.chartResizeObserver?.disconnect();
    this.favorite = this.readDesktopFavorite();
    content.innerHTML = '';
    content.appendChild(create('h1', { className: 'visually-hidden', textContent: 'Inicio' }));

    let hidden = localStorage.getItem('pate_hide_income') === 'true';
    const values = {
      ingresos: formatearEuro(summary.ingresos),
      gastos: formatearEuro(summary.gastosNetos),
      ahorro: `${summary.ahorro > 0 ? '+' : ''}${formatearEuro(summary.ahorro)}`
    };

    const statsRow = create('div', { className: 'stats-row desktop-home-stats', 'aria-label': 'Resumen del mes' });
    this.desktopStatsRow = statsRow;
    const descriptors = [
      { id: 'ingresos', label: 'Ingresos', color: 'var(--income-color)' },
      { id: 'gastos', label: 'Gastos', color: 'var(--expense-color)' },
      { id: 'ahorro', label: 'Ahorro', color: summary.ahorro > 0 ? 'var(--success)' : summary.ahorro < 0 ? 'var(--danger)' : 'var(--text-primary)' }
    ];

    this.renderDesktopStats(statsRow, descriptors, values, hidden);
    content.appendChild(statsRow);

    const controls = create('div', { className: 'desktop-home-controls', 'aria-label': 'Controles de inicio' });
    const controlActions = create('div', { className: 'desktop-control-actions' });
    const newTransaction = create('button', {
      className: 'btn btn-primary desktop-new-transaction',
      type: 'button',
      innerHTML: '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg><span>Nueva transacción</span>'
    });
    on(newTransaction, 'click', () => TransactionForm.show(() => this.render({ month: this.currentMonth })));
    controlActions.appendChild(newTransaction);

    const eyeOpen = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    const eyeClosed = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    const eyeButton = create('button', {
      className: 'eye-toggle-btn desktop-eye-toggle',
      type: 'button',
      innerHTML: hidden ? eyeClosed : eyeOpen,
      title: hidden ? 'Mostrar métricas principales' : 'Ocultar métricas principales',
      'aria-label': hidden ? 'Métricas principales ocultas' : 'Métricas principales visibles',
      'aria-pressed': String(hidden)
    });
    on(eyeButton, 'click', () => {
      const shouldHide = localStorage.getItem('pate_hide_income') !== 'true';
      localStorage.setItem('pate_hide_income', String(shouldHide));
      hidden = shouldHide;
      eyeButton.innerHTML = shouldHide ? eyeClosed : eyeOpen;
      eyeButton.title = shouldHide ? 'Mostrar métricas principales' : 'Ocultar métricas principales';
      eyeButton.setAttribute('aria-label', shouldHide ? 'Métricas principales ocultas' : 'Métricas principales visibles');
      eyeButton.setAttribute('aria-pressed', String(shouldHide));
      this.renderDesktopStats(statsRow, descriptors, values, shouldHide);
      this.renderFavoriteSlot();
    });
    controlActions.appendChild(eyeButton);

    const filterButton = create('button', {
      className: `btn btn-sm btn-ghost btn-filter desktop-filter-btn${this.hasActiveFilters() ? ' active' : ''}`,
      type: 'button',
      textContent: 'Filtro',
      'aria-pressed': String(this.hasActiveFilters())
    });
    on(filterButton, 'click', () => this.showFilterModal(categories, transactions));
    controlActions.appendChild(filterButton);

    const monthSelector = createMonthSelector(this.currentMonth, (newMonth) => {
      this.currentMonth = newMonth;
      Router.navigate(`/home?month=${newMonth}`);
    }, { allowFuture: true });
    monthSelector.classList.add('desktop-month-selector');
    monthSelector.setAttribute('aria-label', 'Seleccionar mes');
    monthSelector.querySelectorAll('button')[0].setAttribute('aria-label', 'Mes anterior');
    monthSelector.querySelectorAll('button')[1].setAttribute('aria-label', 'Mes siguiente');
    controls.appendChild(controlActions);
    controls.appendChild(monthSelector);
    content.appendChild(controls);

    const workspace = create('div', { className: 'desktop-home-workspace' });
    const transactionsPanel = create('section', { className: 'desktop-home-transactions', 'aria-label': 'Transacciones' });
    const transactionHeading = create('h2', { className: 'page-title desktop-home-title', textContent: 'Transacciones' });
    transactionsPanel.appendChild(transactionHeading);
    const transactionList = create('div', { className: 'desktop-home-transaction-scroll' });
    this.renderDesktopTransactions(transactionList, transactions, categories);
    transactionsPanel.appendChild(transactionList);

    const analyticsPanel = create('section', { className: 'desktop-home-analytics', 'aria-label': 'Analítica' });
    analyticsPanel.appendChild(create('h2', { className: 'page-title desktop-analytics-title', textContent: 'Analítica' }));
    const tabList = create('div', { className: 'desktop-analytics-tabs', role: 'tablist', 'aria-label': 'Secciones de analítica' });
    const analyticsContent = create('div', { className: 'desktop-home-analytics-scroll' });
    this.desktopAnalyticsRoot = analyticsContent;
    const tabDefinitions = [
      { id: 'resumen', label: 'Resumen' },
      { id: 'categorias', label: 'Categorías' },
      { id: 'evolucion', label: 'Evolución' },
      { id: 'metas', label: 'Metas' }
    ];
    const tabPanels = {};
    const tabButtons = {};
    tabDefinitions.forEach(tab => {
      const button = create('button', {
        className: 'desktop-analytics-tab',
        type: 'button',
        id: `home-analytics-tab-${tab.id}`,
        role: 'tab',
        textContent: tab.label,
        'aria-controls': `home-analytics-panel-${tab.id}`,
        'aria-selected': String(this.activeAnalyticsTab === tab.id),
        tabindex: this.activeAnalyticsTab === tab.id ? '0' : '-1'
      });
      const panel = create('div', {
        className: 'desktop-analytics-tab-panel',
        id: `home-analytics-panel-${tab.id}`,
        role: 'tabpanel',
        'aria-labelledby': button.id,
        tabindex: '0'
      });
      panel.hidden = this.activeAnalyticsTab !== tab.id;
      on(button, 'click', () => this.activateAnalyticsTab(tab.id, tabButtons, tabPanels, summary));
      on(button, 'keydown', event => this.handleAnalyticsTabKeydown(event, tabDefinitions, tabButtons));
      tabButtons[tab.id] = button;
      tabPanels[tab.id] = panel;
      tabList.appendChild(button);
      analyticsContent.appendChild(panel);
    });

    const summaryContent = create('div');
    SummaryPage.renderContent(summaryContent, summary, options.goals || [], options.burnRate, {
      hideMonthNav: true,
      suppressStats: true,
      desktopTabs: true
    });
    if (summary.porCategoria.length || summary.ingresos > 0 || summary.gastosNetos > 0 || summary.reembolsos > 0) {
      const monthOverview = EstadisticasPage.renderMonthOverviewInto(summaryContent, summary);
      monthOverview.dataset.analyticsGroup = 'resumen';
    }
    const hasSummaryContent = summaryContent.childNodes.length > 0;
    Array.from(summaryContent.childNodes).forEach(node => {
      const group = node.dataset?.analyticsGroup || 'resumen';
      (tabPanels[group] || tabPanels.resumen).appendChild(node);
    });
    this.refreshFavoriteSources(analyticsContent);
    this.renderFavoriteSlot();
    requestAnimationFrame(() => this.renderFavoriteSlot());

    const trendsPeriod = create('div', { className: 'desktop-trends-period', role: 'group', 'aria-label': 'Período de evolución' });
    const trendsContent = create('div', { className: 'desktop-trends-content' });
    tabPanels.evolucion.appendChild(trendsPeriod);
    tabPanels.evolucion.appendChild(trendsContent);
    this.buildDesktopTrendsPeriod(trendsPeriod, trendsContent);

    if (!options.goals?.length) {
      tabPanels.metas.appendChild(create('p', { className: 'desktop-analytics-empty', textContent: 'No hay metas configuradas para este período.' }));
    }
    if (!hasSummaryContent) {
      tabPanels.resumen.appendChild(create('p', { className: 'desktop-analytics-empty', textContent: 'No hay datos de resumen para este período.' }));
    }

    analyticsPanel.appendChild(tabList);
    analyticsPanel.appendChild(analyticsContent);
    workspace.appendChild(transactionsPanel);
    workspace.appendChild(analyticsPanel);
    content.appendChild(workspace);
    this.chartResizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        Charts.redraw(tabPanels[this.activeAnalyticsTab]);
        Charts.redraw(statsRow);
      });
    });
    this.chartResizeObserver.observe(analyticsPanel);
    requestAnimationFrame(() => Charts.redraw(tabPanels[this.activeAnalyticsTab]));
  },

  renderDesktopStats(container, descriptors, values, hidden) {
    container.replaceChildren();
    const metricIcons = {
      ingresos: '<path d="M12 19V5M5 12l7-7 7 7"/>',
      gastos: '<path d="M12 5v14m-7-7 7 7 7-7"/>',
      ahorro: '<circle cx="12" cy="12" r="9"/><path d="M15 9.5c0-1.1-1.3-2-3-2s-3 .9-3 2 1.3 2 3 2 3 .9 3 2-1.3 2-3 2-3-.9-3-2M12 6v12"/>'
    };
    descriptors.forEach(({ id, label, color }) => {
      const card = create('article', { className: `stat-card desktop-stat-card desktop-stat-${id}` });
      const labelRow = create('div', { className: 'desktop-stat-label-row' });
      const heading = create('span', { className: 'desktop-stat-heading' });
      heading.appendChild(create('span', {
        className: 'desktop-stat-icon',
        dataset: { metricIcon: id },
        'aria-hidden': 'true',
        style: { color },
        innerHTML: `<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${metricIcons[id]}</svg>`
      }));
      heading.appendChild(create('div', { className: 'stat-label', textContent: label }));
      labelRow.appendChild(heading);
      card.appendChild(labelRow);
      const value = create('div', { className: `stat-value${hidden ? ' income-blurred' : ''}`, textContent: hidden ? '••••••' : values[id] });
      value.style.color = color;
      card.appendChild(value);
      container.appendChild(card);
    });
  },

  readDesktopFavorite() {
    const storageKey = 'pate_home_favorite';
    const saved = localStorage.getItem(storageKey);
    if (!saved) return null;
    try {
      const favorite = JSON.parse(saved);
      if (favorite?.type && favorite?.key) return favorite;
    } catch {
      // Legacy metric-only favorites are intentionally discarded.
    }
    localStorage.removeItem(storageKey);
    return null;
  },

  refreshFavoriteSources(root) {
    if (!root) return;
    root.querySelectorAll('[data-favorite-type][data-favorite-key]').forEach(source => {
      source.classList.add('desktop-favorite-source');
      const label = source.dataset.favoriteLabel || source.querySelector('.chart-title, .goal-progress-label, summary, h3')?.textContent?.trim() || 'Analítica';
      source.dataset.favoriteLabel = label;
      let button = source.querySelector(':scope > .analytics-favorite-toggle');
      if (!button) {
        button = create('button', { className: 'analytics-favorite-toggle', type: 'button' });
        on(button, 'click', () => this.toggleDesktopFavorite(source, button));
        source.appendChild(button);
      }
      this.updateFavoriteToggle(source, button);
    });
  },

  updateFavoriteToggle(source, button) {
    const selected = this.favorite?.type === source.dataset.favoriteType
      && this.favorite?.key === source.dataset.favoriteKey;
    const label = source.dataset.favoriteLabel || 'Analítica';
    button.classList.toggle('selected', selected);
    button.textContent = selected ? '★' : '☆';
    button.setAttribute('aria-label', selected ? `Quitar ${label} de favoritos` : `Marcar ${label} como favorito`);
    button.setAttribute('title', selected ? `Quitar ${label} de favoritos` : `Marcar ${label} como favorito`);
    button.setAttribute('aria-pressed', String(selected));
  },

  toggleDesktopFavorite(source, button) {
    const selected = this.favorite?.type === source.dataset.favoriteType
      && this.favorite?.key === source.dataset.favoriteKey;
    this.favorite = selected ? null : {
      type: source.dataset.favoriteType,
      key: source.dataset.favoriteKey,
      label: source.dataset.favoriteLabel
    };
    if (this.favorite) localStorage.setItem('pate_home_favorite', JSON.stringify(this.favorite));
    else localStorage.removeItem('pate_home_favorite');
    this.refreshFavoriteSources(this.desktopAnalyticsRoot);
    this.renderFavoriteSlot();
    button.focus();
  },

  renderFavoriteSlot() {
    if (!this.desktopStatsRow) return;
    this.desktopStatsRow.querySelector('.desktop-favorite-card')?.remove();
    if (!this.favorite) return;

    const source = Array.from(this.desktopAnalyticsRoot?.querySelectorAll('[data-favorite-type][data-favorite-key]') || [])
      .find(node => node.dataset.favoriteType === this.favorite.type && node.dataset.favoriteKey === this.favorite.key);
    const favoriteCard = source ? source.cloneNode(true) : create('article', { className: 'desktop-favorite-card desktop-favorite-replica' });
    favoriteCard.classList.add('desktop-favorite-card', 'desktop-favorite-replica');
    favoriteCard.classList.remove('desktop-favorite-source');
    favoriteCard.setAttribute('aria-label', `Favorito: ${this.favorite.label || 'Analítica'}`);
    favoriteCard.querySelectorAll('.analytics-favorite-toggle, .chart-tooltip').forEach(node => node.remove());
    favoriteCard.prepend(create('div', {
      className: 'desktop-favorite-replica-heading',
      textContent: `Favorito · ${this.favorite.label || 'Analítica'}`
    }));
    this.desktopStatsRow.appendChild(favoriteCard);

    if (source) {
      const sourceCanvases = source.querySelectorAll('canvas');
      const replicaCanvases = favoriteCard.querySelectorAll('canvas');
      sourceCanvases.forEach((canvas, index) => Charts.copyCanvas(canvas, replicaCanvases[index]));
      if (sourceCanvases.length && Array.from(sourceCanvases).some(canvas => !canvas.__chartRender)) {
        requestAnimationFrame(() => {
          if (this.favorite?.type === source.dataset.favoriteType && this.favorite?.key === source.dataset.favoriteKey) {
            this.renderFavoriteSlot();
          }
        });
      }
    } else {
      favoriteCard.appendChild(create('p', { className: 'desktop-favorite-unavailable', textContent: 'Este análisis no tiene datos en el período actual.' }));
    }
  },

  renderDesktopTransactions(container, transactions, categories) {
    const catMap = Object.fromEntries(categories.map(category => [category.id, category]));
    const filtered = this.applyFilters(transactions);
    if (!filtered.length) {
      container.appendChild(create('div', {
        className: 'empty-state desktop-transactions-empty',
        textContent: this.hasActiveFilters() ? 'No hay transacciones con estos filtros.' : 'No hay transacciones este mes.'
      }));
      return;
    }

    groupTransactionsByDate(filtered).forEach(group => {
      container.appendChild(create('div', { className: 'day-header', textContent: formatFechaLarga(group.fecha) }));
      group.items.forEach(tx => {
        const category = catMap[tx.categoryId];
        const colors = { expense: 'var(--expense-color)', income: 'var(--income-color)', refund: 'var(--refund-color)' };
        const labels = { expense: 'Gasto', income: 'Ingreso', refund: 'Reembolso' };
        const iconMarkup = tx.tipo === 'expense'
          ? '<path d="M12 5v14M19 12l-7 7-7-7"/>'
          : tx.tipo === 'income'
            ? '<path d="M12 19V5M5 12l7-7 7 7"/>'
            : '<path d="M9 14l-4-4 4-4M5 10h9a5 5 0 010 10h-2"/>';
        const item = create('div', {
          className: 'transaction-item desktop-transaction-item',
          role: 'button',
          tabindex: '0',
          'aria-label': `${labels[tx.tipo]}: ${tx.titulo}, ${formatearEuro(tx.monto)}. Abrir acciones`
        });
        const icon = create('span', {
          className: 'transaction-icon desktop-transaction-icon',
          style: { background: `color-mix(in srgb, ${colors[tx.tipo]} 14%, transparent)`, color: colors[tx.tipo] },
          innerHTML: `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconMarkup}</svg>`
        });
        const info = create('span', { className: 'transaction-info' });
        info.appendChild(create('span', { className: 'transaction-title', textContent: tx.titulo }));
        const categoryName = tx.tipo === 'income'
          ? `Ingreso${tx.clasificacion ? ` (${tx.clasificacion})` : ''}`
          : tx.tipo === 'refund' ? 'Reembolso' : (category ? category.nombre : 'Sin categoría');
        info.appendChild(create('span', { className: 'transaction-category', textContent: categoryName }));
        const amount = create('span', {
          className: `transaction-amount ${tx.tipo}`,
          textContent: `${tx.tipo === 'expense' ? '−' : '+'}${formatearEuro(tx.monto)}`
        });
        item.appendChild(icon);
        item.appendChild(info);
        item.appendChild(amount);
        const openOptions = () => this.showTransactionOptions(tx, catMap);
        on(item, 'click', openOptions);
        on(item, 'keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openOptions();
          }
        });
        container.appendChild(item);
      });
    });
  },

  activateAnalyticsTab(tabId, buttons, panels, summary) {
    this.activeAnalyticsTab = tabId;
    Object.entries(buttons).forEach(([id, button]) => {
      const selected = id === tabId;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      panels[id].hidden = !selected;
    });
    if (tabId === 'evolucion') this.loadDesktopTrends(panels.evolucion.querySelector('.desktop-trends-content'));
    requestAnimationFrame(() => Charts.redraw(panels[tabId]));
  },

  handleAnalyticsTabKeydown(event, tabs, buttons) {
    const current = tabs.findIndex(tab => buttons[tab.id] === event.currentTarget);
    let next = current;
    if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    buttons[tabs[next].id].focus();
    buttons[tabs[next].id].click();
  },

  buildDesktopTrendsPeriod(container, target) {
    container.replaceChildren();
    ['3m', '6m', '12m'].forEach(period => {
      const labels = { '3m': '3 meses', '6m': '6 meses', '12m': '12 meses' };
      const button = create('button', {
        className: `period-btn${EstadisticasPage.period === period ? ' active' : ''}`,
        type: 'button',
        textContent: labels[period],
        'aria-pressed': String(EstadisticasPage.period === period)
      });
      on(button, 'click', () => {
        if (EstadisticasPage.period === period) return;
        EstadisticasPage.period = period;
        this.buildDesktopTrendsPeriod(container, target);
        this.loadDesktopTrends(target);
      });
      container.appendChild(button);
    });
    if (this.activeAnalyticsTab === 'evolucion') this.loadDesktopTrends(target);
  },

  async loadDesktopTrends(target) {
    const period = EstadisticasPage.period;
    const count = period === '3m' ? 3 : period === '12m' ? 12 : 6;
    const fromMonth = addMonths(this.currentMonth, -(count - 1));
    const cacheKey = `${this.currentMonth}:${period}`;
    if (this._desktopTrendsCache?.key === cacheKey) {
      EstadisticasPage.renderTrendsInto(target, this._desktopTrendsCache.data);
      this.refreshFavoriteSources(target);
      this.renderFavoriteSlot();
      requestAnimationFrame(() => {
        this.renderFavoriteSlot();
        Charts.redraw(target);
        Charts.redraw(this.desktopStatsRow);
      });
      return;
    }

    target.replaceChildren(create('div', { className: 'loading', textContent: 'Cargando evolución…' }));
    try {
      const trends = await API.trends.get(fromMonth, this.currentMonth, null);
      if (this.activeAnalyticsTab !== 'evolucion' || this.currentMonth !== cacheKey.split(':')[0] || EstadisticasPage.period !== period) return;
      this._desktopTrendsCache = { key: cacheKey, data: trends };
      EstadisticasPage.renderTrendsInto(target, trends);
      this.refreshFavoriteSources(target);
      this.renderFavoriteSlot();
      requestAnimationFrame(() => {
        this.renderFavoriteSlot();
        Charts.redraw(target);
        Charts.redraw(this.desktopStatsRow);
      });
    } catch (error) {
      target.replaceChildren(create('div', { className: 'empty-state', textContent: `No se pudo cargar la evolución: ${error.message}` }));
    }
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
