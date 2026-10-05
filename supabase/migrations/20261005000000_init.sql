-- 가택 웹 초기 스키마
-- 게임 진행 중 상태는 게임 서버 메모리에만 있고, 판이 끝나면 서버(service_role)가 기록한다.

-- 프로필 ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null unique check (char_length(nickname) between 1 and 16),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles: 누구나 조회" on public.profiles for select using (true);
create policy "profiles: 본인 생성" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles: 본인 수정" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- 판 기록 --------------------------------------------------------------
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  mode text not null,
  player_count smallint not null check (player_count between 8 and 12),
  winner_side smallint check (winner_side in (1, 2)),
  seed integer,
  version text not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists matches_ended_at_idx on public.matches (ended_at desc);

create table if not exists public.match_players (
  match_id uuid not null references public.matches (id) on delete cascade,
  seat smallint not null,
  user_id uuid references auth.users (id) on delete set null, -- 게스트·봇은 null
  nickname text not null,
  slot smallint not null,
  character_key text not null,
  side smallint not null check (side in (1, 2)),
  died_at_ms integer,
  won boolean not null,
  primary key (match_id, seat)
);
create index if not exists match_players_user_idx on public.match_players (user_id);

-- 리플레이용 이벤트 로그 (GameEvent JSON, 채팅 제외)
create table if not exists public.match_events (
  match_id uuid not null references public.matches (id) on delete cascade,
  seq integer not null,
  t_ms integer not null,
  payload jsonb not null,
  primary key (match_id, seq)
);

-- 종료된 판은 공개 (복기·전적). 쓰기는 service_role(RLS 우회)만
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.match_events enable row level security;
create policy "matches: 누구나 조회" on public.matches for select using (true);
create policy "match_players: 누구나 조회" on public.match_players for select using (true);
create policy "match_events: 누구나 조회" on public.match_events for select using (true);

-- 채팅 로그는 비공개 (귓속말·동맹·사망자 채널 포함). 신고 처리용으로만 service_role 이 읽는다.
-- RLS 켜고 정책 없음 = anon/authenticated 접근 불가
create table if not exists public.match_chat (
  match_id uuid not null references public.matches (id) on delete cascade,
  seq integer not null,
  t_ms integer not null,
  channel text not null,
  payload jsonb not null,
  primary key (match_id, seq)
);
alter table public.match_chat enable row level security;

-- 신고 -----------------------------------------------------------------
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  match_id uuid references public.matches (id) on delete set null,
  reporter uuid not null references auth.users (id) on delete cascade,
  target_user uuid references auth.users (id) on delete set null,
  target_nickname text,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
create index if not exists reports_match_idx on public.reports (match_id);
create index if not exists reports_reporter_idx on public.reports (reporter);
create index if not exists reports_target_user_idx on public.reports (target_user);
create policy "reports: 본인 신고 작성" on public.reports for insert to authenticated with check ((select auth.uid()) = reporter);
create policy "reports: 본인 신고 조회" on public.reports for select to authenticated using ((select auth.uid()) = reporter);

-- 캐릭터별 승률 뷰 (밸런스 텔레메트리)
create or replace view public.character_stats with (security_invoker = true) as
select m.mode,
       mp.character_key,
       count(*) as games,
       count(*) filter (where mp.won) as wins,
       round(100.0 * count(*) filter (where mp.won) / nullif(count(*), 0), 1) as win_rate
from public.match_players mp
join public.matches m on m.id = mp.match_id
group by m.mode, mp.character_key;
