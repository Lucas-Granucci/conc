export const metrics = {per1000: 'Hits per 1,000 words', count: 'Raw hits', percent: 'Percent of words'};
const xml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));

// Round the axis up to evenly spaced 1, 2 or 5 × 10^n ticks.
export function chartScale(max, integer = false) {
  if (!(max > 0)) max = 1;
  const rough = max / 5;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  let step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  if (integer) step = Math.max(1, step);
  const intervals = Math.ceil(Number((max / step).toPrecision(12)));
  const ticks = Array.from({length: intervals + 1}, (_, i) => Number((i * step).toPrecision(12)));
  return {max: ticks.at(-1), step, ticks};
}

export function graphTSV(report, metric = 'per1000') {
  const columns = [metric, ...Object.keys(metrics).filter(key => key !== metric)];
  // Corpus titles are text, never spreadsheet formulas. Keep each title in one cell.
  const titleCell = title => {
    const value = String(title).replace(/[\t\r\n]+/g, ' ');
    const safe = /^[\s]*[=+\-@]/.test(value) ? "'" + value : value;
    return safe.includes('"') ? '"' + safe.replaceAll('"', '""') + '"' : safe;
  };
  return [['Corpus', ...columns.map(key => metrics[key]), 'Total words'], ...report.totals.map(row => [titleCell(row.corpus), ...columns.map(key => row[key]), row.words])].map(row => row.join('\t')).join('\n');
}

export function comparisonChart(report, metric = 'per1000') {
  const corpora = report.totals;
  const scale = chartScale(Math.max(0, ...corpora.map(row => row[metric])), metric === 'count');
  const left = 260, plotWidth = 600, top = 113, rowHeight = 66;
  const bottom = top + Math.max(1, corpora.length) * rowHeight;
  const height = bottom + 88;
  const precision = Math.max(0, -Math.floor(Math.log10(scale.step)));
  const formatTick = value => value.toLocaleString('en-US', {maximumFractionDigits: precision}) + (metric === 'percent' ? '%' : '');
  const formatValue = value => value.toLocaleString('en-US', {maximumFractionDigits: metric === 'count' ? 0 : 3}) + (metric === 'percent' ? '%' : '');
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="${height}" viewBox="0 0 1000 ${height}" role="img" aria-labelledby="graph-title graph-description"><title id="graph-title">Total list hits by corpus</title><desc id="graph-description">${xml(metrics[metric])}. One bar per corpus. Matching tokens are counted once, even if patterns overlap.</desc><rect width="1000" height="${height}" rx="10" fill="#fff"/><g font-family="Arial, sans-serif" fill="#26342e"><text x="32" y="39" font-size="23" font-weight="bold">Total list hits by corpus</text><text x="32" y="66" font-size="13" fill="#647168">${report.terms.length} patterns · Unique matching tokens across all files in each corpus</text><text x="${left}" y="${top-19}" font-size="12" fill="#647168">${xml(metrics[metric])}</text>`;
  for (const tick of scale.ticks) {
    const x = left + tick / scale.max * plotWidth;
    svg += `<g class="axis-tick"><line x1="${x}" x2="${x}" y1="${top}" y2="${bottom}" stroke="${tick === 0 ? '#b1beb5' : '#e8ede9'}"/><text x="${x}" y="${bottom+25}" font-size="12" text-anchor="middle" fill="#647168">${xml(formatTick(tick))}</text></g>`;
  }
  corpora.forEach((corpus, i) => {
    const y = top + i * rowHeight + 12;
    const value = corpus[metric];
    const width = value / scale.max * plotWidth;
    const shortName = corpus.corpus.length > 29 ? corpus.corpus.slice(0, 27) + '…' : corpus.corpus;
    svg += `<g class="corpus-bar"><title>${xml(corpus.corpus)}: ${xml(formatValue(value))}; ${corpus.count} hits / ${corpus.words} words</title><text x="32" y="${y+14}" font-size="14" font-weight="bold">${xml(shortName)}</text><text x="32" y="${y+33}" font-size="12" fill="#647168">${corpus.words.toLocaleString('en-US')} words</text><rect x="${left}" y="${y}" width="${width}" height="29" rx="3" fill="#34785b"/><text x="${left+width+10}" y="${y+20}" font-size="14" font-weight="bold">${xml(formatValue(value))}</text></g>`;
  });
  return svg + `<text x="32" y="${height-22}" font-size="11" fill="#78837c">conc · List totals count overlapping matches only once. Axis starts at zero.</text></g></svg>`;
}
