import { batchCounts, batchCSV } from './batch.js';
const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let draft = 'may\nmight\ncould\nwould\nshould\nseem*\nappear*\nbelieve*\nassume*\nsu';
let submitted = draft;
let scope = 'all';
export function renderBatch(container, files) {
  container.innerHTML = `<section class="batch-panel"><h1>Word-list analysis</h1><p>Compare a list of words across every text and the combined corpus.</p><form id="batch-form"><label for="batch-terms">Words or patterns, one per line</label><textarea id="batch-terms" rows="8" spellcheck="false" aria-describedby="batch-help">${escape(draft)}</textarea><p id="batch-help">Case-insensitive, whole-word matching. <code>seem*</code> matches seem, seems, seemed… <code>su</code> matches only su; use <code>su*</code> for prefixes. Duplicate lines count once.</p><button class="primary" type="submit">Analyze all files</button></form><div id="batch-results" aria-live="polite"></div></section>`;
  const input = container.querySelector('#batch-terms');
  input.oninput = () => draft = input.value;
  container.querySelector('#batch-form').onsubmit = e => {e.preventDefault(); submitted = input.value; draw();};
  function draw() {
    const result = container.querySelector('#batch-results');
    let report;
    try {report = batchCounts(files, submitted);} catch (error) {result.innerHTML = `<p class="batch-error" role="alert">${escape(error.message)}</p>`; return;}
    if (!report.terms.length) {result.innerHTML = '<p class="empty">Paste at least one word or pattern, then select Analyze all files.</p>';return;}
    const filtered = scope === 'combined' ? report.rows.filter(r => r.scopeId === 'combined') : report.rows;
    const summaries = scope === 'combined' ? report.totals.filter(r => r.scopeId === 'combined') : report.totals;
    const cells = r => `<td>${escape(r.corpus)}</td><td>${r.words.toLocaleString()}</td><td>${r.count.toLocaleString()}</td><td>${r.per1000.toFixed(3)}</td><td>${r.percent.toFixed(3)}%</td>`;
    result.innerHTML = `<div class="results-toolbar"><strong>${report.terms.length} patterns · ${files.length} files</strong><div><label>Show <select id="batch-scope"><option value="all" ${scope==='all'?'selected':''}>All files + combined</option><option value="combined" ${scope==='combined'?'selected':''}>Combined only</option></select></label><button id="batch-export" class="export">Export CSV</button></div></div><h2>List totals</h2><p>Each matching token counts once here, even when patterns overlap. Combined rates use the total word count, not an average of file rates.</p><div class="table-wrap"><table class="batch-table"><thead><tr><th>Corpus / file</th><th>Total words</th><th>Raw count</th><th>Per 1,000 words</th><th>Percent</th></tr></thead><tbody>${summaries.map(r => `<tr>${cells(r)}</tr>`).join('')}</tbody></table></div><h2>Counts by word or pattern</h2><p>Each uploaded file is compared separately. Patterns are independent, so overlapping patterns can match the same token. CSV includes all files and unrounded rates.</p><div class="table-wrap"><table class="batch-table"><thead><tr><th>Pattern</th><th>Corpus / file</th><th>Total words</th><th>Raw count</th><th>Per 1,000 words</th><th>Percent</th><th>Matched forms</th></tr></thead><tbody>${filtered.map(r => `<tr><th scope="row">${escape(r.term)}</th>${cells(r)}<td>${r.forms.length?escape(r.forms.join(', ')):'—'}</td></tr>`).join('')}</tbody></table></div>`;
    result.querySelector('#batch-scope').onchange = e => {scope = e.target.value; draw();};
    result.querySelector('#batch-export').onclick = () => {
      const url = URL.createObjectURL(new Blob([batchCSV(report)], {type:'text/csv;charset=utf-8'}));
      const link = document.createElement('a');link.href = url;link.download = 'conc-word-list-analysis.csv';link.click();setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
  }
  draw();
}
