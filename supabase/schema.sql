-- Design Ref: §5 — 압류재산 공매업무 체크리스트의 저장소 표 정의 (Supabase)
-- 이 파일은 표를 만든 SQL을 기록해 둔 것이다. 같은 내용을 다시 실행해도 오류가 나지 않게 썼다.
-- 샘플(가짜) 데이터만 넣는다. 실제 업무 정보는 넣지 않는다.

-- 5.1 cases: 물건
create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  -- 물건번호 (중복 불가, 최대 50자)
  case_no text not null unique
    check (char_length(case_no) between 1 and 50),
  -- 담당자 구분값 (이름·사번이 아닌 임의의 코드, 최대 20자)
  owner_code text not null
    check (char_length(owner_code) between 1 and 20),
  -- 낙찰일 (매각결정기일은 저장하지 않고 읽을 때마다 계산한다)
  bid_date date,
  -- 송달 등기번호 (최대 30자)
  delivery_reg_no text
    check (delivery_reg_no is null or char_length(delivery_reg_no) <= 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5.2 case_checks: 항목 체크. 행이 없으면 미완료, done은 완료, na는 해당 없음
create table if not exists public.case_checks (
  -- 물건을 삭제하면 그 물건의 체크도 함께 삭제된다
  case_id uuid not null references public.cases (id) on delete cascade,
  -- 5.3의 항목 이름표 6개 (lib/checklist.ts와 같아야 한다)
  item_key text not null
    check (item_key in (
      'delivery', 'benefit', 'appraisal',
      'area_match', 'suspension_doc', 'field_survey'
    )),
  status text not null check (status in ('done', 'na')),
  primary key (case_id, item_key)
);

-- 담당자 구분값별로 걸러 볼 때 쓰는 색인
create index if not exists cases_owner_code_idx on public.cases (owner_code);

-- 접근 보호(RLS): 켜 두고 허용 규칙을 만들지 않는다.
-- 서버용 키(service_role)를 쓰는 서버 코드만 읽고 쓸 수 있고,
-- 브라우저용 공개 키로는 아무것도 읽거나 쓸 수 없다.
alter table public.cases enable row level security;
alter table public.case_checks enable row level security;

-- 5.5 accounts: 로그인 계정. 비밀번호는 암호화(해시)해서만 저장한다. 샘플(가짜) 계정만 만든다.
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  -- 로그인 아이디 (이름·사번이 아닌 임의의 코드)
  login_id text not null unique
    check (char_length(login_id) between 3 and 30),
  -- 비밀번호 해시 (원래 비밀번호는 어디에도 저장하지 않는다)
  password_hash text not null,
  -- 역할: 담당자 / 팀장 / 부점장
  role text not null check (role in ('staff', 'manager', 'director')),
  -- 담당자 계정이 보는 물건의 담당자 구분값 (담당자는 필수, 팀장·부점장은 비움)
  owner_code text
    check (owner_code is null or char_length(owner_code) between 1 and 20),
  created_at timestamptz not null default now(),
  check (role <> 'staff' or owner_code is not null)
);

alter table public.accounts enable row level security;

-- 5.6 결재선 확인 표시: 담당자 확인 → 팀장 확인 순서 (부점장은 열람만 하고, 결재는 앱 밖에서 한다)
-- 확인한 시각과 계정 아이디(이름이 아닌 코드)를 함께 남긴다.
alter table public.cases
  add column if not exists staff_confirmed_at timestamptz,
  add column if not exists staff_confirmed_by text,
  add column if not exists manager_confirmed_at timestamptz,
  add column if not exists manager_confirmed_by text;

-- 팀장 확인은 담당자 확인이 있어야만 존재할 수 있다 (결재선 순서)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cases_confirm_order') then
    alter table public.cases
      add constraint cases_confirm_order
      check (manager_confirmed_at is null or staff_confirmed_at is not null);
  end if;
end
$$;
