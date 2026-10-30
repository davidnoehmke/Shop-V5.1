// Split migration statements without splitting strings, comments or function bodies.
export function statements(sql) {
  const result = [];
  let start = 0;
  const tokens = /--[^\n]*|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|("(?:""|[^"])*")|(\$(?:[a-zA-Z_]\w*)?\$)[\s\S]*?\2|;/g;
  let clean = '';
  for (const match of sql.matchAll(tokens)) {
    clean += sql.slice(start, match.index);
    const token = match[0];
    if (token === ';') {
      if (clean.trim()) result.push(clean.trim() + ';');
      clean = '';
    } else if (token.startsWith('--') || token.startsWith('/*')) {
      clean += ' ';
    } else clean += token;
    start = match.index + token.length;
  }
  clean += sql.slice(start);
  if (clean.trim()) result.push(clean.trim());
  return result;
}
