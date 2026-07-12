const Charts = {
  drawDonut(canvas, segments, size) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 10;
    const innerRadius = radius * 0.55;

    const total = segments.reduce((sum, s) => sum + s.value, 0);
    if (total === 0) return;

    let startAngle = -Math.PI / 2;

    segments.forEach(segment => {
      const sliceAngle = (segment.value / total) * 2 * Math.PI;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      ctx.arc(cx, cy, innerRadius, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = segment.color;
      ctx.fill();

      startAngle += sliceAngle;
    });

    ctx.fillStyle = '#e8e8e8';
    ctx.font = 'bold 16px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatearEuro(total), cx, cy - 8);
    ctx.font = '11px -apple-system, sans-serif';
    ctx.fillStyle = '#a0a0b0';
    ctx.fillText('Total', cx, cy + 10);
  },

  drawBarChart(canvas, data, options = {}) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.parentElement.clientWidth - 48;
    const h = options.height || 180;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    if (!data.length) return;

    const padding = { top: 10, right: 10, bottom: 40, left: 60 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const allValues = data.map(d => d.value);
    const maxVal = Math.max(...allValues, 1);
    const barWidth = Math.min(chartW / data.length * 0.6, 40);
    const gap = chartW / data.length;

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

    data.forEach((d, i) => {
      const x = padding.left + gap * i + (gap - barWidth) / 2;
      const barH = (d.value / maxVal) * chartH;
      const y = padding.top + chartH - barH;

      ctx.fillStyle = d.color || '#4ECDC4';
      ctx.beginPath();
      const r = Math.min(4, barWidth / 2);
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + barWidth - r, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + r);
      ctx.lineTo(x + barWidth, padding.top + chartH);
      ctx.lineTo(x, padding.top + chartH);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.fill();

      ctx.fillStyle = '#6c6c7c';
      ctx.font = '10px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const label = d.label.length > 6 ? d.label.slice(0, 5) + '.' : d.label;
      ctx.fillText(label, x + barWidth / 2, padding.top + chartH + 8);
    });
  },

  drawLineChart(canvas, datasets, labels, options = {}) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.parentElement.clientWidth - 48;
    const h = options.height || 200;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    if (!datasets.length || !labels.length) return;

    const padding = { top: 10, right: 10, bottom: 40, left: 60 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const allVals = datasets.flatMap(ds => ds.data);
    const maxVal = Math.max(...allVals, 1);
    const minVal = Math.min(0, ...allVals);
    const range = maxVal - minVal || 1;

    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      const val = maxVal - (range / 4) * i;
      ctx.fillStyle = '#6c6c7c';
      ctx.font = '10px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatearEuro(val), padding.left - 8, y);
    }

    const gap = chartW / (labels.length - 1 || 1);

    datasets.forEach(ds => {
      ctx.strokeStyle = ds.color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      ds.data.forEach((val, i) => {
        const x = padding.left + gap * i;
        const y = padding.top + chartH - ((val - minVal) / range) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ds.data.forEach((val, i) => {
        const x = padding.left + gap * i;
        const y = padding.top + chartH - ((val - minVal) / range) * chartH;
        ctx.fillStyle = ds.color;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    labels.forEach((label, i) => {
      const x = padding.left + gap * i;
      ctx.fillStyle = '#6c6c7c';
      ctx.font = '10px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(label, x, padding.top + chartH + 8);
    });
  }
};
