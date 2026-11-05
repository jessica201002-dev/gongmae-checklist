// Design Ref: §9 — 비밀번호는 원래 값을 저장하지 않고 암호화(해시)해서만 저장한다.
// Node에 들어 있는 scrypt를 쓴다(별도 부품 없음). 서버 코드와 샘플 계정 스크립트에서 쓴다.
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const N = 16384;
const R = 8;
const P = 1;
const KEY_LEN = 64;

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LEN, { N, r: R, p: P }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

/** 비밀번호를 "scrypt$N$r$p$소금$해시" 형태의 글자로 바꾼다. 같은 비밀번호도 매번 다른 글자가 나온다 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

/** 입력한 비밀번호가 저장된 해시와 맞는지. 맞지 않거나 해시 모양이 이상하면 false */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, keyB64] = parts;
  if (Number(n) !== N || Number(r) !== R || Number(p) !== P) return false;
  const expected = Buffer.from(keyB64, "base64");
  const actual = await derive(password, Buffer.from(saltB64, "base64"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
