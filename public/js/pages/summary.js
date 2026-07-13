const SummaryPage = {
  currentMonth: null,

  async render(params) {
    const content = $('#page-content');
    const navbar = $('#navbar');
    navbar.style.display = '';
    content.style.paddingBottom = '';

    this.currentMonth = params?.month || getCurrentMonth();
    content.innerHTML = '<div class="loading">Cargando...</div>';

    try {
      const summary = await API.summary.get(this.currentMonth);
      this.renderContent(content, summary);
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><p>Error: ${err.message}</p></div>`;
    }
  },

  renderContent(content, summary) {
    content.innerHTML = '';

    const monthNav = createMonthSelector(this.currentMonth, (newMonth) => {
      this.currentMonth = newMonth;
      Router.navigate(`/summary?month=${newMonth}`);
    }, { allowFuture: true });
    content.appendChild(monthNav);

    const statsRow = create('div', { className: 'stats-row' });
    const savingsColor = summary.ahorro >= 0 ? 'var(--success)' : 'var(--danger)';
    const savingsSign = summary.ahorro >= 0 ? '+' : '';

    statsRow.appendChild(this.createStat('Ingresos', formatearEuro(summary.ingresos), 'var(--income-color)'));
    statsRow.appendChild(this.createStat('Gastos', formatearEuro(summary.gastosNetos), 'var(--expense-color)'));
    statsRow.appendChild(this.createStat('Ahorro', `${savingsSign}${formatearEuro(summary.ahorro)}`, savingsColor));
    content.appendChild(statsRow);
    const allCats = [];
    summary.porCategoria.forEach(c => {
      allCats.push(c);
      (c.children || []).forEach(ch => allCats.push(ch));
    });
    const flatCats = allCats.filter(c => c.neto > 0);

    const chartCats = allCats.filter(c => c.neto > 0);

    if (chartCats.length > 0) {
      const chartCard = create('div', { className: 'chart-container' });
      chartCard.appendChild(create('div', { className: 'chart-title', textContent: 'Distribución de gastos' }));

      const chartWrapper = create('div', { style: { display: 'flex', justifyContent: 'center' } });
      const canvas = create('canvas', { className: 'chart-canvas' });
      chartWrapper.appendChild(canvas);
      chartCard.appendChild(chartWrapper);

      const legend = create('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px', justifyContent: 'center' } });
      chartCats.forEach(cat => {
        const item = create('div', { className: 'category-badge' });
        item.appendChild(create('span', {
          className: 'category-dot',
          style: { background: cat.color || '#6c6c7c' }
        }));
        item.appendChild(document.createTextNode(`${cat.nombre} (${formatearEuro(cat.neto)})`));
        legend.appendChild(item);
      });
      chartCard.appendChild(legend);
      content.appendChild(chartCard);

      const segments = chartCats.map(cat => ({
        value: cat.neto,
        color: cat.color || '#6c6c7c',
        label: cat.nombre
      }));
      requestAnimationFrame(() => {
        Charts.drawDonut(canvas, segments, 200);
      });
    }

    const catSection = create('div', { className: 'summary-section' });
    catSection.appendChild(create('h3', {
      textContent: 'Desglose por categoría',
      style: { marginBottom: '16px' }
    }));

    if (flatCats.length === 0) {
      catSection.appendChild(create('p', {
        textContent: 'No hay gastos este mes',
        className: 'text-muted text-center'
      }));
    } else {
      const maxNeto = Math.max(...flatCats.map(c => c.neto), 1);

      const renderBreakdown = (cat, depth) => {
        const pct = summary.gastosNetos > 0 ? ((cat.neto / summary.gastosNetos) * 100).toFixed(1) : '0.0';
        const barWidth = (cat.neto / maxNeto) * 100;

        const row = create('div', { style: { marginBottom: '12px', paddingLeft: `${depth * 16}px` } });
        row.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span class="category-badge">
              <span class="category-dot" style="background:${cat.color || '#6c6c7c'}"></span>
              ${cat.nombre}
            </span>
            <span style="font-weight:600;">${formatearEuro(cat.neto)} <span style="color:var(--text-muted); font-weight:400; font-size:var(--font-sm);">(${pct}%)</span></span>
          </div>
          <div class="category-bar-track">
            <div class="category-bar-fill" style="width:${barWidth}%; background:${cat.color || '#6c6c7c'};"></div>
          </div>
        `;
        catSection.appendChild(row);

        (cat.children || []).forEach(child => renderBreakdown(child, depth + 1));
      };

      summary.porCategoria.forEach(cat => renderBreakdown(cat, 0));
    }

    content.appendChild(catSection);

    if (summary.fijos > 0 || summary.variables > 0) {
      const fvCard = create('div', { className: 'chart-container' });
      fvCard.appendChild(create('div', { className: 'chart-title', textContent: 'Fijo vs Variable' }));

      const fvWrapper = create('div', { style: { display: 'flex', justifyContent: 'center' } });
      const fvCanvas = create('canvas', { className: 'chart-canvas' });
      fvWrapper.appendChild(fvCanvas);
      fvCard.appendChild(fvWrapper);

      const fvLegend = create('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px', justifyContent: 'center' } });
      if (summary.fijos > 0) {
        fvLegend.appendChild(create('div', { className: 'category-badge', innerHTML: `<span class="category-dot" style="background:#FF6B6B"></span>Fijo: ${formatearEuro(summary.fijos)}` }));
      }
      if (summary.variables > 0) {
        fvLegend.appendChild(create('div', { className: 'category-badge', innerHTML: `<span class="category-dot" style="background:#4ECDC4"></span>Variable: ${formatearEuro(summary.variables)}` }));
      }
      fvCard.appendChild(fvLegend);
      content.appendChild(fvCard);

      const fvSegments = [];
      if (summary.fijos > 0) fvSegments.push({ value: summary.fijos, color: '#FF6B6B', label: 'Fijo' });
      if (summary.variables > 0) fvSegments.push({ value: summary.variables, color: '#4ECDC4', label: 'Variable' });
      requestAnimationFrame(() => {
        Charts.drawDonut(fvCanvas, fvSegments, 200);
      });
    }
  },

  createStat(label, value, color) {
    const card = create('div', { className: 'stat-card' });
    card.appendChild(create('div', { className: 'stat-label', textContent: label }));
    const val = create('div', { className: 'stat-value', textContent: value });
    val.style.color = color;
    card.appendChild(val);
    return card;
  }
};
