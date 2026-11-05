// Design Ref: §6 — 온비드 조회 결과의 모양과 화면 문구. 브라우저와 서버가 함께 쓰므로 서버 전용 코드(lib/onbid.ts)와 나눠 둔다.

/** 조회에 실패한 이유 (화면에는 쉬운 말로 바꿔 보여 준다) */
export type OnbidUnavailableReason =
  | "no_key" // .env에 인증키가 없음
  | "key_rejected" // 포털이 인증키를 받아 주지 않음(미등록·미승인·만료 등)
  | "rate_limited" // 호출 한도 초과
  | "timeout" // 응답이 늦음
  | "upstream_error" // 그 밖의 온비드·포털 쪽 오류
  | "mapping_pending"; // 응답 필드 대응이 아직 확정되지 않음

/** 조회 결과: 찾음 / 결과 없음 / 조회 불가 */
export type OnbidLookupResult =
  | {
      status: "found";
      /** true이면 실제 온비드가 아니라 시험용 가상(샘플) 결과다 */
      sample?: true;
      /** 낙찰일 "YYYY-MM-DD". 온비드에 낙찰일이 없으면 null */
      bidDate: string | null;
      /** 화면에 보여 줄 공개 물건 기본 정보 (이름표 → 값) */
      info: { label: string; value: string }[];
    }
  | { status: "not_found" }
  | { status: "unavailable"; reason: OnbidUnavailableReason };

const MANUAL = "낙찰일은 직접 입력해 주세요.";

/** 조회에 실패했을 때 화면에 보여 줄 문구. 항상 수기 입력을 쓸 수 있다고 알려 준다 */
export const ONBID_UNAVAILABLE_MESSAGES: Record<OnbidUnavailableReason, string> = {
  no_key: `온비드 조회 설정(인증키)이 되어 있지 않아 조회할 수 없습니다. ${MANUAL}`,
  key_rejected: `온비드 조회 인증키를 아직 사용할 수 없는 상태입니다. ${MANUAL}`,
  rate_limited: `온비드 조회 가능 횟수를 넘었습니다. 잠시 뒤에 다시 시도하거나 ${MANUAL}`,
  timeout: `온비드 응답이 늦어 조회하지 못했습니다. 잠시 뒤에 다시 시도하거나 ${MANUAL}`,
  upstream_error: `온비드에서 정보를 가져오지 못했습니다. 잠시 뒤에 다시 시도하거나 ${MANUAL}`,
  mapping_pending: `온비드 조회 결과를 읽는 기능이 아직 준비되지 않았습니다. ${MANUAL}`,
};

export const ONBID_NOT_FOUND_MESSAGE =
  `온비드의 최근 3년 압류재산 입찰 결과에서 이 물건번호를 찾지 못했습니다. 아직 개찰 전이거나 번호가 온비드 물건관리번호와 다를 수 있습니다. ${MANUAL}`;
