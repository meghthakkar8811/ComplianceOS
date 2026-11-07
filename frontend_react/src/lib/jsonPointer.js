// RFC 6901 JSON Pointer get/set, framework-free.
//
// Pointers address a value by a sequence of '/'-separated tokens, each with '~1' decoded to '/'
// and '~0' decoded to '~'. The empty string "" is the root pointer and addresses the whole
// document. A numeric token addresses an array element by index; '-' addresses the (nonexistent)
// member past the end of an array, used to append.

function decodeToken(token) {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

function parsePointer(pointer) {
  if (pointer === '' || pointer === undefined || pointer === null) return [];
  if (pointer.charAt(0) !== '/') {
    throw new Error(`Invalid JSON Pointer: ${pointer}`);
  }
  return pointer.split('/').slice(1).map(decodeToken);
}

function isArrayIndexToken(token) {
  return /^(0|[1-9]\d*|-)$/.test(token);
}

/** Reads the value a pointer addresses in `obj`, or `undefined` if any segment along the way is missing. */
export function getValueByPointer(obj, pointer) {
  const tokens = parsePointer(pointer);
  let current = obj;
  for (const token of tokens) {
    if (current === undefined || current === null) return undefined;
    if (Array.isArray(current)) {
      const index = token === '-' ? current.length : Number(token);
      current = Number.isInteger(index) ? current[index] : undefined;
    } else if (typeof current === 'object') {
      current = current[token];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Returns a new document with the value at `pointer` set to `value`, cloning every object/array
 * along the path instead of mutating `obj`. A missing intermediate segment is created as an
 * array when its own token looks like an array index, an object otherwise. The root pointer ""
 * replaces the whole document with `value`.
 */
export function setValueByPointer(obj, pointer, value) {
  const tokens = parsePointer(pointer);
  if (tokens.length === 0) {
    return value;
  }
  return setAtTokens(obj, tokens, value);
}

function setAtTokens(node, tokens, value) {
  const [token, ...rest] = tokens;
  const nextIsArray = Array.isArray(node) || (node === undefined || node === null) && isArrayIndexToken(token);

  if (nextIsArray) {
    const arr = Array.isArray(node) ? node.slice() : [];
    const index = token === '-' ? arr.length : Number(token);
    arr[index] = rest.length === 0 ? value : setAtTokens(arr[index], rest, value);
    return arr;
  }

  const obj = node !== null && typeof node === 'object' ? { ...node } : {};
  obj[token] = rest.length === 0 ? value : setAtTokens(obj[token], rest, value);
  return obj;
}
