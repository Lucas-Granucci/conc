export const words = text => text.toLowerCase().match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || [];
export function concordance(files, query, {regex=false,caseSensitive=false,whole=false,span=65}={}) {
 if(!query) return [];
 const escaped=query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const pattern=whole?`(?<![\\p{L}\\p{N}_])(?:${regex?query:escaped})(?![\\p{L}\\p{N}_])`:(regex?query:escaped);
 const re=new RegExp(pattern,caseSensitive?'gu':'giu');
 return files.flatMap(file=>Array.from(file.text.matchAll(re)).filter(m=>m[0].length).map(m=>({file:file.name,fileId:file.id,index:m.index,left:file.text.slice(Math.max(0,m.index-span),m.index).replace(/\s+/g,' '),hit:m[0],right:file.text.slice(m.index+m[0].length,m.index+m[0].length+span).replace(/\s+/g,' ')})));
}
export function frequency(files,n=1){const counts=new Map();for(const file of files){const tokens=words(file.text);for(let i=0;i<=tokens.length-n;i++){const term=tokens.slice(i,i+n).join(' ');counts.set(term,(counts.get(term)||0)+1)}}return [...counts].map(([term,count])=>({term,count})).sort((a,b)=>b.count-a.count||a.term.localeCompare(b.term));}
export function collocates(files,query){const counts=new Map();for(const f of files){const t=words(f.text);for(let i=0;i<t.length;i++)if(t[i]===query.toLowerCase())for(let j=Math.max(0,i-5);j<=Math.min(t.length-1,i+5);j++)if(j!==i)counts.set(t[j],(counts.get(t[j])||0)+1)}return [...counts].map(([term,count])=>({term,count})).sort((a,b)=>b.count-a.count);}
