export const metrics = {per1000: 'Hits per 1,000 words', count: 'Raw hits', percent: 'Percent of words'};
const colors = ['#34785b', '#577fc3', '#b36b37', '#936bb3', '#bd526b', '#278893', '#837c2d', '#59646d'];
const xml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function comparisonChart(report, metric = 'per1000', totals = false) {
  const groups = totals ? ['Total unique hits'] : report.terms;
  const corpora = report.totals;
  const values = totals ? report.totals : report.rows;
  const max = Math.max(0, ...values.map(row => row[metric]));
  const scaleMax = metric === 'count' ? Math.max(4, Math.ceil(max/4)*4) : max || 1;
  const legendHeight = corpora.length * 24;
  const groupHeight = corpora.length * 29 + 35;
  const top = 90 + legendHeight;
  const height = top + groups.length * groupHeight + 65;
  const left = 195, width = 620;
  const format = value => metric === 'count' ? String(value) : value.toFixed(3) + (metric === 'percent' ? '%' : '');
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="${height}" viewBox="0 0 960 ${height}" role="img" aria-label="${xml(totals?'Total list hits':'Word-pattern comparison')} — ${xml(metrics[metric])}"><rect width="960" height="${height}" fill="#ffffff"/><g font-family="Arial, sans-serif" fill="#28382d"><text x="28" y="34" font-size="21" font-weight="bold">${totals?'Total list hits':'Word-pattern comparison'}</text><text x="28" y="59" font-size="13" fill="#5d6b60">${xml(metrics[metric])} · Each corpus combines all its files</text>`;
  corpora.forEach((corpus, i) => {svg += `<rect x="28" y="${77+i*24}" width="11" height="11" rx="2" fill="${colors[i%colors.length]}"/><text x="47" y="${87+i*24}" font-size="12">${xml(corpus.corpus.length>85?corpus.corpus.slice(0,82)+'…':corpus.corpus)} · ${corpus.words.toLocaleString('en-US')} words</text>`;});
  for(let i=0;i<=4;i++) {const x=left+i*width/4;svg+=`<line x1="${x}" x2="${x}" y1="${top-7}" y2="${height-49}" stroke="#e7ece6"/><text x="${x}" y="${height-24}" font-size="11" text-anchor="middle" fill="#69776a">${xml(format(scaleMax*i/4))}</text>`;}
  groups.forEach((group, gi) => {
    const y = top + gi * groupHeight;
    const short = group.length > 25 ? group.slice(0,23)+'…' : group;
    svg += `<text x="28" y="${y+16}" font-size="13" font-weight="bold"><title>${xml(group)}</title>${xml(short)}</text>`;
    corpora.forEach((corpus, ci) => {
      const row = totals ? corpus : report.rows.find(row => row.scopeId === corpus.scopeId && row.term === group);
      const value = row?.[metric] || 0, barY=y+ci*29, barWidth=value/scaleMax*width;
      svg += `<g><title>${xml(group)} — ${xml(corpus.corpus)}: ${xml(format(value))}; ${row?.count||0} hits / ${corpus.words} words</title><rect x="${left}" y="${barY}" width="${barWidth}" height="19" rx="2" fill="${colors[ci%colors.length]}"/><text x="${left+barWidth+8}" y="${barY+14}" font-size="12">${xml(format(value))}</text></g>`;
    });
  });
  return svg + '</g></svg>';
}
