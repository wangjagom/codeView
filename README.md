# 줄톡

부트캠프 조원끼리 코드를 올리고 **줄 단위로 리뷰**하는 작은 코드 리뷰방이에요.

- 코드를 붙여넣으면 흔한 실수(괄호 짝, `onClick={fn()}`, `var`, `==`, index key, 기다리지 않은 `fetch` 등)를 먼저 짚어 줘요.
- 조원을 리뷰어로 지정하면 그 사람의 **내 리뷰 차례**에 올라가요.
- 줄마다 리뷰를 달고, 고친 코드를 **수정 제안**으로 남길 수 있어요. 글쓴이가 "제안 적용"을 누르면 새 버전(v2, v3…)이 기록돼요.
- 조원이 리뷰를 남기면 열린 화면이 실시간으로 갱신돼요.
- "디스코드용 복사"로 제목·코드 블록·링크를 한 번에 복사해요.

기술: React + Vite + TypeScript, Supabase(Postgres, Auth, Realtime).

---

## 처음 설정하기

### 1. Supabase 프로젝트 만들기
[supabase.com](https://supabase.com)에서 새 프로젝트를 만들어요. 무료 플랜으로 충분해요.

### 2. 데이터베이스 만들기
대시보드 → **SQL Editor** → New query에 [`supabase/migrations/20261023000000_init.sql`](supabase/migrations/20261023000000_init.sql) 내용을 통째로 붙여넣고 **Run**.

Supabase CLI를 쓴다면 `supabase link --project-ref <ref>` 후 `supabase db push`로도 돼요.

### 3. 조원 이메일 등록
팀 명단(`team_members`)에 있는 이메일만 데이터를 볼 수 있어요. SQL Editor에서:

```sql
insert into public.team_members (email) values
  ('me@example.com'),
  ('friend1@example.com'),
  ('friend2@example.com');
```

이메일은 **소문자**로 넣어 주세요. 나중에 조원이 늘면 같은 방법으로 추가하면 돼요.

### 4. 로그인 설정
대시보드 → **Authentication → URL Configuration**
- **Site URL**: 배포한 주소 (예: `https://jultalk.vercel.app`)
- **Redirect URLs**: `http://localhost:5173/**` 와 배포 주소 `https://jultalk.vercel.app/**`

로그인은 비밀번호 없이 이메일 링크로 해요. Supabase 기본 메일 발송은 시간당 보낼 수 있는 수가 적어서, 조원이 많아지면 **Authentication → SMTP Settings**에서 메일 서비스를 연결하는 걸 추천해요.

### 5. 로컬에서 실행

```bash
cp .env.example .env
# .env에 Project Settings → API의 Project URL과 anon(public) 키를 넣어요
npm install
npm run dev
```

> anon 키는 브라우저에 노출돼도 되는 공개 키예요. 데이터는 RLS 정책과 팀 명단으로 보호돼요.
> **service_role 키는 절대 `.env`나 코드에 넣지 마세요.**

### 6. 배포 (Vercel 예시)
1. Vercel에서 이 저장소를 Import → Framework는 **Vite**로 자동 인식돼요.
2. Environment Variables에 `.env`의 `VITE_` 값들을 그대로 넣어요.
3. 배포 주소를 4번의 Site URL / Redirect URLs에 추가해요.

Netlify, Cloudflare Pages도 같은 방법으로 돼요(빌드 명령 `npm run build`, 출력 폴더 `dist`).

---

## Claude에 Supabase MCP 연결하기

Claude가 테이블 구조를 보고, 데이터를 조회하고, 마이그레이션을 도와줄 수 있게 연결하는 방법이에요.

**Claude Code (터미널)**

```bash
claude mcp add --transport http supabase "https://mcp.supabase.com/mcp?project_ref=<project-ref>&read_only=true"
```

그다음 Claude Code에서 `/mcp`를 입력해 supabase를 고르고 브라우저로 로그인하면 끝이에요.
이 저장소에는 `.mcp.json`도 들어 있어서, `SUPABASE_PROJECT_REF` 환경 변수를 설정하고 이 폴더에서 Claude Code를 열면 자동으로 잡혀요.

**claude.ai / Claude 앱 (클라우드 세션 포함)**

설정 → 커넥터([claude.ai/customize/connectors](https://claude.ai/customize/connectors))에서 Supabase를 추가하거나, "사용자 지정 커넥터 추가"에 `https://mcp.supabase.com/mcp?project_ref=<project-ref>&read_only=true`를 넣고 Supabase 계정으로 로그인해요. 커넥터는 세션을 시작할 때 읽히니까 **연결한 뒤 새 세션**을 열어야 해요.

**안전하게 쓰기**
- `project_ref`로 이 프로젝트 하나만 보이게 제한해요. (Project Settings → General → Project ID)
- 평소에는 `read_only=true`로 읽기만 허용하고, 마이그레이션을 맡길 때만 잠깐 빼요.
- 실제 조원 데이터가 쌓인 뒤에는 개발용 프로젝트를 따로 만들어 거기에 연결하는 걸 추천해요.

---

## 개발

```bash
npm run dev        # 개발 서버
npm run typecheck  # 타입 검사
npm test           # 자동 검사 규칙·하이라이터 테스트
npm run build      # 배포용 빌드
```

```
src/
  lib/checks.ts       붙여넣은 코드의 흔한 실수 찾기
  lib/highlight.ts    문법 색칠 (모든 입력은 이스케이프)
  lib/api.ts          Supabase 호출
  components/CodeView 줄 리뷰·수정 제안 화면
  pages/              목록, 코드 올리기, 상세, 로그인, 내 정보
supabase/migrations/  테이블, RLS 정책, 수정 제안 적용 함수
```

### 권한 요약
| 하는 일 | 누가 |
|---|---|
| 글·리뷰 보기 | 팀 명단에 있는 사람 |
| 코드 올리기, 리뷰·답글 달기 | 팀 명단에 있는 사람 (본인 이름으로만) |
| 상태 바꾸기, 글 삭제 | 글쓴이 |
| 수정 제안 적용 | 글쓴이 (`apply_suggestion` 함수로만, 코드 직접 수정은 막혀 있어요) |
| 대화 해결/다시 열기 | 팀 명단에 있는 사람 |
