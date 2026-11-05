// Design Ref: §5.5, §10.3 — 샘플(가짜) 로그인 계정 만들기. 시연과 점검에 쓴다.
//
// 사용법 (프로젝트 폴더에서):
//   npm run seed:accounts     샘플 계정을 (다시) 만든다. 비밀번호는 새로 정해진다.
//   node scripts/seed-accounts.mjs --dry-run   표는 건드리지 않고 만들 계정 아이디만 보여 준다.
//
// 안전 규칙
//  - 만드는 계정은 아래 SAMPLE_ACCOUNTS 5개뿐이고, 지우는 것도 같은 아이디의 계정뿐이다.
//  - 비밀번호는 무작위로 만들고, 화면에는 출력하지 않는다. 대신 ".env.sample-accounts" 파일에 적는다.
//    이 파일은 ".env"로 시작하는 이름이라 Git과 Vercel 배포에서 자동으로 제외된다.
//  - DB에는 비밀번호 원문이 아니라 암호화(해시)한 값만 저장한다.
//  - .env의 값은 읽기만 하고 출력하지 않는다.

import { createClient } from "@supabase/supabase-js";
import ts from "typescript";
import { createRequire } from "node:module";
import { randomInt } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRY_RUN = process.argv.slice(2).includes("--dry-run");
const OUTPUT_FILE = path.join(ROOT, ".env.sample-accounts");

// 로그인 아이디(이름이 아닌 임의의 코드), 역할, 담당자 구분값(담당자만)
const SAMPLE_ACCOUNTS = [
  { loginId: "staff01", role: "staff", ownerCode: "담당-01" },
  { loginId: "staff02", role: "staff", ownerCode: "담당-02" },
  { loginId: "staff03", role: "staff", ownerCode: "담당-03" },
  { loginId: "manager01", role: "manager", ownerCode: null },
  { loginId: "director01", role: "director", ownerCode: null },
];

// 헷갈리는 글자(0 O 1 l I)를 뺀 글자로 14자 무작위 비밀번호를 만든다
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
function randomPassword() {
  return Array.from({ length: 14 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

// lib/password.ts를 임시 폴더(node_modules/.cache, Git에 올라가지 않음)에서 JavaScript로 바꿔 불러온다
function loadPasswordLib() {
  const outDir = path.join(ROOT, "node_modules", ".cache", "gongmae-seed-accounts");
  fs.mkdirSync(outDir, { recursive: true });
  const source = fs.readFileSync(path.join(ROOT, "lib", "password.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  fs.writeFileSync(path.join(outDir, "password.js"), outputText);
  const require = createRequire(import.meta.url);
  return { outDir, lib: require(path.join(outDir, "password.js")) };
}

function loadEnv() {
  process.loadEnvFile(path.join(ROOT, ".env"));
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error(".env에 SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다.");
  return { url, key };
}

async function main() {
  console.log(`샘플 계정 ${SAMPLE_ACCOUNTS.length}개 (${DRY_RUN ? "미리 보기" : "저장"}):`);
  for (const a of SAMPLE_ACCOUNTS) {
    console.log(`  - ${a.loginId}  역할=${a.role}  구분값=${a.ownerCode ?? "(없음)"}`);
  }
  if (DRY_RUN) return;

  const { url, key } = loadEnv();
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { outDir, lib } = loadPasswordLib();
  try {
    const rows = [];
    const lines = ["# 샘플(가짜) 계정의 로그인 정보입니다. 이 파일은 Git·배포에서 제외됩니다. 아이디=비밀번호"];
    for (const a of SAMPLE_ACCOUNTS) {
      const password = randomPassword();
      rows.push({
        login_id: a.loginId,
        password_hash: await lib.hashPassword(password),
        role: a.role,
        owner_code: a.ownerCode,
      });
      lines.push(`${a.loginId}=${password}`);
    }

    const ids = SAMPLE_ACCOUNTS.map((a) => a.loginId);
    const del = await db.from("accounts").delete().in("login_id", ids);
    if (del.error) throw new Error(`기존 샘플 계정 삭제 실패: ${del.error.message}`);
    const ins = await db.from("accounts").insert(rows);
    if (ins.error) throw new Error(`샘플 계정 저장 실패: ${ins.error.message}`);

    fs.writeFileSync(OUTPUT_FILE, lines.join("\n") + "\n", { mode: 0o600 });
    console.log(`\n샘플 계정을 저장했습니다. 비밀번호는 화면에 출력하지 않았고, 아래 파일에 있습니다.\n  ${path.basename(OUTPUT_FILE)}`);
  } finally {
    // 임시로 만든 변환 파일은 지우지 않고 둔다(Git에 올라가지 않는 폴더).
    void outDir;
  }
}

main().catch((error) => {
  console.error("오류:", error.message);
  process.exit(1);
});
