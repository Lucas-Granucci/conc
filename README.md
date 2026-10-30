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

## GitHub Pages

The app is configured for https://lucas-granucci.github.io/conc/.
In repository **Settings → Pages**, choose **GitHub Actions** as the build and deployment source. The `Deploy to GitHub Pages` workflow tests, builds, and deploys on pushes to `main`; it can also be run manually from the Actions tab. The Vite base path is `/conc/` so bundled assets resolve under the project URL.

## Batch word-list analysis

Open **Word-list analysis** (the default view) and add a named corpus. Select all UTF-8 text files belonging to that corpus in one upload. Add another named corpus to compare it; every corpus keeps its files separate. The untouched demo corpus is replaced on your first named-corpus upload. Rename or remove corpora in this view. Use the sidebar's **Active corpus** selector to choose the corpus for concordance, word lists, and the other tools; **Add files** appends files to that corpus.

Paste one word or wildcard pattern per line and select **Analyze corpora**. For example:

```text
may
might
could
would
should
seem*
appear*
believe*
assume*
su
```

Matching is case-insensitive and applies to whole word tokens. `*` matches zero or more characters: `seem*` includes `seem`, `seems`, and `seemed`. `su` matches only the word `su`; use `su*` to match words beginning with those letters. Blank lines and duplicate patterns are ignored. Phrases and regular expressions are not supported in this tool.

Results aggregate all files within each named corpus, with **no per-file breakdown**. Each corpus gets total words, raw hits, hits per 1,000 words, percentages, and matched forms for each pattern. List totals count each matching token once even if patterns overlap. The denominator uses the app's Unicode word tokenizer, including numbers and internally hyphenated or apostrophized words. Rates use the whole corpus word total, not averages of individual file rates. Empty corpora receive zero rates.

Two grouped bar graphs compare corpora: **total unique list hits** and **hits by word/pattern**. Choose raw counts, hits per 1,000 words (default), or percentages. Graphs use a shared zero-based scale within each graph. Hover over bars for exact values and denominators. Download either graph as a standalone SVG for reports, or export all corpus-level results and unrounded rates as CSV. SVG graphs have a white background for sharing and printing.

Corpora, titles, and word lists live only in the current browser session and are lost on reload. Files are never sent to a backend. Duplicate filenames are supported and remain separate files.
