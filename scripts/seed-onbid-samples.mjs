// Design Ref: §10.3 — 온비드 가상 조회 시험용 샘플 물건 넣기.
//
// 사용법 (프로젝트 폴더에서):
//   npm run seed:onbid          가상 물건번호(2026-19001-001 같은 연도-공고번호-구분번호)로 물건 6개를 (다시) 만든다. 낙찰일은 비워 두고,
//                               화면에서 "온비드에서 낙찰일 조회"를 눌러 채우도록 한다.
//   npm run seed:onbid:clear    아래 가상 물건번호의 물건만 지운다.
//   node scripts/seed-onbid-samples.mjs --dry-run   표는 건드리지 않고 만들 내용만 보여 준다.
//
// 안전 규칙
//  - 만들고 지우는 것은 lib/onbidMock.ts에 있는 가상 물건번호 6개(와 예전에 쓰던 9001-… 6개)뿐이다. 다른 물건은 건드리지 않는다.
//  - 모두 지어낸 가짜 데이터다. 실제 업무 정보는 넣지 않는다.
//  - .env의 값은 읽기만 하고 출력하지 않는다.

import { createClient } from "@supabase/supabase-js";
import ts from "typescript";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const CLEAR_ONLY = args.has("--clear");

// 예전에 쓰던 가상 물건번호(9001-…). 새 번호 체계로 바꾸면서, 남아 있으면 함께 지운다.
const LEGACY_NUMBERS = [
  "9001-00001-001", "9001-00002-001", "9001-00003-001",
  "9001-00004-001", "9001-00005-001", "9001-00006-001",
  "2026-90001-001", "2026-90001-002", "2025-90002-001",
  "2025-90002-002", "2024-90003-001", "2024-90003-002",
];

// 가상 물건번호별로 맡을 담당자 구분값과 미리 완료해 둘 체크 항목
// (항목 이름표: delivery, benefit, appraisal, area_match, suspension_doc, field_survey)
const done = (...keys) => Object.fromEntries(keys.map((k) => [k, "done"]));
const PLAN = {
  "2026-19001-001": { owner: "담당-01", checks: done("delivery", "benefit") },
  "2026-19001-002": { owner: "담당-02", checks: { ...done("delivery", "appraisal", "area_match"), benefit: "na" } },
  "2025-19002-001": { owner: "담당-03", checks: {} },
  "2025-19002-002": { owner: "담당-01", checks: done("delivery") },
  "2024-19003-001": { owner: "담당-02", checks: done("delivery", "benefit", "appraisal", "area_match", "suspension_doc") },
  "2024-19003-002": { owner: "담당-03", checks: { ...done("delivery", "benefit", "appraisal", "suspension_doc", "field_survey"), area_match: "na" } },
};

// 결재선 확인 표시 시연용: 일부는 담당자·팀장 모두("both"), 일부는 담당자만("staff"), 나머지는 확인 없음
const CONFIRM_PLAN = {
  "2024-19003-002": "both", // 6/6 완료 물건
  "2024-19003-001": "staff",
  "2026-19001-002": "staff",
};
function confirmFields(caseNo, owner) {
  const plan = CONFIRM_PLAN[caseNo];
  if (!plan) return {};
  const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString();
  const fields = { staff_confirmed_at: daysAgo(2), staff_confirmed_by: `staff${owner.slice(-2)}` };
  if (plan === "both") {
    fields.manager_confirmed_at = daysAgo(1);
    fields.manager_confirmed_by = "manager01";
  }
  return fields;
}

// lib/onbidMock.ts(와 그것이 쓰는 파일)를 임시 폴더(node_modules/.cache, Git에 올라가지 않음)에서 JavaScript로 바꿔 불러온다
function loadMock() {
  const outDir = path.join(ROOT, "node_modules", ".cache", "gongmae-seed-onbid");
  fs.mkdirSync(outDir, { recursive: true });
  for (const name of ["onbidMock", "businessDays", "holidays", "deadline", "onbidTypes"]) {
    const source = fs.readFileSync(path.join(ROOT, "lib", `${name}.ts`), "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    fs.writeFileSync(path.join(outDir, `${name}.js`), outputText);
  }
  const require = createRequire(import.meta.url);
  return require(path.join(outDir, "onbidMock.js"));
}

async function main() {
  const mock = loadMock();
  const numbers = mock.ONBID_SAMPLES.map((s) => s.caseNo);
  const missing = numbers.filter((n) => !PLAN[n]);
  if (missing.length > 0) throw new Error(`PLAN에 없는 가상 물건번호가 있습니다: ${missing.join(", ")}`);

  console.log(`가상 물건 ${numbers.length}개 (${DRY_RUN ? "미리 보기" : CLEAR_ONLY ? "삭제" : "저장"}):`);
  for (const n of numbers) {
    console.log(`  - ${n}  구분값=${PLAN[n].owner}  미리 체크한 항목 ${Object.keys(PLAN[n].checks).length}개`);
  }
  if (DRY_RUN) return;

  process.loadEnvFile(path.join(ROOT, ".env"));
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error(".env에 SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다.");
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const del = await db.from("cases").delete().in("case_no", [...numbers, ...LEGACY_NUMBERS]);
  if (del.error) throw new Error(`기존 가상 물건 삭제 실패: ${del.error.message}`);
  if (CLEAR_ONLY) {
    console.log("\n가상 물건을 지웠습니다.");
    return;
  }

  for (const n of numbers) {
    const { owner, checks } = PLAN[n];
    const ins = await db
      .from("cases")
      .insert({ case_no: n, owner_code: owner, ...confirmFields(n, owner) })
      .select("id")
      .single();
    if (ins.error) throw new Error(`${n} 저장 실패: ${ins.error.message}`);
    const rows = Object.entries(checks).map(([item_key, status]) => ({ case_id: ins.data.id, item_key, status }));
    if (rows.length > 0) {
      const chk = await db.from("case_checks").insert(rows);
      if (chk.error) throw new Error(`${n} 체크 저장 실패: ${chk.error.message}`);
    }
  }
  console.log("\n가상 물건을 저장했습니다. 담당자 계정으로 로그인해 물건을 고르고 \"온비드에서 낙찰일 조회\"를 눌러 보세요.");
}

main().catch((error) => {
  console.error("오류:", error.message);
  process.exit(1);
});
