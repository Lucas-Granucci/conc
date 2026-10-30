import { words } from './analysis.js';

// A pattern matches an entire token; '*' represents zero or more characters.
export function parseTerms(input) {
  const terms = [...new Set(input.split(/\r?\n/).map(s => s.trim().toLowerCase()).filter(Boolean))];
  for (const term of terms) {
    if (!/^[\p{L}\p{N}*]+(?:['’-][\p{L}\p{N}*]+)*$/u.test(term) || !/[\p{L}\p{N}]/u.test(term)) {
      throw new Error(`“${term}” is not a word pattern. Use one word per line, with optional * wildcards.`);
    }
  }
  return terms;
}

export function batchCounts(files, input) {
  const terms = parseTerms(input);
  const patterns = terms.map(term => new RegExp('^' + term.split('*').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$', 'u'));
  const sources = files.map((file, i) => ({id: file.id ?? i, name: file.name, tokens: words(file.text)}));
  const scopes = [{id: 'combined', name: 'All files combined', tokens: sources.flatMap(s => s.tokens)}, ...sources];
  return countScopes(scopes, terms, patterns);
}

export function compareCorpora(corpora, input) {
  const terms = parseTerms(input);
  const patterns = terms.map(term => new RegExp('^' + term.split('*').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$', 'u'));
  const scopes = corpora.map(corpus => ({id: corpus.id, name: corpus.name, tokens: corpus.files.flatMap(file => words(file.text))}));
  return countScopes(scopes, terms, patterns);
}

function countScopes(scopes, terms, patterns) {
  const rows = [], totals = [];
  for (const scope of scopes) {
    const frequencies = new Map();
    for (const token of scope.tokens) frequencies.set(token, (frequencies.get(token) || 0) + 1);
    const matched = new Set();
    terms.forEach((term, i) => {
      const forms = [...frequencies].filter(([word]) => patterns[i].test(word));
      forms.forEach(([word]) => matched.add(word));
      const count = forms.reduce((sum, [, count]) => sum + count, 0);
      rows.push({term, scopeId: scope.id, corpus: scope.name, words: scope.tokens.length, count, per1000: scope.tokens.length ? count / scope.tokens.length * 1000 : 0, percent: scope.tokens.length ? count / scope.tokens.length * 100 : 0, forms: forms.map(([word]) => word).sort()});
    });
    const count = [...matched].reduce((sum, word) => sum + frequencies.get(word), 0);
    totals.push({scopeId: scope.id, corpus: scope.name, words: scope.tokens.length, count, per1000: scope.tokens.length ? count / scope.tokens.length * 1000 : 0, percent: scope.tokens.length ? count / scope.tokens.length * 100 : 0});
  }
  return {terms, rows, totals};
}

export function batchCSV(report) {
  const headers = ['term', 'scope', 'scope_id', 'total_words', 'raw_count', 'per_1000_words', 'percent', 'matched_forms'];
  const values = r => [r.corpus, r.scopeId, r.words, r.count, r.per1000, r.percent];
  return '\ufeff' + [headers, ...report.rows.map(r => [r.term, ...values(r), r.forms.join('; ')]), ...report.totals.map(r => ['TOTAL (unique matched tokens)', ...values(r), ''])].map(row => row.map(v => '"' + String(v).replaceAll('"', '""') + '"').join(',')).join('\r\n');
}
