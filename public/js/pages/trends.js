const EstadisticasPage = {
  selectedCategory: null,
  period: '6m',
  currentMonth: null,

  async render(params) {
    const content = $('#page-content');
    const navbar = $('#navbar');
    navbar.style.display = '';
    content.style.paddingBottom = '';

    this.currentMonth = params?.month || getCurrentMonth();
    if (params?.category) this.selectedCategory = params.category;
    if (params?.period) this.period = params.period;

    const savedScroll = params?._keepScroll ? window.scrollY : 0;

    if (!params?._keepScroll) {
      content.innerHTML = '';
      this.buildShell(content);
    }

    await this.refreshData(content, savedScroll);
  },

  buildShell(content) {
    content.innerHTML = '';

    const title = create('h2', {
      textContent: 'Estadísticas',
      style: { fontSize: 'var(--font-xl)', fontWeight: '700', marginBottom: '16px' }
    });
    content.appendChild(title);

    this._monthNavContainer = create('div');
    content.appendChild(this._monthNavContainer);

    this._dataSection = create('div', { className: 'page-content-fade' });
    content.appendChild(this._dataSection);

    const trendDivider = create('div', { className: 'trend-divider', style: { margin: '24px 0 16px', borderTop: '1px solid var(--border)', paddingTop: '16px' } });
    trendDivider.appendChild(create('h3', { textContent: 'Tendencias', style: { fontSize: 'var(--font-lg)', marginBottom: '12px' } }));
    content.appendChild(trendDivider);

    this._periodContainer = create('div');
    content.appendChild(this._periodContainer);

    this._filterContainer = create('div', { className: 'trend-filters' });
    content.appendChild(this._filterContainer);

    this._trendsSection = create('div', { className: 'page-content-fade' });
    content.appendChild(this._trendsSection);

    const monthNav = createMonthSelector(this.currentMonth, async (newMonth) => {
      this.currentMonth = newMonth;
      const monthLabel = this._monthNavContainer.querySelector('.month-nav h2');
      if (monthLabel) monthLabel.textContent = formatMonth(newMonth);
      this._dataSection.classList.remove('visible');
      this._trendsSection.classList.remove('visible');
      await this.refreshData($('#page-content'), window.scrollY);
    }, { allowFuture: true });
    this._monthNavContainer.appendChild(monthNav);

    this.buildPeriodSelector();
  },

  buildPeriodSelector() {
    this._periodContainer.innerHTML = '';
    const periodSelector = create('div', { className: 'period-selector' });
    [
      { value: '3m', label: '3 meses' },
      { value: '6m', label: '6 meses' },
      { value: '12m', label: '12 meses' }
    ].forEach(p => {
      const btn = create('button', {
        className: `period-btn ${this.period === p.value ? 'active' : ''}`,
        textContent: p.label
      });
      on(btn, 'click', async () => {
        if (this.period === p.value) return;
        this.period = p.value;
        this.buildPeriodSelector();
        this._trendsSection.classList.remove('visible');
        const scrollY = window.scrollY;
        await this.refreshData($('#page-content'), scrollY);
      });
      periodSelector.appendChild(btn);
    });
    this._periodContainer.appendChild(periodSelector);
  },

  buildFilterButtons(categories) {
    this._filterContainer.innerHTML = '';
    const allBtn = create('button', {
      className: `trend-filter-btn ${!this.selectedCategory ? 'active' : ''}`,
      textContent: 'Todas'
    });
    on(allBtn, 'click', async () => {
      if (!this.selectedCategory) return;
      this.selectedCategory = null;
      this.buildFilterButtons(categories);
      this._trendsSection.classList.remove('visible');
      const scrollY = window.scrollY;
      await this.refreshData($('#page-content'), scrollY);
    });
    this._filterContainer.appendChild(allBtn);

    categories.forEach(cat => {
      const btn = create('button', {
        className: `trend-filter-btn ${this.selectedCategory === cat.id ? 'active' : ''}`,
        textContent: cat.nombre
      });
      on(btn, 'click', async () => {
        if (this.selectedCategory === cat.id) return;
        this.selectedCategory = cat.id;
        this.buildFilterButtons(categories);
        this._trendsSection.classList.remove('visible');
        const scrollY = window.scrollY;
        await this.refreshData($('#page-content'), scrollY);
      });
      this._filterContainer.appendChild(btn);
    });
  },

  async refreshData(content, savedScroll) {
    try {
      const [summary, trends, categories] = await Promise.all([
        API.summary.get(this.currentMonth),
        this.fetchTrends(),
        API.categories.list()
      ]);

      this.buildFilterButtons(categories);
      this.renderDataSection(summary, trends);

      if (savedScroll) {
        requestAnimationFrame(() => window.scrollTo(0, savedScroll));
      }
    } catch (err) {
      this._dataSection.innerHTML = `<div class="empty-state"><p>Error: ${err.message}</p></div>`;
    }
  },

  async fetchTrends() {
    let fromMonth;
    switch (this.period) {
      case '3m': fromMonth = addMonths(getCurrentMonth(), -2); break;
      case '6m': fromMonth = addMonths(getCurrentMonth(), -5); break;
      case '12m': fromMonth = addMonths(getCurrentMonth(), -11); break;
      default: fromMonth = addMonths(getCurrentMonth(), -5);
    }
    return API.trends.get(fromMonth, getCurrentMonth(), this.selectedCategory);
  },

  renderDataSection(summary, trends) {
    this._dataSection.innerHTML = '';

    if (summary.porCategoria.length > 0 || summary.ingresos > 0) {
      this.renderMonthOverviewInto(this._dataSection, summary);

      if (summary.porCategoria.length > 0) {
        const chartCats = summary.porCategoria.filter(c => !c.parentId && c.neto > 0);

        if (chartCats.length > 0) {
          const catCard = create('div', { className: 'chart-container' });
          catCard.appendChild(create('div', { className: 'chart-title', textContent: 'Distribución del mes' }));

          const donutWrapper = create('div', { style: { display: 'flex', justifyContent: 'center' } });
          const donutCanvas = create('canvas', {
            className: 'chart-canvas',
            role: 'img',
            'aria-label': 'Gráfico de distribución de gastos del mes por categoría'
          });
          donutWrapper.appendChild(donutCanvas);
          catCard.appendChild(donutWrapper);

          const catLegend = create('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '12px', justifyContent: 'center' } });
          chartCats.forEach(cat => {
            catLegend.appendChild(create('div', {
              className: 'category-badge',
              innerHTML: `<span class="category-dot" style="background:${cat.color || '#6c6c7c'}"></span>${cat.nombre}: ${formatearEuro(cat.neto)}`
            }));
          });
          catCard.appendChild(catLegend);
          this._dataSection.appendChild(catCard);

          const segments = chartCats.map(cat => ({
            value: cat.neto,
            color: cat.color || '#6c6c7c',
            label: cat.nombre
          }));
          requestAnimationFrame(() => {
            Charts.drawDonut(donutCanvas, segments, 200);
          });
        }
      }
    } else {
      this._dataSection.appendChild(create('div', {
        className: 'empty-state',
        innerHTML: '<div class="empty-state-icon">📊</div><p class="empty-state-text">No hay datos este mes</p>'
      }));
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this._dataSection.classList.add('visible');
      });
    });

    this.renderTrendsInto(this._trendsSection, trends);
  },

  renderMonthOverviewInto(target, summary) {
    const monthCard = create('div', { className: 'chart-container' });
    monthCard.dataset.favoriteType = 'month-overview';
    monthCard.dataset.favoriteKey = 'month-overview';
    monthCard.dataset.favoriteLabel = 'Resumen del mes';
    monthCard.appendChild(create('div', { className: 'chart-title', textContent: 'Resumen del mes' }));

    const monthChartWrapper = create('div');
    const monthCanvas = create('canvas', { role: 'img', 'aria-label': 'Gráfico de gastos, ingresos y reembolsos del mes' });
    monthChartWrapper.appendChild(monthCanvas);
    monthCard.appendChild(monthChartWrapper);

    const legend = create('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '12px', justifyContent: 'center' } });
    if (summary.ingresos > 0) {
      legend.appendChild(create('div', { className: 'category-badge', innerHTML: `<span class="category-dot" style="background:var(--income-color)"></span>Ingresos: ${formatearEuro(summary.ingresos)}` }));
    }
    if (summary.gastosNetos > 0) {
      legend.appendChild(create('div', { className: 'category-badge', innerHTML: `<span class="category-dot" style="background:var(--expense-color)"></span>Gastos: ${formatearEuro(summary.gastosNetos)}` }));
    }
    if (summary.reembolsos > 0) {
      legend.appendChild(create('div', { className: 'category-badge', innerHTML: `<span class="category-dot" style="background:var(--refund-color)"></span>Reembolsos: ${formatearEuro(summary.reembolsos)}` }));
    }
    const savingsColor = summary.ahorro >= 0 ? 'var(--success)' : 'var(--danger)';
    legend.appendChild(create('div', { className: 'category-badge', innerHTML: `<span class="category-dot" style="background:${savingsColor}"></span>Ahorro: ${formatearEuro(summary.ahorro)}` }));
    monthCard.appendChild(legend);

    const barLabels = ['Gastos', 'Ingresos', 'Reembolsos'];
    const barData = [summary.gastosNetos, summary.ingresos, summary.reembolsos];
    const barColors = ['#FF6B6B', '#4ECDC4', '#FFE66D'];
    requestAnimationFrame(() => {
      Charts.drawBarChart(monthCanvas, barData.map((value, index) => ({
        value: Math.abs(value),
        color: barColors[index],
        label: barLabels[index]
      })), { height: 180 });
    });

    const savingsSign = summary.ahorro >= 0 ? '+' : '';
    const savingsStat = create('div', {
      className: 'category-badge',
      style: { justifyContent: 'center', marginTop: '12px', fontSize: 'var(--font-md)', fontWeight: '700', color: savingsColor }
    });
    savingsStat.innerHTML = `Ahorro: ${savingsSign}${formatearEuro(summary.ahorro)}`;
    monthCard.appendChild(savingsStat);
    target.appendChild(monthCard);
    return monthCard;
  },

  renderTrendsInto(target, trends) {
    target.replaceChildren();

    if (trends.monthlyData.length > 0) {
      const ahorroCard = create('div', { className: 'chart-container' });
      ahorroCard.dataset.favoriteType = 'trend-savings';
      ahorroCard.dataset.favoriteKey = 'trend-savings';
      ahorroCard.dataset.favoriteLabel = 'Evolución del ahorro';
      ahorroCard.appendChild(create('div', { className: 'chart-title', textContent: 'Evolución del ahorro' }));
      const ahorroWrapper = create('div');
      const ahorroCanvas = create('canvas', { role: 'img', 'aria-label': 'Evolución mensual del ahorro' });
      ahorroWrapper.appendChild(ahorroCanvas);
      ahorroCard.appendChild(ahorroWrapper);
      target.appendChild(ahorroCard);

      const labels = trends.monthlyData.map(d => {
        const [y, m] = d.month.split('-');
        const date = new Date(parseInt(y), parseInt(m) - 1);
        return date.toLocaleDateString('es-ES', { month: 'short' });
      });

      const ahorroData = trends.monthlyData.map(d => d.ahorro);

      requestAnimationFrame(() => {
        Charts.drawLineChart(ahorroCanvas, [{
          data: ahorroData,
          color: '#4ECDC4',
          label: 'Ahorro'
        }], labels, { height: 200 });
      });

      const catIds = Object.keys(trends.categoryTrends);
      if (catIds.length > 0) {
        const catCard = create('div', { className: 'chart-container' });
        catCard.dataset.favoriteType = 'trend-category';
        catCard.dataset.favoriteKey = 'trend-category';
        catCard.dataset.favoriteLabel = 'Evolución por categoría';
        catCard.appendChild(create('div', { className: 'chart-title', textContent: 'Evolución por categoría' }));
        const catWrapper = create('div');
        const catCanvas = create('canvas', { role: 'img', 'aria-label': 'Evolución mensual de gastos por categoría' });
        catWrapper.appendChild(catCanvas);
        catCard.appendChild(catWrapper);

        const catLegend = create('div', {
          style: { display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '12px', justifyContent: 'center' }
        });

        const datasets = catIds.map(catId => {
          const trend = trends.categoryTrends[catId];
          catLegend.appendChild(create('div', {
            className: 'category-badge',
            innerHTML: `<span class="category-dot" style="background:${trend.color || '#6c6c7c'}"></span>${trend.nombre}`
          }));
          return {
            data: trend.months.map(m => m.neto),
            color: trend.color || '#6c6c7c',
            label: trend.nombre
          };
        });

        catCard.appendChild(catLegend);
        target.appendChild(catCard);

        requestAnimationFrame(() => {
          Charts.drawLineChart(catCanvas, datasets, labels, { height: 220 });
        });
      }

      const incomeCard = create('div', { className: 'chart-container' });
      incomeCard.dataset.favoriteType = 'trend-income-ab';
      incomeCard.dataset.favoriteKey = 'trend-income-ab';
      incomeCard.dataset.favoriteLabel = 'Evolución porcentual A vs B';
      incomeCard.appendChild(create('div', { className: 'chart-title', textContent: 'Evolución porcentual A vs B' }));
      const incomeCanvas = create('canvas', { role: 'img', 'aria-label': 'Evolución porcentual mensual de ingresos A y B' });
      const incomeWrapper = create('div');
      incomeWrapper.appendChild(incomeCanvas);
      incomeCard.appendChild(incomeWrapper);
      const incomeLegend = create('div', { className: 'fv-legend' });
      incomeLegend.appendChild(create('div', { className: 'category-badge', innerHTML: '<span class="category-dot" style="background:#4ECDC4"></span>A' }));
      incomeLegend.appendChild(create('div', { className: 'category-badge', innerHTML: '<span class="category-dot" style="background:#FF6B6B"></span>B' }));
      incomeCard.appendChild(incomeLegend);
      target.appendChild(incomeCard);
      requestAnimationFrame(() => Charts.drawLineChart(incomeCanvas, [
        { data: trends.monthlyData.map(d => d.porcentajeA), color: '#4ECDC4', label: 'A' },
        { data: trends.monthlyData.map(d => d.porcentajeB), color: '#FF6B6B', label: 'B' }
      ], labels, { height: 200, valueFormatter: value => `${value.toFixed(0)}%` }));

      const ivaCard = create('div', { className: 'chart-container' });
      ivaCard.dataset.favoriteType = 'trend-iva';
      ivaCard.dataset.favoriteKey = 'trend-iva';
      ivaCard.dataset.favoriteLabel = 'IVA acumulado por mes';
      ivaCard.appendChild(create('div', { className: 'chart-title', textContent: 'IVA acumulado por mes' }));
      const ivaWrapper = create('div');
      const ivaCanvas = create('canvas', { role: 'img', 'aria-label': 'IVA acumulado en cada mes del período' });
      ivaWrapper.appendChild(ivaCanvas);
      ivaCard.appendChild(ivaWrapper);
      const ivaLegend = create('div', { className: 'fv-legend' });
      ivaLegend.appendChild(create('div', { className: 'category-badge', innerHTML: '<span class="category-dot" style="background:#FFE66D"></span>IVA acumulado' }));
      ivaCard.appendChild(ivaLegend);
      target.appendChild(ivaCard);
      requestAnimationFrame(() => Charts.drawBarChart(ivaCanvas, trends.monthlyData.map((d, i) => ({
        value: d.ivaAcumulado || 0,
        color: '#FFE66D',
        label: labels[i]
      })), { height: 180, seriesLabel: 'IVA acumulado' }));
    } else {
      target.appendChild(create('div', {
        className: 'empty-state',
        innerHTML: '<div class="empty-state-icon">📈</div><p class="empty-state-text">No hay datos en este período</p>'
      }));
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        target.classList.add('visible');
      });
    });
  }
};
