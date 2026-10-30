// Each line is a word or whitespace-separated phrase; wildcards stay within a token.
export function parseTerms(input) {
  const terms = [...new Set(input.split(/\r?\n/).map(s => s.trim().toLowerCase().replace(/\s+/gu, ' ')).filter(Boolean))];
  const wordPattern = /^[\p{L}\p{N}*]+(?:['’-][\p{L}\p{N}*]+)*$/u;
  for (const term of terms) {
    if (!term.split(' ').every(token => wordPattern.test(token) && /[\p{L}\p{N}]/u.test(token))) {
      throw new Error(`“${term}” is not a word or phrase pattern. Use one entry per line, with optional * wildcards within words.`);
    }
  }
  return terms;
}

function prepare(files) {
  return files.map(file => ({
    text: file.text,
    tokens: [...file.text.matchAll(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)].map(match => ({word: match[0].toLowerCase(), start: match.index, end: match.index + match[0].length}))
  }));
}

export function batchCounts(files, input) {
  return countScopes([{id: 'combined', name: 'All files combined', documents: prepare(files)}, ...files.map((file, i) => ({id: file.id ?? i, name: file.name, documents: prepare([file])}))], input);
}

export function compareCorpora(corpora, input) {
  return countScopes(corpora.map(corpus => ({id: corpus.id, name: corpus.name, documents: prepare(corpus.files)})), input);
}

function countScopes(scopes, input) {
  const terms = parseTerms(input);
  const patterns = terms.map(term => term.split(' ').map(token => new RegExp('^' + token.split('*').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$', 'u')));
  const rows = [], totals = [];
  for (const scope of scopes) {
    const wordCount = scope.documents.reduce((sum, doc) => sum + doc.tokens.length, 0);
    const stats = terms.map(() => ({count: 0, forms: new Set()}));
    let uniqueHits = 0;
    for (const {text, tokens} of scope.documents) {
      const intervals = [];
      patterns.forEach((pattern, termIndex) => {
        for (let start = 0; start <= tokens.length - pattern.length; start++) {
          const match = pattern.every((re, offset) => re.test(tokens[start + offset].word) && (offset === 0 || /^\s+$/u.test(text.slice(tokens[start + offset - 1].end, tokens[start + offset].start))));
          if (!match) continue;
          stats[termIndex].count++;
          stats[termIndex].forms.add(tokens.slice(start, start + pattern.length).map(t => t.word).join(' '));
          intervals.push({start, end: start + pattern.length});
        }
      });
      // Count leftmost-longest non-overlapping occurrences for the total list.
      // A nested 'though' inside 'even though' therefore contributes one list hit.
      intervals.sort((a, b) => a.start - b.start || b.end - a.end);
      let end = 0;
      for (const interval of intervals) if (interval.start >= end) {uniqueHits++; end = interval.end;}
    }
    const rate = count => ({words: wordCount, count, per1000: wordCount ? count / wordCount * 1000 : 0, percent: wordCount ? count / wordCount * 100 : 0});
    terms.forEach((term, i) => rows.push({term, scopeId: scope.id, corpus: scope.name, ...rate(stats[i].count), forms: [...stats[i].forms].sort()}));
    totals.push({scopeId: scope.id, corpus: scope.name, ...rate(uniqueHits)});
  }
  return {terms, rows, totals};
}

export function batchCSV(report) {
  const headers = ['term', 'scope', 'scope_id', 'total_words', 'raw_count', 'per_1000_words', 'percent', 'matched_forms'];
  const values = r => [r.corpus, r.scopeId, r.words, r.count, r.per1000, r.percent];
  return '\ufeff' + [headers, ...report.rows.map(r => [r.term, ...values(r), r.forms.join('; ')]), ...report.totals.map(r => ['TOTAL (unique list hits)', ...values(r), ''])].map(row => row.map(v => '"' + String(v).replaceAll('"', '""') + '"').join(',')).join('\r\n');
}
