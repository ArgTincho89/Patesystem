const EstadisticasPage = {
  selectedCategory: null,
  period: '6m',
  currentMonth: null,

  async render(params) {
    const content = $('#page-content');
    const navbar = $('#navbar');
    navbar.style.display = '';
    content.style.paddingBottom = '';

    const savedScroll = params?._keepScroll ? window.scrollY : 0;

    this.currentMonth = params?.month || getCurrentMonth();
    if (params?.category) this.selectedCategory = params.category;
    if (params?.period) this.period = params.period;

    content.innerHTML = '<div class="loading">Cargando...</div>';

    try {
      const [summary, trends, categories] = await Promise.all([
        API.summary.get(this.currentMonth),
        this.fetchTrends(),
        API.categories.list()
      ]);

      this.renderContent(content, summary, trends, categories);

      if (savedScroll) {
        requestAnimationFrame(() => window.scrollTo(0, savedScroll));
      }
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><p>Error: ${err.message}</p></div>`;
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

  renderContent(content, summary, trends, categories) {
    content.innerHTML = '';

    const title = create('h2', {
      textContent: 'Estadísticas',
      style: { fontSize: 'var(--font-xl)', fontWeight: '700', marginBottom: '16px' }
    });
    content.appendChild(title);

    const monthNav = createMonthSelector(this.currentMonth, (newMonth) => {
      this.currentMonth = newMonth;
      this.render({ month: newMonth, period: this.period, category: this.selectedCategory, _keepScroll: true });
    });
    content.appendChild(monthNav);

    if (summary.porCategoria.length > 0 || summary.ingresos > 0) {
      const monthCard = create('div', { className: 'chart-container' });
      monthCard.appendChild(create('div', { className: 'chart-title', textContent: 'Resumen del mes' }));

      const monthChartWrapper = create('div');
      const monthCanvas = create('canvas');
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
      content.appendChild(monthCard);

      const barLabels = ['Gastos', 'Ingresos', 'Reembolsos'];
      const barData = [summary.gastosNetos, summary.ingresos, summary.reembolsos];
      const barColors = ['#FF6B6B', '#4ECDC4', '#FFE66D'];

      requestAnimationFrame(() => {
        Charts.drawBarChart(monthCanvas, barData.map((v, i) => ({
          value: Math.abs(v),
          color: barColors[i],
          label: barLabels[i]
        })), { height: 180 });
      });

      const ahorroColor = summary.ahorro >= 0 ? 'var(--success)' : 'var(--danger)';
      const ahorroSign = summary.ahorro >= 0 ? '+' : '';
      const ahorroStat = create('div', {
        className: 'category-badge',
        style: { justifyContent: 'center', marginTop: '12px', fontSize: 'var(--font-md)', fontWeight: '700', color: ahorroColor }
      });
      ahorroStat.innerHTML = `Ahorro: ${ahorroSign}${formatearEuro(summary.ahorro)}`;
      monthCard.appendChild(ahorroStat);

      if (summary.porCategoria.length > 0) {
        const catCard = create('div', { className: 'chart-container' });
        catCard.appendChild(create('div', { className: 'chart-title', textContent: 'Distribución del mes' }));

        const donutWrapper = create('div', { style: { display: 'flex', justifyContent: 'center' } });
        const donutCanvas = create('canvas', { className: 'chart-canvas' });
        donutWrapper.appendChild(donutCanvas);
        catCard.appendChild(donutWrapper);

        const catLegend = create('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '12px', justifyContent: 'center' } });
        summary.porCategoria.filter(c => !c.parentId && c.neto > 0).forEach(cat => {
          catLegend.appendChild(create('div', {
            className: 'category-badge',
            innerHTML: `<span class="category-dot" style="background:${cat.color || '#6c6c7c'}"></span>${cat.nombre}: ${formatearEuro(cat.neto)}`
          }));
        });
        catCard.appendChild(catLegend);
        content.appendChild(catCard);

        const segments = summary.porCategoria.filter(c => !c.parentId && c.neto > 0).map(cat => ({
          value: cat.neto,
          color: cat.color || '#6c6c7c',
          label: cat.nombre
        }));
        requestAnimationFrame(() => {
          Charts.drawDonut(donutCanvas, segments, 200);
        });
      }
    } else {
      content.appendChild(create('div', {
        className: 'empty-state',
        innerHTML: '<div class="empty-state-icon">📊</div><p class="empty-state-text">No hay datos este mes</p>'
      }));
    }

    const trendDivider = create('div', { className: 'trend-divider', style: { margin: '24px 0 16px', borderTop: '1px solid var(--border)', paddingTop: '16px' } });
    trendDivider.appendChild(create('h3', { textContent: 'Tendencias', style: { fontSize: 'var(--font-lg)', marginBottom: '12px' } }));
    content.appendChild(trendDivider);

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
      on(btn, 'click', () => {
        this.period = p.value;
        this.render({ month: this.currentMonth, period: this.period, category: this.selectedCategory, _keepScroll: true });
      });
      periodSelector.appendChild(btn);
    });
    content.appendChild(periodSelector);

    const filterContainer = create('div', { className: 'trend-filters' });
    const allBtn = create('button', {
      className: `trend-filter-btn ${!this.selectedCategory ? 'active' : ''}`,
      textContent: 'Todas'
    });
    on(allBtn, 'click', () => {
      this.selectedCategory = null;
      this.render({ month: this.currentMonth, period: this.period, category: null, _keepScroll: true });
    });
    filterContainer.appendChild(allBtn);

    categories.forEach(cat => {
      const btn = create('button', {
        className: `trend-filter-btn ${this.selectedCategory === cat.id ? 'active' : ''}`,
        textContent: cat.nombre
      });
      on(btn, 'click', () => {
        this.selectedCategory = cat.id;
        this.render({ month: this.currentMonth, period: this.period, category: cat.id, _keepScroll: true });
      });
      filterContainer.appendChild(btn);
    });
    content.appendChild(filterContainer);

    if (trends.monthlyData.length > 0) {
      const ahorroCard = create('div', { className: 'chart-container' });
      ahorroCard.appendChild(create('div', { className: 'chart-title', textContent: 'Evolución del ahorro' }));
      const ahorroWrapper = create('div');
      const ahorroCanvas = create('canvas');
      ahorroWrapper.appendChild(ahorroCanvas);
      ahorroCard.appendChild(ahorroWrapper);
      content.appendChild(ahorroCard);

      const labels = trends.monthlyData.map(d => {
        const [y, m] = d.month.split('-');
        const date = new Date(parseInt(y), parseInt(m) - 1);
        return date.toLocaleDateString('es-ES', { month: 'short' });
      });

      const ahorroData = trends.monthlyData.map(d => d.ahorro);

      requestAnimationFrame(() => {
        Charts.drawLineChart(ahorroCanvas, [{
          data: ahorroData,
          color: '#4ECDC4'
        }], labels, { height: 200 });
      });

      const catIds = Object.keys(trends.categoryTrends);
      if (catIds.length > 0) {
        const catCard = create('div', { className: 'chart-container' });
        catCard.appendChild(create('div', { className: 'chart-title', textContent: 'Evolución por categoría' }));
        const catWrapper = create('div');
        const catCanvas = create('canvas');
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
            color: trend.color || '#6c6c7c'
          };
        });

        catCard.appendChild(catLegend);
        content.appendChild(catCard);

        requestAnimationFrame(() => {
          Charts.drawLineChart(catCanvas, datasets, labels, { height: 220 });
        });
      }
    } else {
      content.appendChild(create('div', {
        className: 'empty-state',
        innerHTML: '<div class="empty-state-icon">📈</div><p class="empty-state-text">No hay datos en este período</p>'
      }));
    }
  }
};
