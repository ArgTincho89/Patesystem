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
      const [summary, goals, burnRate] = await Promise.all([
        API.summary.get(this.currentMonth),
        API.goals.list(this.currentMonth).catch(() => []),
        API.summary.burnRate(this.currentMonth, 1).catch(() => null)
      ]);
      this.renderContent(content, summary, goals, burnRate);
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><p>Error: ${err.message}</p></div>`;
    }
  },

  renderContent(content, summary, goals, burnRate) {
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

    if (summary.ingresos > 0) {
      const incomeCard = create('div', { className: 'chart-container' });
      incomeCard.appendChild(create('div', { className: 'chart-title', textContent: 'Ingresos A vs B' }));
      const wrapper = create('div', { style: { display: 'flex', justifyContent: 'center' } });
      const canvas = create('canvas', { className: 'chart-canvas' });
      wrapper.appendChild(canvas);
      incomeCard.appendChild(wrapper);
      const legend = create('div', { className: 'fv-legend' });
      [['A', summary.ingresosA, summary.porcentajeA, '#4ECDC4'], ['B', summary.ingresosB, summary.porcentajeB, '#FF6B6B']].forEach(([label, value, pct, color]) => {
        legend.appendChild(create('div', { className: 'fv-legend-item', innerHTML: `<div class="category-badge"><span class="category-dot" style="background:${color}"></span>${label}: ${formatearEuro(value)}</div><div class="fv-legend-pct">${pct}%</div>` }));
      });
      incomeCard.appendChild(legend);
      incomeCard.appendChild(this.createIvaBadge(summary));
      content.appendChild(incomeCard);
      requestAnimationFrame(() => Charts.drawDonut(canvas, [
        { value: summary.ingresosA, color: '#4ECDC4', label: 'A' },
        { value: summary.ingresosB, color: '#FF6B6B', label: 'B' }
      ], 200));
    } else {
      content.appendChild(this.createIvaBadge(summary));
    }

    if (goals && goals.length > 0) {
      goals.forEach(goal => {
        const goalCard = this.renderGoalProgress(goal, summary);
        content.appendChild(goalCard);
      });
    }

    if (burnRate && burnRate.currentMonth && burnRate.currentMonth.length > 0) {
      const burnCard = this.renderBurnRate(burnRate);
      content.appendChild(burnCard);
    }

    const chartCats = summary.porCategoria.filter(c => !c.parentId && c.neto > 0);

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

    const flatCats = summary.porCategoria.filter(c => c.neto > 0);
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

      const fvTotal = summary.fijos + summary.variables;
      const fijoPct = fvTotal > 0 ? ((summary.fijos / fvTotal) * 100).toFixed(1) : '0.0';
      const varPct = fvTotal > 0 ? ((summary.variables / fvTotal) * 100).toFixed(1) : '0.0';

      const fvLegend = create('div', { className: 'fv-legend' });
      if (summary.fijos > 0) {
        const fijoItem = create('div', { className: 'fv-legend-item' });
        fijoItem.appendChild(create('div', { className: 'category-badge', innerHTML: `<span class="category-dot" style="background:#FF6B6B"></span>Fijo: ${formatearEuro(summary.fijos)}` }));
        fijoItem.appendChild(create('div', { className: 'fv-legend-pct', textContent: `${fijoPct}%` }));
        fvLegend.appendChild(fijoItem);
      }
      if (summary.variables > 0) {
        const varItem = create('div', { className: 'fv-legend-item' });
        varItem.appendChild(create('div', { className: 'category-badge', innerHTML: `<span class="category-dot" style="background:#4ECDC4"></span>Variable: ${formatearEuro(summary.variables)}` }));
        varItem.appendChild(create('div', { className: 'fv-legend-pct', textContent: `${varPct}%` }));
        fvLegend.appendChild(varItem);
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

  renderGoalProgress(goal, summary) {
    if (goal.tipo === 'gasto_categoria') {
      return this.renderSpendingLimitGoal(goal, summary);
    }
    if (goal.tipo === 'gasto_general') {
      return this.renderGeneralSpendingGoal(goal, summary);
    }
    return this.renderSavingsGoal(goal, summary);
  },

  renderSavingsGoal(goal, summary) {
    const card = create('div', { className: 'goal-progress-card' });
    const header = create('div', { className: 'goal-progress-header' });
    header.appendChild(create('span', { className: 'goal-progress-label', textContent: 'Meta de ahorro' }));

    let goalAmount = 0;
    if (goal.modo === 'monto_fijo') {
      goalAmount = goal.montoFijo;
    } else if (goal.modo === 'porcentaje_salario') {
      goalAmount = (goal.salarioEstimado * goal.porcentaje) / 100;
    } else if (goal.modo === 'porcentaje_ingresos_dinamico') {
      goalAmount = (summary.ingresos * goal.porcentaje) / 100;
    }

    const currentSavings = summary.ahorro;
    const percentage = goalAmount > 0 ? Math.min(Math.round((currentSavings / goalAmount) * 100), 100) : 0;
    const isComplete = currentSavings >= goalAmount;

    header.appendChild(create('span', {
      className: `goal-progress-pct ${isComplete ? 'complete' : ''}`,
      textContent: `${percentage}%`
    }));
    card.appendChild(header);

    const track = create('div', { className: 'goal-progress-track' });
    const fill = create('div', {
      className: `goal-progress-fill ${isComplete ? 'complete' : ''}`,
      style: { width: `${Math.min(percentage, 100)}%` }
    });
    track.appendChild(fill);
    card.appendChild(track);

    const details = create('div', { className: 'goal-progress-details' });
    details.appendChild(create('span', {
      className: isComplete ? 'text-success' : 'text-muted',
      textContent: isComplete ? '¡Meta alcanzada!' : `Objetivo: ${formatearEuro(goalAmount)}`
    }));
    card.appendChild(details);

    return card;
  },

  renderSpendingLimitGoal(goal, summary) {
    const card = create('div', { className: 'goal-progress-card' });
    const header = create('div', { className: 'goal-progress-header' });

    const catLabel = (goal.categoryName || 'Categoría').replace(/^\s*[└─]\s*/, '');
    header.appendChild(create('span', { className: 'goal-progress-label', textContent: `Meta: Límite de gastos por categoría: ${catLabel}` }));

    let goalAmount = 0;
    if (goal.modo === 'monto_fijo') {
      goalAmount = goal.montoFijo;
    } else if (goal.modo === 'porcentaje_salario') {
      goalAmount = (goal.salarioEstimado * goal.porcentaje) / 100;
    } else if (goal.modo === 'porcentaje_ingresos_dinamico') {
      goalAmount = (summary.ingresos * goal.porcentaje) / 100;
    }

    let categorySpend = 0;
    if (summary.porCategoria) {
      let found = false;
      for (const parent of summary.porCategoria) {
        if (parent.categoryId === goal.categoryId) {
          categorySpend = parent.neto;
          found = true;
          break;
        }
        for (const child of (parent.children || [])) {
          if (child.categoryId === goal.categoryId) {
            categorySpend = child.neto;
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }

    const percentage = goalAmount > 0 ? Math.round((categorySpend / goalAmount) * 100) : 0;
    const isOverLimit = percentage > 100;

    header.appendChild(create('span', {
      className: `goal-progress-pct ${isOverLimit ? 'over-limit' : ''}`,
      textContent: `${percentage}%`
    }));
    card.appendChild(header);

    const track = create('div', { className: 'goal-progress-track' });
    const fill = create('div', {
      className: `goal-progress-fill ${isOverLimit ? 'over-limit' : ''}`,
      style: { width: `${Math.min(percentage, 100)}%` }
    });
    track.appendChild(fill);
    card.appendChild(track);

    const details = create('div', { className: 'goal-progress-details' });
    if (!isOverLimit) {
      details.appendChild(create('span', {
        className: 'text-muted',
        textContent: `${percentage}% consumido (${formatearEuro(categorySpend)} de ${formatearEuro(goalAmount)})`
      }));
    } else {
      const exceso = categorySpend - goalAmount;
      const excesoPct = percentage - 100;

      const infoBlock = create('div', { className: 'goal-progress-exceeded' });
      infoBlock.appendChild(create('div', {
        className: 'goal-exceeded-line',
        innerHTML: `<span class="text-muted">Límite establecido:</span> <strong>${formatearEuro(goalAmount)}</strong>`
      }));
      infoBlock.appendChild(create('div', {
        className: 'goal-exceeded-line',
        innerHTML: `<span class="text-muted">Gasto actual:</span> <strong>${formatearEuro(categorySpend)}</strong>`
      }));
      infoBlock.appendChild(create('div', {
        className: 'goal-exceeded-line goal-exceeded-over',
        innerHTML: `<span>Excedente:</span> <strong>${formatearEuro(exceso)} (+${excesoPct}%)</strong>`
      }));
      details.appendChild(infoBlock);
    }
    card.appendChild(details);

    return card;
  },

  renderGeneralSpendingGoal(goal, summary) {
    const card = create('div', { className: 'goal-progress-card' });
    const header = create('div', { className: 'goal-progress-header' });
    header.appendChild(create('span', { className: 'goal-progress-label', textContent: 'Meta: Límite de gasto general' }));

    let goalAmount = 0;
    if (goal.modo === 'monto_fijo') {
      goalAmount = goal.montoFijo;
    } else if (goal.modo === 'porcentaje_salario') {
      goalAmount = (goal.salarioEstimado * goal.porcentaje) / 100;
    } else if (goal.modo === 'porcentaje_ingresos_dinamico') {
      goalAmount = (summary.ingresos * goal.porcentaje) / 100;
    }

    const currentSpend = summary.gastosNetos;
    const percentage = goalAmount > 0 ? Math.round((currentSpend / goalAmount) * 100) : 0;
    const isOverLimit = percentage >= 100;

    let zoneClass = 'zone-green';
    if (percentage >= 100) zoneClass = 'zone-red';
    else if (percentage >= 76) zoneClass = 'zone-orange';
    else if (percentage >= 50) zoneClass = 'zone-yellow';

    header.appendChild(create('span', {
      className: `goal-progress-pct ${isOverLimit ? 'over-limit' : ''}`,
      textContent: `${percentage}%`
    }));
    card.appendChild(header);

    const track = create('div', { className: 'goal-progress-track' });
    const fill = create('div', {
      className: `goal-progress-fill ${zoneClass}`,
      style: { width: `${Math.min(percentage, 100)}%` }
    });
    track.appendChild(fill);
    card.appendChild(track);

    const details = create('div', { className: 'goal-progress-details' });
    if (!isOverLimit) {
      details.appendChild(create('span', {
        className: 'text-muted',
        textContent: `${percentage}% consumido (${formatearEuro(currentSpend)} de ${formatearEuro(goalAmount)})`
      }));
    } else {
      const exceso = currentSpend - goalAmount;
      const excesoPct = percentage - 100;

      const infoBlock = create('div', { className: 'goal-progress-exceeded' });
      infoBlock.appendChild(create('div', {
        className: 'goal-exceeded-line',
        innerHTML: `<span class="text-muted">Límite establecido:</span> <strong>${formatearEuro(goalAmount)}</strong>`
      }));
      infoBlock.appendChild(create('div', {
        className: 'goal-exceeded-line',
        innerHTML: `<span class="text-muted">Gasto actual:</span> <strong>${formatearEuro(currentSpend)}</strong>`
      }));
      infoBlock.appendChild(create('div', {
        className: 'goal-exceeded-line goal-exceeded-over',
        innerHTML: `<span>Excedente:</span> <strong>${formatearEuro(exceso)} (+${excesoPct}%)</strong>`
      }));
      details.appendChild(infoBlock);
    }
    card.appendChild(details);

    return card;
  },

  renderBurnRate(burnRate) {
    const card = create('div', { className: 'chart-container' });

    const header = create('div', { className: 'chart-title' });
    header.textContent = 'Ritmo de gasto';
    card.appendChild(header);

    const indicator = create('div', { className: `burn-indicator burn-indicator-${burnRate.indicator.direction}` });
    indicator.appendChild(create('span', { className: 'burn-indicator-text', textContent: burnRate.indicator.text }));
    card.appendChild(indicator);

    const legend = create('div', { className: 'burn-legend' });
    legend.appendChild(create('span', { className: 'burn-legend-item', innerHTML: '<span class="burn-legend-dot burn-legend-dot-current"></span>Este mes' }));
    if (burnRate.historical && burnRate.historical.length > 0) {
      legend.appendChild(create('span', { className: 'burn-legend-item', innerHTML: '<span class="burn-legend-dot burn-legend-dot-historical"></span>Promedio' }));
    }
    card.appendChild(legend);

    const wrapper = create('div', { style: { display: 'flex', justifyContent: 'center' } });
    const canvas = create('canvas', { className: 'chart-canvas' });
    wrapper.appendChild(canvas);
    card.appendChild(wrapper);

    requestAnimationFrame(() => {
      this.drawBurnRateChart(canvas, burnRate);
    });

    return card;
  },

  drawBurnRateChart(canvas, burnRate) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.parentElement.clientWidth - 48;
    const h = 200;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    const padding = { top: 10, right: 10, bottom: 30, left: 60 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const maxDay = Math.max(
      burnRate.currentMonth.length > 0 ? burnRate.currentMonth[burnRate.currentMonth.length - 1].day : 0,
      burnRate.historical && burnRate.historical.length > 0 ? burnRate.historical[burnRate.historical.length - 1].day : 0,
      1
    );

    const allCumulative = [
      ...burnRate.currentMonth.map(d => d.cumulative),
      ...(burnRate.historical || []).map(d => d.cumulative)
    ];
    const maxVal = Math.max(...allCumulative, 1);

    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      const val = maxVal - (maxVal / 4) * i;
      ctx.fillStyle = '#6c6c7c';
      ctx.font = '10px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatearEuro(val), padding.left - 8, y);
    }

    const drawLine = (data, color) => {
      if (!data || data.length === 0) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      data.forEach((d, i) => {
        const x = padding.left + ((d.day - 1) / (maxDay - 1 || 1)) * chartW;
        const y = padding.top + chartH - (d.cumulative / maxVal) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      data.forEach(d => {
        const x = padding.left + ((d.day - 1) / (maxDay - 1 || 1)) * chartW;
        const y = padding.top + chartH - (d.cumulative / maxVal) * chartH;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    if (burnRate.historical && burnRate.historical.length > 0) {
      const grouped = {};
      burnRate.historical.forEach(d => {
        if (!grouped[d.day]) grouped[d.day] = [];
        grouped[d.day].push(d.cumulative);
      });
      const avgData = Object.entries(grouped).map(([day, vals]) => ({
        day: parseInt(day),
        cumulative: vals.reduce((a, b) => a + b, 0) / vals.length
      })).sort((a, b) => a.day - b.day);
      drawLine(avgData, '#6c6c7c');
    }

    drawLine(burnRate.currentMonth, '#4ECDC4');

    const today = burnRate.currentDay;
    const todayX = padding.left + ((today - 1) / (maxDay - 1 || 1)) * chartW;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#FF6B6B';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(todayX, padding.top);
    ctx.lineTo(todayX, padding.top + chartH);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#FF6B6B';
    ctx.font = '9px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Hoy', todayX, padding.top + chartH + 12);
  },

  createStat(label, value, color) {
    const card = create('div', { className: 'stat-card' });
    card.appendChild(create('div', { className: 'stat-label', textContent: label }));
    const val = create('div', { className: 'stat-value', textContent: value });
    val.style.color = color;
    card.appendChild(val);
    return card;
  },

  createIvaBadge(summary) {
    const badge = create('div', { className: 'category-badge' });
    badge.style.justifyContent = 'center';
    badge.style.marginTop = '12px';
    badge.innerHTML = `<span class="category-dot" style="background:#FFE66D"></span>IVA acumulado: ${formatearEuro(summary.ivaAcumulado ?? 0)}`;
    return badge;
  }
};
