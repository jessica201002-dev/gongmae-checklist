// Design Ref: §5.2 — 체크 상태 타입. 표에 행이 없으면 "미완료"로 본다.
// (물건 타입 등은 해당 작업 단계에서 이 파일에 추가한다.)

/** 저장되는 체크 상태: 완료(done) 또는 해당 없음(na) */
export type CheckStatus = "done" | "na";

/** 항목 하나의 상태: 저장된 값이 없으면 null(미완료) */
export type ItemState = CheckStatus | null;
