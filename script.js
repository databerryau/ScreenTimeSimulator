const activities = [
  { id: 'unallocated', label: 'Unallocated', color: '#1f2937', category: 'neutral' },
  { id: 'mvpa', label: 'MVPA (run/bike)', color: '#22c55e', category: 'mvpa' },
  { id: 'light', label: 'Light activity (walk/chores)', color: '#34d399', category: 'light' },
  { id: 'strength', label: 'Strength', color: '#a855f7', category: 'strength' },
  { id: 'outdoor', label: 'Outdoors (mixed)', color: '#0ea5e9', category: 'outdoor' },
  { id: 'edu', label: 'Educational screen', color: '#60a5fa', category: 'screen' },
  { id: 'rec', label: 'Recreational screen', color: '#fb7185', category: 'screen' },
  { id: 'phone', label: 'Phone social', color: '#fbbf24', category: 'screen' },
  { id: 'sedentary', label: 'Offline sedentary', color: '#9ca3af', category: 'sedentary' }
];

const presets = {
  current: () => {
    const base = Array(96).fill('unallocated');
    // 1–3pm educational screen
    fillRange(base, 52, 60, 'edu');
    // 3–4pm Xbox
    fillRange(base, 60, 64, 'rec');
    // phone micro-use across the day
    for (let i = 36; i < 84; i += 6) base[i] = 'phone';
    return base;
  },
  balanced: () => {
    const base = presets.current();
    // Add 45–60 min MVPA 9–10am
    fillRange(base, 36, 40, 'mvpa');
    // Light breaks around study/gaming
    base[51] = 'light';
    base[60] = 'light';
    base[64] = 'light';
    base[68] = 'light';
    return base;
  },
  drift: () => {
    const base = Array(96).fill('unallocated');
    // Late start
    fillRange(base, 44, 52, 'edu');
    // 1pm-7pm recreational screen
    fillRange(base, 52, 80, 'rec');
    // Phone into late night
    fillRange(base, 80, 88, 'phone');
    base[40] = 'sedentary';
    return base;
  }
};

let schedule = presets.current();
let isDragging = false;
let activeType = 'mvpa';

// Utility helpers
function fillRange(arr, start, end, type) {
  for (let i = start; i < end; i += 1) arr[i] = type;
}

