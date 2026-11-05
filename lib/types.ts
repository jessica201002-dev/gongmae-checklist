// Design Ref: §5.2 — 체크 상태 타입. 표에 행이 없으면 "미완료"로 본다.
// (물건 타입 등은 해당 작업 단계에서 이 파일에 추가한다.)

/** 저장되는 체크 상태: 완료(done) 또는 해당 없음(na) */
export type CheckStatus = "done" | "na";

/** 항목 하나의 상태: 저장된 값이 없으면 null(미완료) */
export type ItemState = CheckStatus | null;

// Design Ref: §5.1 — 저장된 물건 한 건. 날짜는 "YYYY-MM-DD" 문자열로 다룬다.
export interface CaseRecord {
  id: string;
  /** 물건번호 (중복 불가, 최대 50자) */
  caseNo: string;
  /** 담당자 구분값 (이름·사번이 아닌 임의의 코드, 최대 20자) */
  ownerCode: string;
  /** 낙찰일. 아직 입력하지 않았으면 null */
  bidDate: string | null;
  /** 송달 등기번호 (최대 30자). 없으면 null */
  deliveryRegNo: string | null;
  /** 담당자 확인 시각(ISO)과 확인한 계정 아이디. 확인하지 않았으면 null */
  staffConfirmedAt: string | null;
  staffConfirmedBy: string | null;
  /** 팀장 확인 시각(ISO)과 확인한 계정 아이디. 담당자 확인 뒤에만 있을 수 있다 */
  managerConfirmedAt: string | null;
  managerConfirmedBy: string | null;
  createdAt: string;
  updatedAt: string;
}
