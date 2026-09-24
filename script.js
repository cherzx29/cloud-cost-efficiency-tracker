// Cloud Cost Efficiency Tracker — dashboard renderer
// Reads data.json (written by get_cost.py) and fills in the page.

async function loadDashboard() {
  let data;
  try {
    const res = await fetch('data.json', { cache: 'no-store' });
    data = await res.json();
  } catch (err) {
    document.getElementById('verdict-body').textContent =
      "Couldn't load data.json — run get_cost.py to generate it, then refresh.";
    console.error(err);
    return;
  }

  renderHeader(data);
  renderMetrics(data);
  renderVerdict(data);
  renderChart(data.cpuSeries || []);
  renderTable(data.dailyCost || []);
}

function renderHeader(data) {
  document.getElementById('report-range').textContent = data.reportRange || '—';
}

function renderMetrics(data) {
  setText('metric-monthlyCost', formatMoney(data.monthlyCost));
  setText('metric-cpuAverage', formatPercent(data.cpuAverage));
  setText('metric-cpuRange', data.reportRange || '—');
  setText('metric-savings', formatMoney(data.savings));
  setText('metric-savingsSub', data.savingsSub || '—');
}

function renderVerdict(data) {
  const verdict = document.getElementById('verdict');
  const tag = document.getElementById('verdict-tag');
  const body = document.getElementById('verdict-body');

  const wasteful = !!data.isWasteful;
  verdict.classList.toggle('is-good', !wasteful);
  tag.textContent = data.verdictTag || (wasteful ? 'Underutilized' : 'Efficient');
  body.textContent = data.verdictBody || '';
}

function renderChart(series) {
  const canvas = document.getElementById('cpu-chart');
  const axis = document.getElementById('chart-axis');
  const ctx = canvas.getContext('2d');

  // match canvas resolution to its displayed size (crisp on retina)
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.height;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);

  if (!series.length) {
    ctx.fillStyle = '#5B6572';
    ctx.font = '13px Inter, sans-serif';
    ctx.fillText('No usage data yet', 12, height / 2);
    return;
  }

  const values = series.map(p => p.value);
  const maxVal = Math.max(...values, 1); // floor of 1% so a flat idle line isn't a straight edge
  const padding = { top: 16, right: 12, bottom: 8, left: 36 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  // gridlines + y labels
  ctx.strokeStyle = '#E1E5EA';
  ctx.fillStyle = '#5B6572';
  ctx.font = '11px "IBM Plex Mono", monospace';
  const ySteps = 4;
  for (let i = 0; i <= ySteps; i++) {
    const y = padding.top + (plotH / ySteps) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    const label = (maxVal - (maxVal / ySteps) * i).toFixed(1) + '%';
    ctx.fillText(label, 2, y + 3);
  }

  // line
  ctx.beginPath();
  ctx.strokeStyle = '#C9622A';
  ctx.lineWidth = 1.75;
  values.forEach((v, i) => {
    const x = padding.left + (plotW / (values.length - 1)) * i;
    const y = padding.top + plotH - (v / maxVal) * plotH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // x-axis labels: first / middle / last timestamp
  axis.innerHTML = '';
  const labelPoints = [0, Math.floor(series.length / 2), series.length - 1];
  labelPoints.forEach(i => {
    const span = document.createElement('span');
    span.textContent = formatShortDate(series[i].time);
    axis.appendChild(span);
  });
}

function renderTable(rows) {
  const body = document.getElementById('cost-table-body');
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="2">No cost data yet</td></tr>';
    return;
  }
  body.innerHTML = rows.map(r => `
    <tr>
      <td>${r.date}</td>
      <td>${formatMoney(r.cost)} ${r.currency || ''}</td>
    </tr>
  `).join('');
}

// ---------- formatting helpers ----------
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function formatMoney(n) {
  if (typeof n !== 'number') return '—';
  return n.toFixed(2);
}

function formatPercent(n) {
  if (typeof n !== 'number') return '—';
  return n.toFixed(3);
}

function formatShortDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' ' + d.getHours() + 'h';
}

loadDashboard();
