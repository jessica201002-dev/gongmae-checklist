// Design Ref: §10.3 — 샘플(가짜) 데이터 넣기. 시연과 전체 점검에 쓴다.
//
// 사용법 (프로젝트 폴더에서):
//   npm run seed          샘플 물건을 (다시) 만든다. 이미 있는 "샘플-" 물건은 지우고 새로 만든다.
//   npm run seed:clear    "샘플-"로 시작하는 물건만 지운다.
//   node scripts/seed.mjs --dry-run   표는 건드리지 않고 만들 내용만 보여 준다.
//
// 안전 규칙
//  - 지우는 것은 물건번호가 "샘플-"로 시작하는 물건뿐이다. 다른 물건은 건드리지 않는다.
//  - 샘플은 모두 가짜 데이터다. 실제 업무 정보는 절대 넣지 않는다.
//  - .env의 값은 읽기만 하고 출력하지 않는다.
//  - 낙찰일은 "오늘"을 기준으로 계산해 만든다. 날짜가 낡아도 임박·기일 경과가 항상 보이게 하기 위해서다.
//    날짜 규칙(7영업일, 임박/기일 경과)은 앱의 lib/ 파일을 그대로 불러와 쓰므로 앱과 어긋나지 않는다.

import { createClient } from "@supabase/supabase-js";
import ts from "typescript";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SAMPLE_PREFIX = "샘플-";
const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const CLEAR_ONLY = args.has("--clear");

