// Design Ref: §3.3, §10.3 — 온비드 조회 시험용 가상(샘플) 물건.
// 실제 온비드 인증키가 아직 사용할 수 없을 때도 "물건번호 입력 → 조회 → 낙찰일 자동 입력" 흐름을 굴려 볼 수 있게,
// 아래의 가상 물건번호로 조회하면 실제 온비드를 부르지 않고 이 목록의 가상 결과를 돌려준다.
// ※ 모든 값은 지어낸 가짜 데이터다. 실제 물건·사람·주소와 관계없다. 화면에도 "가상 데이터"라고 표시한다.
// ※ 낙찰일은 "오늘"을 기준으로 계산해, 날짜가 낡아도 임박·기일 경과가 항상 보이게 한다.
import { subtractBusinessDays } from "./businessDays";
import { todayInSeoul } from "./deadline";
import type { OnbidLookupResult } from "./onbidTypes";

export interface OnbidSample {
  /** 가상 물건번호 (연도4자리-공고번호5자리-구분번호3자리 모양. 공고번호는 첫 자리가 0 또는 1이어야 하므로, 시험용은 19로 시작하는 번호로 구분한다) */
  caseNo: string;
  /** 낙찰일이 오늘로부터 몇 영업일 전인지. null이면 낙찰일 없음(아직 낙찰 전) */
  bidBusinessDaysAgo: number | null;
  /** 화면에 보여 줄 가상 물건 기본 정보 */
  info: { label: string; value: string }[];
}

export const ONBID_SAMPLES: readonly OnbidSample[] = [
  {
    caseNo: "2026-19001-001",
    bidBusinessDaysAgo: 5, // 기일 2영업일 전 → "임박"이 되는 낙찰일
    info: [
      { label: "물건명", value: "가상 아파트 1동 101호" },
      { label: "소재지", value: "가상시 가상구 시험로 1" },
      { label: "감정가", value: "350,000,000원" },
      { label: "최저입찰가", value: "245,000,000원" },
    ],
  },
  {
    caseNo: "2026-19001-002",
    bidBusinessDaysAgo: 12, // 기일이 이미 지남 → "기일 경과"
    info: [
      { label: "물건명", value: "가상 상가 2층 202호" },
      { label: "소재지", value: "가상시 시험구 연습길 22" },
      { label: "감정가", value: "180,000,000원" },
      { label: "최저입찰가", value: "126,000,000원" },
    ],
  },
  {
    caseNo: "2025-19002-001",
    bidBusinessDaysAgo: 1, // 기일까지 여유 있음 → 기한 표시 없음
    info: [
      { label: "물건명", value: "가상 토지 (임야)" },
      { label: "소재지", value: "가상군 샘플면 예시리 산 3" },
      { label: "감정가", value: "92,000,000원" },
      { label: "최저입찰가", value: "64,400,000원" },
    ],
  },
  {
    caseNo: "2025-19002-002",
    bidBusinessDaysAgo: null, // 낙찰 전 → 낙찰일 정보 없음 안내를 확인하는 용도
    info: [
      { label: "물건명", value: "가상 오피스텔 5층 505호" },
      { label: "소재지", value: "가상시 데모구 확인대로 45" },
      { label: "감정가", value: "140,000,000원" },
      { label: "최저입찰가", value: "98,000,000원" },
    ],
  },
  {
    caseNo: "2024-19003-001",
    bidBusinessDaysAgo: 3,
    info: [
      { label: "물건명", value: "가상 다세대주택 3층 301호" },
      { label: "소재지", value: "가상시 점검구 테스트동길 7" },
      { label: "감정가", value: "210,000,000원" },
      { label: "최저입찰가", value: "147,000,000원" },
    ],
  },
  {
    caseNo: "2024-19003-002",
    bidBusinessDaysAgo: 20, // 오래전 낙찰 → 6개 항목을 모두 완료한 물건 시연용
    info: [
      { label: "물건명", value: "가상 공장 부지" },
      { label: "소재지", value: "가상시 산업로 99" },
      { label: "감정가", value: "820,000,000원" },
      { label: "최저입찰가", value: "574,000,000원" },
    ],
  },
];

/** 가상 물건번호이면 그 가상 조회 결과를, 아니면 null을 돌려준다 (null이면 실제 온비드를 조회한다) */
export function findOnbidSample(caseNo: string, today: string = todayInSeoul()): OnbidLookupResult | null {
  const sample = ONBID_SAMPLES.find((item) => item.caseNo === caseNo.trim());
  if (!sample) return null;
  const bidDate =
    sample.bidBusinessDaysAgo === null ? null : subtractBusinessDays(today, sample.bidBusinessDaysAgo);
  // 가상 값에서 감정가액을 꺼내고, 낙찰 건에는 가상 낙찰가액(최저입찰가와 같은 값, 감정가의 70%)을 붙인다
  const appraisal = sample.info.find((row) => row.label === "감정가")?.value;
  const winningBid = bidDate ? sample.info.find((row) => row.label === "최저입찰가")?.value : undefined;
  return {
    status: "found",
    sample: true,
    bidDate,
    ...(appraisal ? { appraisal } : {}),
    ...(winningBid ? { winningBid, winningRatio: "70%" } : {}),
    info: sample.info,
  };
}
