const TrendsPage = {
  selectedCategory: null,
  period: '6m',

  async render(params) {
    const content = $('#page-content');
    const navbar = $('#navbar');
    navbar.style.display = '';
    content.style.paddingBottom = '';

    if (params?.category) this.selectedCategory = params.category;
    if (params?.period) this.period = params.period;

    content.innerHTML = '<div class="loading">Cargando...</div>';

    try {
      const now = new Date();
      let fromMonth;
      switch (this.period) {
        case '3m': fromMonth = addMonths(getCurrentMonth(), -2); break;
        case '6m': fromMonth = addMonths(getCurrentMonth(), -5); break;
        case '12m': fromMonth = addMonths(getCurrentMonth(), -11); break;
        default: fromMonth = addMonths(getCurrentMonth(), -5);
      }

      const [trends, categories] = await Promise.all([
        API.trends.get(fromMonth, getCurrentMonth(), this.selectedCategory),
        API.categories.list()
      ]);

      this.renderContent(content, trends, categories);
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><p>Error: ${err.message}</p></div>`;
    }
  },

  renderContent(content, trends, categories) {
    content.innerHTML = '';

    const title = create('h2', {
      textContent: 'Tendencias',
      style: { fontSize: 'var(--font-xl)', fontWeight: '700', marginBottom: '16px' }
    });
    content.appendChild(title);

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
        this.render({ period: this.period, category: this.selectedCategory });
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
      this.render({ period: this.period, category: null });
    });
    filterContainer.appendChild(allBtn);

    categories.forEach(cat => {
      const btn = create('button', {
        className: `trend-filter-btn ${this.selectedCategory === cat.id ? 'active' : ''}`,
        textContent: cat.nombre
      });
      on(btn, 'click', () => {
        this.selectedCategory = cat.id;
        this.render({ period: this.period, category: cat.id });
      });
      filterContainer.appendChild(btn);
    });
    content.appendChild(filterContainer);

    if (trends.monthlyData.length === 0) {
      content.appendChild(create('div', {
        className: 'empty-state',
        innerHTML: '<div class="empty-state-icon">📈</div><p class="empty-state-text">No hay datos en este período</p>'
      }));
      return;
    }

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
    const ahorroColors = ahorroData.map(v => v >= 0 ? '#4ECDC4' : '#FF6B6B');

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
  }
};