// ----- 앱의 날짜·체크리스트 규칙 불러오기 -----
// lib/*.ts(TypeScript)를 임시 폴더(node_modules/.cache, Git에 올라가지 않음)에서 JavaScript로 바꿔 불러온다.
function loadRules() {
  const outDir = path.join(ROOT, "node_modules", ".cache", "gongmae-seed");
  fs.mkdirSync(outDir, { recursive: true });
  for (const name of ["holidays", "businessDays", "deadline", "checklist"]) {
    const source = fs.readFileSync(path.join(ROOT, "lib", `${name}.ts`), "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    fs.writeFileSync(path.join(outDir, `${name}.js`), outputText);
  }
  const require = createRequire(import.meta.url);
  const deadline = require(path.join(outDir, "deadline.js"));
  const checklist = require(path.join(outDir, "checklist.js"));
  const business = require(path.join(outDir, "businessDays.js"));
  return { outDir, deadline, checklist, business };
}

function shiftDays(ymd, days) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * today 기준으로, 원하는 기한 상태가 되는 낙찰일을 찾는다.
 * 가장 최근 낙찰일부터 거꾸로 찾고, 실제 업무처럼 낙찰일은 영업일(주말·공휴일이 아닌 날)만 쓴다.
 */
function findBidDate(rules, today, wantStatus, isComplete = false) {
  for (let back = 0; back <= 60; back++) {
    const bid = shiftDays(today, -back);
    if (!rules.business.isBusinessDay(bid)) continue;
    const decision = rules.deadline.calcDecisionDate(bid);
    const status = rules.deadline.getDeadlineStatus(decision, today, isComplete);
    if (status === wantStatus) return bid;
  }
  throw new Error(`오늘(${today}) 기준으로 '${wantStatus ?? "표시 없음"}' 상태가 되는 낙찰일을 찾지 못했습니다.`);
}

// 항목 이름표 순서: delivery, benefit, appraisal, area_match, suspension_doc, field_survey
function buildSamples(rules, today) {
  const done = (...keys) => Object.fromEntries(keys.map((k) => [k, "done"]));
  // 낙찰일이 항상 이미 지난 영업일이 되도록: "오늘이 영업일이면 오늘, 아니면 직전 영업일", 그리고 N영업일 전
  const latestBusinessDay = rules.business.isBusinessDay(today)
    ? today
    : rules.business.subtractBusinessDays(today, 1);
  const businessDaysAgo = (n) => rules.business.subtractBusinessDays(latestBusinessDay, n);
  return [
    {
      caseNo: "2026-10001-001", ownerCode: "담당-01", bidDate: null, deliveryRegNo: null, checks: {},
      note: "낙찰일 없음 (기일·기한 상태 없음, 입력 안내)",
    },
    {
      caseNo: "2026-10001-002", ownerCode: "담당-01", bidDate: latestBusinessDay, deliveryRegNo: null,
      checks: { delivery: "done", benefit: "na", appraisal: "done" },
      note: "기한 표시 없음 (기일이 한참 남음), 3/6",
    },
    {
      caseNo: "2026-10002-001", ownerCode: "담당-02", bidDate: findBidDate(rules, today, "imminent"), deliveryRegNo: null,
      checks: done("delivery", "benefit", "appraisal", "area_match", "suspension_doc"),
      note: "임박, 5/6",
    },
    {
      caseNo: "2025-10003-001", ownerCode: "담당-02", bidDate: findBidDate(rules, today, "overdue"), deliveryRegNo: null,
      checks: done("delivery", "benefit", "appraisal", "area_match"),
      note: "기일 경과, 4/6",
    },
    {
      caseNo: "2025-10003-002", ownerCode: "담당-03", bidDate: businessDaysAgo(21), deliveryRegNo: null,
      checks: { delivery: "done", benefit: "na", appraisal: "done", area_match: "done", suspension_doc: "na", field_survey: "done" },
      note: "모두 완료 6/6 (해당 없음 포함), 기한 배지 없음",
    },
    {
      caseNo: "2024-10004-001", ownerCode: "담당-03", bidDate: businessDaysAgo(1), deliveryRegNo: "0000-0000-0001",
      checks: { delivery: "done", benefit: "done" },
      note: "송달 항목에 가짜 등기번호 포함, 2/6",
    },
    {
      caseNo: "2024-10004-002", ownerCode: "담당-01", bidDate: "2028-01-03", deliveryRegNo: null, checks: {},
      note: "공휴일 목록(2026~2027년) 범위 밖 낙찰일 (경고 표시)",
    },
  ];
}

function describe(rules, sample, today) {
  const decision = sample.bidDate ? rules.deadline.calcDecisionDate(sample.bidDate) : null;
  const complete = rules.checklist.isCaseComplete(sample.checks);
  const status = decision ? rules.deadline.getDeadlineStatus(decision, today, complete) : null;
  const label = status ? rules.deadline.DEADLINE_STATUS_LABELS[status] : "-";
  return `${sample.caseNo}  ${sample.ownerCode}  체크 ${rules.checklist.countCompleted(sample.checks)}/6  낙찰일 ${sample.bidDate ?? "-"}  기일 ${decision ?? "-"}  기한 상태 ${label}  (${sample.note})`;
}

function requireEnv() {
  try {
    process.loadEnvFile(path.join(ROOT, ".env"));
  } catch {
    // .env가 없으면 아래에서 안내한다
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("❌ .env에 SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다. (값은 출력하지 않습니다)");
    process.exit(1);
  }
  return { url, key };
}

async function main() {
  const rules = loadRules();
  const today = rules.deadline.todayInSeoul();
  try {
    const samples = buildSamples(rules, today);
    console.log(`오늘(한국 시간): ${today}`);

    if (DRY_RUN) {
      console.log("\n[연습 실행] 표는 건드리지 않습니다. 만들게 될 샘플:");
      for (const s of samples) console.log("  " + describe(rules, s, today));
      return;
    }

    const { url, key } = requireEnv();
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

    // 1) 기존 샘플 지우기 (이 스크립트가 만드는 물건번호와, 예전에 쓰던 "샘플-"로 시작하는 물건만. 항목 체크는 함께 지워진다)
    const sampleNumbers = samples.map((s) => s.caseNo);
    const { data: byNumber, error: listError } = await db.from("cases").select("id, case_no").in("case_no", sampleNumbers);
    if (listError) throw new Error(`기존 샘플 조회 실패: ${listError.message}`);
    const { data: legacy, error: legacyError } = await db.from("cases").select("id, case_no").like("case_no", `${SAMPLE_PREFIX}%`);
    if (legacyError) throw new Error(`예전 샘플 조회 실패: ${legacyError.message}`);
    const existing = [...(byNumber ?? []), ...(legacy ?? [])];
    if (existing.length > 0) {
      const { error } = await db.from("cases").delete().in("id", existing.map((c) => c.id));
      if (error) throw new Error(`기존 샘플 삭제 실패: ${error.message}`);
      console.log(`기존 샘플 ${existing.length}건을 지웠습니다.`);
    } else {
      console.log("지울 기존 샘플이 없습니다.");
    }
    if (CLEAR_ONLY) {
      console.log("✅ 샘플을 모두 지웠습니다.");
      return;
    }

    // 2) 새로 만들기
    for (const s of samples) {
      const { data, error } = await db
        .from("cases")
        .insert({ case_no: s.caseNo, owner_code: s.ownerCode, bid_date: s.bidDate, delivery_reg_no: s.deliveryRegNo })
        .select("id")
        .single();
      if (error) throw new Error(`${s.caseNo} 등록 실패: ${error.message}`);
      const rows = Object.entries(s.checks).map(([item_key, status]) => ({ case_id: data.id, item_key, status }));
      if (rows.length > 0) {
        const { error: checkError } = await db.from("case_checks").insert(rows);
        if (checkError) throw new Error(`${s.caseNo} 체크 저장 실패: ${checkError.message}`);
      }
      console.log("  만듦  " + describe(rules, s, today));
    }
    console.log(`\n✅ 샘플 ${samples.length}건을 만들었습니다. (모두 가짜 데이터입니다)`);
    console.log("   지우려면: npm run seed:clear");
  } finally {
    fs.rmSync(rules.outDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("❌ 샘플 데이터를 넣지 못했습니다:", error.message);
  process.exit(1);
});