function formatTime(index) {
  const totalMinutes = index * 15;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function renderLegend() {
  const legend = document.getElementById('legend');
  legend.innerHTML = '';
  activities.forEach((activity) => {
    const item = document.createElement('span');
    item.innerHTML = `<span class="swatch" style="background:${activity.color}"></span>${activity.label}`;
    legend.appendChild(item);
  });
}

function renderActivitySelect() {
  const select = document.getElementById('activity-select');
  select.innerHTML = '';
  activities.forEach((activity) => {
    const option = document.createElement('option');
    option.value = activity.id;
    option.textContent = activity.label;
    select.appendChild(option);
  });
  select.value = activeType;
  select.addEventListener('change', (e) => {
    activeType = e.target.value;
  });
}

function renderGrid() {
  const grid = document.getElementById('schedule-grid');
  grid.innerHTML = '';
  const labelRow = document.createElement('div');
  labelRow.className = 'hour-label';
  for (let h = 0; h < 24; h += 1) {
    const span = document.createElement('span');
    span.textContent = `${h}:00`;
    labelRow.appendChild(span);
  }
  grid.appendChild(labelRow);

  schedule.forEach((type, index) => {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    cell.dataset.index = index;
    cell.title = `${formatTime(index)}-${formatTime(index + 1)}`;
    cell.addEventListener('mousedown', () => startPaint(index));
    cell.addEventListener('mouseover', () => {
      if (isDragging) startPaint(index);
    });
    const minuteLabel = document.createElement('small');
    minuteLabel.textContent = formatTime(index);
    cell.appendChild(minuteLabel);
    grid.appendChild(cell);
  });
  grid.addEventListener('mousedown', () => { isDragging = true; });
  grid.addEventListener('mouseup', () => { isDragging = false; });
  grid.addEventListener('mouseleave', () => { isDragging = false; });
  updateGridColors();
}

function startPaint(index) {
  schedule[index] = activeType;
  updateGridColors();
  runSimulation();
}

function updateGridColors() {
  const cells = document.querySelectorAll('.grid-cell');
  cells.forEach((cell) => {
    const activity = activities.find((a) => a.id === schedule[cell.dataset.index]);
    cell.style.background = activity?.color || '#0f172a';
  });
}

function computeDailyMetrics(plan, settings) {
  const randomized = applyRandomness(plan, settings);
  let mvpaMinutes = 0;
  let lightMinutes = 0;
  let strengthMinutes = 0;
  let screenMinutes = 0;
  let sedentaryMinutes = 0;
  let breakMoments = 0;

  let currentSedentary = 0;
  let longestSedentary = 0;
  let currentScreen = 0;
  let longestScreen = 0;

  randomized.forEach((type) => {
    const activity = activities.find((a) => a.id === type);
    const isScreen = activity?.category === 'screen';
    const isSedentary = isScreen || activity?.category === 'sedentary' || activity?.category === 'neutral';

    if (activity?.category === 'mvpa') mvpaMinutes += 15;
    if (activity?.category === 'light') lightMinutes += 15;
    if (activity?.category === 'strength') strengthMinutes += 15;
    if (activity?.category === 'outdoor') {
      const outdoorBonus = settings.outdoors === 'high' && settings.compliance > 60;
      mvpaMinutes += outdoorBonus ? 15 : 0;
      lightMinutes += outdoorBonus ? 0 : 15;
    }
    if (isScreen) screenMinutes += 15;
    if (isSedentary) sedentaryMinutes += 15;

    if (isSedentary) {
      currentSedentary += 15;
      if (isScreen) currentScreen += 15; else currentScreen = 0;
    } else {
      if (currentSedentary >= 30) breakMoments += 5;
      currentSedentary = 0;
      currentScreen = 0;
    }
    longestSedentary = Math.max(longestSedentary, currentSedentary);
    longestScreen = Math.max(longestScreen, currentScreen);
  });

  const mvpaDeficit = Math.max(0, 60 - mvpaMinutes);
  const expectedBreaks = settings.breakRule === 'none' ? 0 : Math.round((sedentaryMinutes / settings.breakRule) * 5);
  const breakCompliance = settings.breakRule === 'none' ? 0 : clamp(Math.round((breakMoments / (expectedBreaks || 1)) * 100), 0, 120);

  const energyOut = (0.08 * mvpaMinutes) + (0.04 * lightMinutes);
  const energyIn = 18;

  const streakPenalty = Math.pow(longestSedentary / 120, 2) * 30;
  const ergonomicsFactor = settings.ergonomics === 'good' ? 0.8 : settings.ergonomics === 'ok' ? 1 : 1.2;

  const discomfort = clamp((0.12 * sedentaryMinutes + streakPenalty - 0.3 * breakMoments - 0.1 * strengthMinutes) * ergonomicsFactor, 0, 100);
  const eyeStrain = clamp(0.12 * screenMinutes + 0.04 * (longestScreen) - 0.4 * (breakCompliance / 10), 0, 100);

  const balanceScore = computeBalanceScore({
    mvpaMinutes,
    strengthMinutes,
    screenMinutes,
    longestSedentary,
  });

  return {
    schedule: randomized,
    mvpaMinutes,
    lightMinutes,
    strengthMinutes,
    screenMinutes,
    sedentaryMinutes,
    longestSedentary,
    longestScreen,
    mvpaDeficit,
    expectedBreaks,
    breakMoments,
    breakCompliance,
    energyOut,
    energyIn,
    streakPenalty,
    discomfort,
    eyeStrain,
    balanceScore,
  };
}

function computeBalanceScore({ mvpaMinutes, strengthMinutes, screenMinutes, longestSedentary }) {
  const mvpaScore = clamp((mvpaMinutes / 60) * 100, 0, 120);
  const strengthScore = clamp((strengthMinutes / 45) * 100, 0, 120);
  const screenScore = clamp(100 - Math.max(0, screenMinutes - 120) * 0.4, 0, 100);
  const streakScore = clamp(100 - Math.max(0, longestSedentary - 90) * 0.5, 0, 100);
  const composite = (0.35 * mvpaScore + 0.2 * strengthScore + 0.25 * screenScore + 0.2 * streakScore);
  return Math.round(composite);
}

function applyRandomness(plan, settings) {
  const arr = [...plan];
  const complianceFactor = settings.compliance / 100;
  const driftCount = Math.max(1, Math.round((1 - complianceFactor) * 6));

  for (let i = 0; i < driftCount; i += 1) {
    const idx = Math.floor(Math.random() * arr.length);
    const current = arr[idx];
    const activity = activities.find((a) => a.id === current);
    if (activity?.category === 'mvpa' && Math.random() > complianceFactor) {
      arr[idx] = 'rec';
    } else if (activity?.category === 'screen' && Math.random() > complianceFactor * 0.6) {
      if (idx + 1 < arr.length) arr[idx + 1] = current;
    } else if (activity?.category === 'neutral' && Math.random() < 0.4) {
      arr[idx] = Math.random() < 0.5 ? 'light' : 'mvpa';
    }
  }

  if (settings.outdoors === 'high' && Math.random() < 0.4) {
    const start = 24 + Math.floor(Math.random() * 20);
    fillRange(arr, start, Math.min(start + 2, arr.length), 'light');
  }

  if (complianceFactor < 0.65 && Math.random() < 0.4) {
    const start = 48 + Math.floor(Math.random() * 8);
    fillRange(arr, start, Math.min(start + 8, arr.length), 'rec');
  }

  if (settings.handIn) {
    for (let i = 88; i < 96; i += 1) {
      if (activities.find((a) => a.id === arr[i])?.category === 'screen') arr[i] = 'sedentary';
    }
  }

  if (settings.activeGaming) {
    arr.forEach((type, idx) => {
      if (type === 'rec') {
        arr[idx] = Math.random() > 0.6 ? 'mvpa' : 'rec';
      }
    });
  }

  return arr;
}

function runSimulation() {
  const weeks = Number(document.getElementById('weeks').value);
  const compliance = Number(document.getElementById('compliance').value);
  const baseFitness = Number(document.getElementById('fitness').value);
  const breakRule = document.getElementById('break-rule').value;
  const ergonomics = document.getElementById('ergonomics').value;
  const outdoors = document.getElementById('outdoors').value;
  const social = document.getElementById('social').value;
  const handIn = document.getElementById('device-handin').checked;
  const activeGaming = document.getElementById('active-gaming').checked;

  const days = weeks * 7;
  let fitness = baseFitness;
  let weightTrend = 0;
  const daily = [];

  for (let day = 0; day < days; day += 1) {
    const dayMetrics = computeDailyMetrics(schedule, {
      compliance,
      breakRule: breakRule === 'none' ? 'none' : Number(breakRule),
      ergonomics,
      outdoors,
      social,
      handIn,
      activeGaming,
    });

    fitness = clamp(fitness + 0.05 * dayMetrics.mvpaMinutes + 0.03 * dayMetrics.strengthMinutes - 0.01 * dayMetrics.sedentaryMinutes - 0.04 * dayMetrics.mvpaDeficit, 0, 100);
    weightTrend += 0.1 * (dayMetrics.energyIn - dayMetrics.energyOut);

    daily.push({ ...dayMetrics, fitness: Math.round(fitness), weightTrend: Math.round(weightTrend) });
  }

  const averages = computeAverages(daily);
  renderMetrics(averages, daily[daily.length - 1]);
  renderWeeklyReport(daily, weeks);
  renderComparisons({
    base: { schedule, settings: { compliance, breakRule, ergonomics, outdoors, social, handIn, activeGaming, baseFitness } },
    balanced: buildBalancedScenario(),
    drift: buildDriftScenario(),
  });
}

function computeAverages(daily) {
  const sum = daily.reduce((acc, d) => ({
    mvpa: acc.mvpa + d.mvpaMinutes,
    light: acc.light + d.lightMinutes,
    strength: acc.strength + d.strengthMinutes,
    screen: acc.screen + d.screenMinutes,
    sedentary: acc.sedentary + d.sedentaryMinutes,
    longestSed: acc.longestSed + d.longestSedentary,
    longestScreen: acc.longestScreen + d.longestScreen,
    breakCompliance: acc.breakCompliance + d.breakCompliance,
    discomfort: acc.discomfort + d.discomfort,
    eye: acc.eye + d.eyeStrain,
    balance: acc.balance + d.balanceScore,
    fitness: acc.fitness + d.fitness,
    weight: acc.weight + d.weightTrend,
  }), {
    mvpa: 0, light: 0, strength: 0, screen: 0, sedentary: 0,
    longestSed: 0, longestScreen: 0, breakCompliance: 0, discomfort: 0, eye: 0, balance: 0, fitness: 0, weight: 0
  });
  const count = daily.length || 1;
  return {
    mvpa: Math.round(sum.mvpa / count),
    light: Math.round(sum.light / count),
    strength: Math.round(sum.strength / count),
    screen: Math.round(sum.screen / count),
    sedentary: Math.round(sum.sedentary / count),
    longestSed: Math.round(sum.longestSed / count),
    longestScreen: Math.round(sum.longestScreen / count),
    breakCompliance: Math.round(sum.breakCompliance / count),
    discomfort: Math.round(sum.discomfort / count),
    eye: Math.round(sum.eye / count),
    balance: Math.round(sum.balance / count),
    fitness: Math.round(sum.fitness / count),
    weight: Math.round(sum.weight / count),
  };
}

function metricCard(title, value, description, progress = null, badge = null) {
  const wrapper = document.createElement('div');
  wrapper.className = 'metric-card';
  wrapper.innerHTML = `<p class="eyebrow">${title}</p><h3>${value}</h3><p>${description}</p>`;
  if (progress !== null) {
    const bar = document.createElement('div');
    bar.className = 'progress';
    bar.innerHTML = `<div class="bar" style="width:${progress}%"></div>`;
    wrapper.appendChild(bar);
  }
  if (badge) {
    const b = document.createElement('span');
    b.className = 'badge';
    b.textContent = badge;
    wrapper.appendChild(b);
  }
  return wrapper;
}

function renderMetrics(avg, latest) {
  const grid = document.getElementById('metric-grid');
  grid.innerHTML = '';
  grid.appendChild(metricCard('MVPA', `${avg.mvpa} min/day`, 'Goal: 60+ minutes', Math.min(100, (avg.mvpa / 60) * 100)));
  grid.appendChild(metricCard('Light activity', `${avg.light} min/day`, 'Low-intensity movement', Math.min(100, (avg.light / 120) * 100)));
  grid.appendChild(metricCard('Strength', `${avg.strength} min/day`, 'Target: ~3 days/week', Math.min(100, (avg.strength / 45) * 100)));
  grid.appendChild(metricCard('Screen time', `${avg.screen} min/day`, 'Recreational moderation target ~120 min/day', clamp(100 - Math.max(0, avg.screen - 120) * 0.4, 0, 100)));
  grid.appendChild(metricCard('Longest sedentary streak', `${avg.longestSed} min`, 'Unbroken sitting drives discomfort', clamp(100 - Math.max(0, avg.longestSed - 90) * 0.8, 0, 100)));
  grid.appendChild(metricCard('Break compliance', `${avg.breakCompliance}%`, 'Higher means streaks are interrupted', avg.breakCompliance));
  grid.appendChild(metricCard('Fitness index', `${latest.fitness}/100`, 'Moves slowly with activity volume', latest.fitness));
  const weightDir = latest.weight > 3 ? 'Upward trend' : latest.weight < -3 ? 'Downward trend' : 'Stable';
  grid.appendChild(metricCard('Weight trend', weightDir, 'Energy out vs in (directional)', clamp(50 + latest.weight, 0, 100)));
  grid.appendChild(metricCard('Discomfort risk', `${avg.discomfort}/100`, 'Neck/back discomfort proxy', avg.discomfort, avg.discomfort > 70 ? 'High' : avg.discomfort > 40 ? 'Moderate' : 'Low'));
  grid.appendChild(metricCard('Eye strain risk', `${avg.eye}/100`, 'Screen exposure + streak length', avg.eye, avg.eye > 70 ? 'High' : avg.eye > 40 ? 'Moderate' : 'Low'));
  grid.appendChild(metricCard('Balance score', `${avg.balance}/100`, 'Single headline metric', avg.balance));
}

function renderWeeklyReport(daily, weeks) {
  const table = document.getElementById('weekly-table');
  table.innerHTML = '';
  const header = document.createElement('tr');
  ['Week', 'Avg MVPA', 'Strength days', 'Avg rec screen', 'Avg longest sit', 'Balance'].forEach((label) => {
    const th = document.createElement('th');
    th.textContent = label;
    header.appendChild(th);
  });
  table.appendChild(header);

  for (let w = 0; w < weeks; w += 1) {
    const slice = daily.slice(w * 7, (w + 1) * 7);
    const weekAvg = computeAverages(slice);
    const strengthDays = Math.round(slice.reduce((acc, d) => acc + (d.strengthMinutes > 0 ? 1 : 0), 0));
    const tr = document.createElement('tr');
    const cells = [
      `Week ${w + 1}`,
      `${weekAvg.mvpa} min/day`,
      `${strengthDays} days`,
      `${weekAvg.screen} min/day`,
      `${weekAvg.longestSed} min`,
      `${weekAvg.balance}/100`,
    ];
    cells.forEach((val) => {
      const td = document.createElement('td');
      td.textContent = val;
      tr.appendChild(td);
    });
    table.appendChild(tr);
  }

  renderFlags(daily);
}

function renderFlags(daily) {
  const flags = document.getElementById('risk-flags');
  flags.innerHTML = '';
  const avg = computeAverages(daily);
  const items = [];
  if (avg.mvpa < 60) items.push({ text: 'Activity deficit most days', level: 'warn' });
  if (avg.longestSed > 120) items.push({ text: 'Unbroken sitting frequently > 2 hours', level: 'bad' });
  if (daily[daily.length - 1].fitness < daily[0].fitness) items.push({ text: 'Fitness index declining across weeks', level: 'warn' });
  if (avg.eye > 60) items.push({ text: 'Eye strain risk elevated by long screen streaks', level: 'warn' });
  if (items.length === 0) items.push({ text: 'Nice balance: movement and breaks protect comfort.', level: 'good' });

  items.forEach((flag) => {
    const div = document.createElement('div');
    div.className = `flag ${flag.level === 'bad' ? 'bad' : flag.level === 'warn' ? 'warn' : ''}`;
    div.textContent = flag.text;
    flags.appendChild(div);
  });
}

function renderComparisons(scenarios) {
  const container = document.getElementById('comparison');
  container.innerHTML = '';
  const cards = [
    { title: 'Scenario A: Current deal', data: simulateScenario(scenarios.base) },
    { title: 'Scenario B: Balanced plan', data: simulateScenario(scenarios.balanced) },
    { title: 'Scenario C: Holiday drift', data: simulateScenario(scenarios.drift) },
  ];
  cards.forEach((card) => {
    const div = document.createElement('div');
    div.className = 'compare-card';
    div.innerHTML = `<h4>${card.title}</h4>`;
    const rows = [
      ['Balance score', `${card.data.balance}/100`],
      ['MVPA', `${card.data.mvpa} min/day`],
      ['Recreational screen', `${card.data.screen} min/day`],
      ['Longest sit', `${card.data.longestSed} min`],
      ['Fitness trend', `${card.data.fitness} → ${card.data.fitnessNext}`],
      ['Eye strain risk', `${card.data.eye}/100`],
    ];
    rows.forEach(([label, value]) => {
      const row = document.createElement('div');
      row.className = 'compare-row';
      row.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
      div.appendChild(row);
    });
    container.appendChild(div);
  });
}

function simulateScenario({ schedule: sched, settings = {} }) {
  const baseFitness = settings.baseFitness || Number(document.getElementById('fitness').value);
  const day = computeDailyMetrics(sched, {
    compliance: settings.compliance || Number(document.getElementById('compliance').value),
    breakRule: settings.breakRule || 60,
    ergonomics: settings.ergonomics || document.getElementById('ergonomics').value,
    outdoors: settings.outdoors || document.getElementById('outdoors').value,
    social: settings.social || document.getElementById('social').value,
    handIn: settings.handIn ?? document.getElementById('device-handin').checked,
    activeGaming: settings.activeGaming ?? document.getElementById('active-gaming').checked,
  });
  const fitnessNext = clamp(baseFitness + 0.05 * day.mvpaMinutes + 0.03 * day.strengthMinutes - 0.01 * day.sedentaryMinutes - 0.04 * day.mvpaDeficit, 0, 100);
  return {
    mvpa: day.mvpaMinutes,
    screen: day.screenMinutes,
    longestSed: day.longestSedentary,
    balance: day.balanceScore,
    fitness: baseFitness,
    fitnessNext,
    eye: day.eyeStrain,
  };
}

function buildBalancedScenario() {
  const balancedSchedule = presets.balanced();
  return {
    schedule: balancedSchedule,
    settings: {
      breakRule: 60,
      compliance: 85,
      ergonomics: 'ok',
      outdoors: document.getElementById('outdoors').value,
      social: document.getElementById('social').value,
      handIn: true,
      activeGaming: true,
      baseFitness: Number(document.getElementById('fitness').value),
    }
  };
}

function buildDriftScenario() {
  const driftSchedule = presets.drift();
  return {
    schedule: driftSchedule,
    settings: {
      breakRule: 'none',
      compliance: 45,
      ergonomics: 'poor',
      outdoors: 'low',
      social: 'low',
      handIn: false,
      activeGaming: false,
      baseFitness: Number(document.getElementById('fitness').value),
    }
  };
}

function exportScenario() {
  const config = {
    weeks: Number(document.getElementById('weeks').value),
    compliance: Number(document.getElementById('compliance').value),
    baselineFitness: Number(document.getElementById('fitness').value),
    breakRule: document.getElementById('break-rule').value,
    ergonomics: document.getElementById('ergonomics').value,
    outdoors: document.getElementById('outdoors').value,
    social: document.getElementById('social').value,
    handIn: document.getElementById('device-handin').checked,
    activeGaming: document.getElementById('active-gaming').checked,
  };
  const output = document.getElementById('export-output');
  output.value = JSON.stringify({ schedule, config }, null, 2);
  output.select();
}

function attachControls() {
  document.getElementById('weeks').addEventListener('input', (e) => {
    document.getElementById('weeks-value').textContent = e.target.value;
    runSimulation();
  });
  document.getElementById('compliance').addEventListener('input', (e) => {
    document.getElementById('compliance-value').textContent = `${e.target.value}%`;
    runSimulation();
  });
  document.getElementById('fitness').addEventListener('input', (e) => {
    document.getElementById('fitness-value').textContent = e.target.value;
    runSimulation();
  });
  ['break-rule', 'ergonomics', 'outdoors', 'social', 'device-handin', 'active-gaming'].forEach((id) => {
    document.getElementById(id).addEventListener('change', runSimulation);
  });
  document.getElementById('clear-schedule').addEventListener('click', () => {
    schedule = Array(96).fill('unallocated');
    updateGridColors();
    runSimulation();
  });
  document.getElementById('export-scenario').addEventListener('click', exportScenario);
  document.getElementById('preset-current').addEventListener('click', () => {
    schedule = presets.current();
    updateGridColors();
    runSimulation();
  });
  document.getElementById('preset-balanced').addEventListener('click', () => {
    schedule = presets.balanced();
    document.getElementById('break-rule').value = '60';
    updateGridColors();
    runSimulation();
  });
  document.getElementById('preset-drift').addEventListener('click', () => {
    schedule = presets.drift();
    document.getElementById('break-rule').value = 'none';
    updateGridColors();
    runSimulation();
  });
}

function init() {
  renderLegend();
  renderActivitySelect();
  renderGrid();
  attachControls();
  runSimulation();
}

document.addEventListener('DOMContentLoaded', init);
