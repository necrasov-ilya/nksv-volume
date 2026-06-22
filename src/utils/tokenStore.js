import { nanoid } from 'nanoid';

const tokens = new Set();

export function createToken() {
  const token = nanoid(32);
  tokens.add(token);
  return token;
}

export function isValidToken(token) {
  return tokens.has(token);
}

export function revokeToken(token) {
  return tokens.delete(token);
}
