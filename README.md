# conc

A minimal, browser-based corpus analysis app inspired by AntConc. All analysis runs locally; text files are not sent to a server. Uploaded files live only for the current browser session. Six sample documents are included.

## Develop

Requires Node.js 20.19+ or 22.12+.

```sh
npm ci --cache /tmp/conc-npm-cache
npm run dev -- --port 5173
```

## Validate and build

```sh
npm test
npm run build
npm run preview
```

Features: keyword-in-context concordance with literal/regex, case and whole-word search; context sorting and pagination; concordance plots; word frequencies; 2–5 word n-grams; collocates within a five-token window; source text viewing; and CSV export. Click concordance rows to view their source or frequency rows to search a term. Add UTF-8 `.txt`, `.text`, `.md`, or `.csv` files (10 MB maximum per file). CSV files are analyzed as plain text.

This independent implementation covers core exploratory analysis, not full AntConc feature parity. It does not include reference-corpus keyness, statistical association scores, lemmatization, or PDF extraction.
