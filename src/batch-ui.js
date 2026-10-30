import { compareCorpora, batchCSV } from './batch.js';
import { words } from './analysis.js';
import { comparisonChart, metrics, graphTSV } from './charts.js';
const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let draft = 'may\nmight\ncould\nwould\nshould\nseem*\nappear*\nbelieve*\nassume*\nsu';
let submitted = draft;
let metric = 'per1000';
let newTitle = '';
function download(contents, type, filename) {
  const url = URL.createObjectURL(new Blob([contents], {type}));
  const link = document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function renderBatch(container, corpora, onChange) {
  container.innerHTML = `<section class="batch-panel"><h1>Compare corpora</h1><p>One result per named corpus, combining all its files. Add another corpus to compare your word list side by side.</p><div class="corpus-manager"><h2>Your corpora</h2><div class="corpus-cards">${corpora.map(c => `<div class="corpus-card"><label>Corpus title<input data-corpus-title="${escape(c.id)}" value="${escape(c.name)}" maxlength="100"></label><span>${c.files.length} files · ${c.files.reduce((n,f)=>n+words(f.text).length,0).toLocaleString()} words${c.sample?' · Sample':''}</span><button class="link" data-remove-corpus="${escape(c.id)}">Remove corpus</button></div>`).join('')}</div><form id="add-corpus-form"><h3>Add another corpus</h3><label for="new-corpus-title">Corpus title</label><input id="new-corpus-title" required maxlength="100" value="${escape(newTitle)}" placeholder="e.g. Student essays"><label for="new-corpus-files">Text files for this corpus</label><input id="new-corpus-files" type="file" multiple required accept=".txt,.text,.md,.csv"><p>Choose all files belonging to this corpus. You can add more files later using the sidebar. Data stays in this browser session.</p><button class="primary" type="submit">Add corpus</button><p id="corpus-error" role="alert"></p></form></div><form id="batch-form"><label for="batch-terms">Words or patterns, one per line</label><textarea id="batch-terms" rows="8" spellcheck="false" aria-describedby="batch-help">${escape(draft)}</textarea><p id="batch-help">Case-insensitive, whole-word matching. <code>seem*</code> matches seem, seems, seemed… <code>su</code> matches only su; use <code>su*</code> for prefixes. Duplicate lines count once.</p><button class="primary" type="submit">Analyze corpora</button></form><div id="batch-results" aria-live="polite"></div></section>`;
  container.querySelectorAll('[data-corpus-title]').forEach(input=>{input.oninput=()=>input.setCustomValidity('');input.onchange=()=>{
    const title=input.value.trim();
    if(!title){input.setCustomValidity('Enter a corpus title.');input.reportValidity();return;}
    const corpus=corpora.find(c=>String(c.id)===input.dataset.corpusTitle);corpus.name=title;onChange();
  };});
  container.querySelectorAll('[data-remove-corpus]').forEach(button=>button.onclick=()=>{
    const corpus=corpora.find(c=>String(c.id)===button.dataset.removeCorpus);
    if(confirm(`Remove “${corpus.name}” and its files from this session?`)){corpora.splice(corpora.indexOf(corpus),1);onChange();}
  });
  container.querySelector('#new-corpus-title').oninput=e=>newTitle=e.target.value;
  container.querySelector('#add-corpus-form').onsubmit=async e=>{
    e.preventDefault();
    const form=e.currentTarget, button=form.querySelector('button'), title=form.querySelector('#new-corpus-title').value.trim();
    const incoming=Array.from(form.querySelector('#new-corpus-files').files);
    const error=form.querySelector('#corpus-error');
    if(!title||!incoming.length){error.textContent='Enter a title and choose at least one text file.';return;}
    if(incoming.some(f=>f.size>10*1024*1024)){error.textContent='Please use files smaller than 10 MB each.';return;}
    button.disabled=true;button.textContent='Reading files…';
    try {
      const added=await Promise.all(incoming.map(async file=>({id:crypto.randomUUID(),name:file.name,text:await file.text()})));
      // Replace only the untouched demo corpus, never an uploaded corpus.
      if(corpora.length===1&&corpora[0].sample)corpora.splice(0,1);
      const corpus={id:crypto.randomUUID(),name:title,files:added,sample:false};corpora.push(corpus);newTitle='';onChange(corpus.id);
    } catch {error.textContent='Could not read these files. Please try UTF-8 text files.';button.disabled=false;button.textContent='Add corpus';}
  };
  const input=container.querySelector('#batch-terms');input.oninput=()=>draft=input.value;
  container.querySelector('#batch-form').onsubmit=e=>{e.preventDefault();submitted=input.value;draw();};
  function draw(){
    const result=container.querySelector('#batch-results');let report;
    try{report=compareCorpora(corpora,submitted);}catch(error){result.innerHTML=`<p class="batch-error" role="alert">${escape(error.message)}</p>`;return;}
    if(!corpora.length){result.innerHTML='<p class="empty">Add a named corpus above to start comparing.</p>';return;}
    if(!report.terms.length){result.innerHTML='<p class="empty">Paste at least one word or pattern, then select Analyze corpora.</p>';return;}
    const cells=r=>`<td>${escape(r.corpus)}</td><td>${r.words.toLocaleString()}</td><td>${r.count.toLocaleString()}</td><td>${r.per1000.toFixed(3)}</td><td>${r.percent.toFixed(3)}%</td>`;
    result.innerHTML=`<div class="results-toolbar"><strong>${report.terms.length} patterns · ${corpora.length} corpora</strong><button id="batch-export" class="export">Export CSV</button></div><div class="chart-heading"><div><h2>Compare counts</h2><p>One bar per corpus for the whole list. Rates per 1,000 words account for different corpus sizes.</p></div><label>Graph metric <select id="chart-metric">${Object.entries(metrics).map(([key,label])=>`<option value="${key}" ${key===metric?'selected':''}>${label}</option>`).join('')}</select></label></div><div class="comparison-chart" id="totals-chart">${comparisonChart(report,metric)}</div><div class="graph-actions"><button class="export" id="copy-graph-data">Copy graph data</button><button class="export" id="download-totals-chart">Download graph (SVG)</button><span id="copy-status" role="status"></span></div><div id="copy-fallback" hidden><label for="graph-data-text">Copy the selected data with Ctrl+C or ⌘C, then paste into your spreadsheet.</label><textarea id="graph-data-text" readonly rows="6" spellcheck="false"></textarea></div><h2>Corpus totals</h2><p>All files in each corpus are combined. Each matching token counts once here, even when patterns overlap. Rates use the whole corpus word count.</p><div class="table-wrap"><table class="batch-table"><thead><tr><th>Corpus</th><th>Total words</th><th>Raw hits</th><th>Per 1,000 words</th><th>Percent</th></tr></thead><tbody>${report.totals.map(r=>`<tr>${cells(r)}</tr>`).join('')}</tbody></table></div><h2>Hits by word or pattern</h2><p>Counts cover the entire named corpus, with no per-file breakdown. Individual patterns are independent; overlapping patterns may match the same token.</p><div class="table-wrap"><table class="batch-table"><thead><tr><th>Pattern</th><th>Corpus</th><th>Total words</th><th>Raw hits</th><th>Per 1,000 words</th><th>Percent</th><th>Matched forms</th></tr></thead><tbody>${report.terms.flatMap(term=>report.rows.filter(r=>r.term===term)).map(r=>`<tr><th scope="row">${escape(r.term)}</th>${cells(r)}<td>${r.forms.length?escape(r.forms.join(', ')):'—'}</td></tr>`).join('')}</tbody></table></div>`;
    result.querySelector('#chart-metric').onchange=e=>{metric=e.target.value;draw();};
    result.querySelector('#batch-export').onclick=()=>download(batchCSV(report),'text/csv;charset=utf-8','conc-corpus-comparison.csv');
    result.querySelector('#download-totals-chart').onclick=()=>download(comparisonChart(report,metric),'image/svg+xml','conc-corpus-totals.svg');
    result.querySelector('#copy-graph-data').onclick=async e=>{
      const button=e.currentTarget, status=result.querySelector('#copy-status');
      const data=graphTSV(report,metric);
      button.disabled=true;
      try{
        if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(data);
        status.textContent=`Copied ${report.totals.length} ${report.totals.length===1?'corpus':'corpora'} — paste into Sheets or Excel.`;
        result.querySelector('#copy-fallback').hidden=true;
      }catch{
        result.querySelector('#copy-fallback').hidden=false;
        const text=result.querySelector('#graph-data-text');text.value=data;text.focus();text.select();
        status.textContent='Clipboard access is unavailable. Copy the selected data below.';
      }finally{button.disabled=false;}
    };
  }
  draw();
}
