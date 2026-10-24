# codeView

부트캠프 팀원끼리 코드를 올리고 **줄 단위로 리뷰**하는 작은 코드 리뷰방이에요.

- SAP 과정에서 쓰는 언어만 올려요: **ABAP · CDS View · SQLScript(AMDP) · UI5 XML View · JavaScript(UI5) · HTML · CSS · JSON(manifest)**. 파일 이름이나 붙여넣은 코드를 보고 언어를 자동으로 골라요.
- 언어별로 흔한 실수를 먼저 짚어 줘요.
  - ABAP: 마침표(.) 빠짐, IF/ENDIF·LOOP/ENDLOOP 짝, `SELECT *`, LOOP 안 SELECT, `WITH HEADER LINE`·`OCCURS`·`MOVE`·`TABLES` 같은 옛 문법
  - CDS: `define view` → `define view entity`, 권한 체크 어노테이션, 괄호 짝
  - UI5 XML View·HTML: 닫히지 않은 태그, 루트의 `xmlns="sap.m"`
  - JavaScript: `var`, `==`, 남은 `console.log`, `jQuery.sap.*`, `sap.ui.getCore().byId`
  - JSON: 마지막 쉼표, 작은따옴표, 주석
- **겹치지 않는 이름 + 비밀번호로 가입·로그인**해요. 이메일은 필요 없고, 알림을 받고 싶을 때만 내 정보에서 넣어요(선택).
- 앱 안에서 **팀을 만들고 초대 링크·코드로 팀원을 불러요.** 한 사람이 여러 팀에 들어갈 수 있고, 팀이 바뀌면 새 팀을 만들어 옮기면 돼요.
- 팀원을 리뷰어로 지정하면 그 사람의 **내 리뷰 차례**에 올라가요.
- 줄마다 리뷰를 달고, 고친 코드를 **수정 제안**으로 남길 수 있어요. 글쓴이가 "제안 적용"을 누르면 새 버전(v2, v3…)이 기록돼요.
- 팀원이 리뷰를 남기면 열린 화면이 실시간으로 갱신돼요.
- "디스코드용 복사"로 제목·코드 블록·링크를 한 번에 복사해요.

기술: React + Vite + TypeScript, Supabase(Postgres, Auth, Realtime).

---

## 처음 설정하기

### 1. Supabase 프로젝트 만들기
[supabase.com](https://supabase.com)에서 새 프로젝트를 만들어요. 무료 플랜으로 충분해요.

### 2. 데이터베이스 만들기
대시보드 → **SQL Editor** → New query에서 `supabase/migrations` 폴더의 파일을 **이름 순서대로** 하나씩 붙여넣고 **Run** 해요.

1. [`20261023000000_init.sql`](supabase/migrations/20261023000000_init.sql) — 기본 테이블
2. [`20261023010000_teams.sql`](supabase/migrations/20261023010000_teams.sql) — 팀 만들기·초대 코드
3. [`20261023020000_username_login.sql`](supabase/migrations/20261023020000_username_login.sql) — 이름 로그인·알림 설정
4. [`20261024000000_profile.sql`](supabase/migrations/20261024000000_profile.sql) — 프로필 사진·한 줄 소개 (선택)
5. [`20261024010000_team_roles.sql`](supabase/migrations/20261024010000_team_roles.sql) — 팀장·부팀장·팀원 직책 고르기
6. [`20261024020000_comment_edit.sql`](supabase/migrations/20261024020000_comment_edit.sql) — 내 리뷰 고치기·지우기
7. [`20261024030000_add_task.sql`](supabase/migrations/20261024030000_add_task.sql) — 코드 올릴 때 팀원 누구나 과제 추가

Supabase CLI를 쓴다면 `supabase link --project-ref <ref>` 후 `supabase db push`로 한 번에 돼요.

### 3. 팀 만들고 초대하기 (앱 안에서)
SQL로 명단을 관리할 필요가 없어요.

1. 앱에 처음 로그인하면 **새 팀 만들기** 또는 **초대 코드로 참여하기**가 나와요.
2. 팀을 만들거나 들어올 때 **팀장 · 부팀장 · 팀원** 중 직책을 골라요. 팀장과 부팀장은 팀마다 한 명씩이고, 이미 누가 맡은 자리는 고를 수 없어요.
3. **팀 설정 · 초대하기**에서 초대 링크를 복사해 보내요. 링크를 연 사람은 로그인 뒤 직책을 골라 들어와요. 링크가 밖으로 퍼졌으면 **새 초대 코드 만들기**로 이전 링크를 막아요.
4. 팀장·부팀장은 팀 이름·과제 목록을 바꾸고, 팀원 직책을 바꾸거나 내보낼 수 있어요. 누구나 **내 직책**에서 빈 자리를 맡거나 팀원으로 내려올 수 있어요.

### 4. 로그인 설정
이름 + 비밀번호로 로그인해요. 앱이 이름으로 내부용 주소(`…@users.codeview.example.com`)를 만들어 Supabase Auth에 가입시키고, 그 주소로 메일을 보내지는 않아요. 그래서 대시보드에서 두 가지만 확인해요.

1. **Authentication → Sign In / Providers → Email**이 **켜져 있어야** 해요 (기본값).
2. 같은 화면의 **Confirm email**을 **꺼요**. 켜져 있으면 가입한 뒤 바로 로그인되지 않아요.

- 이름은 한글·영문·숫자·`_ . -`로 2~20자, 대소문자 구분 없이 겹칠 수 없고, 나중에 바꿀 수 없어요.
- 비밀번호는 6자 이상이에요. 잊으면 되찾을 수 없어서, 새 이름으로 다시 가입해 팀에 들어오면 돼요.
- 누구나 가입할 수 있지만 초대 코드를 모르면 다른 팀의 내용은 볼 수 없어요. 가입이 너무 많아지면 **Authentication → Attack Protection**에서 CAPTCHA를 켜요.
- 알림 이메일은 **내 정보 → 알림 받기**에서 선택으로 넣어요. 본인만 볼 수 있고, 메일 발송 기능은 아직 준비 중이에요.

### 5. 로컬에서 실행

```bash
cp .env.example .env
# .env에 Project URL과 anon(public) 키를 넣어요 (아래 '키 찾는 곳' 참고)
npm install
npm run dev
```

**키 찾는 곳**: Supabase 대시보드에서 프로젝트를 열고 왼쪽 아래 **Project Settings → API**(화면에 따라 **Data API** 또는 **API Keys**)
- `VITE_SUPABASE_URL` = **Project URL** (`https://<project-ref>.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` = **Project API keys**의 **`anon` `public`** 키 (새 키 체계라면 **Publishable key** `sb_publishable_...`)

> anon 키는 브라우저에 노출돼도 되는 공개 키예요. 데이터는 RLS 정책으로 보호돼서 같은 팀원만 볼 수 있어요.
> **service_role 키는 절대 `.env`나 코드에 넣지 마세요.**

### 6. 배포 (GitHub Pages)
1. 저장소 **Settings → Pages → Source**를 **GitHub Actions**로 바꿔요.
2. **Settings → Secrets and variables → Actions**에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 넣어요 (Variables, Secrets 어느 쪽이든 돼요).
3. `main`에 푸시하면 `Deploy to GitHub Pages` 워크플로가 빌드해서 `https://<계정>.github.io/codeView/`에 올려요. Actions 탭에서 직접 다시 돌릴 수도 있어요.

### 다른 곳에 배포하기 (Vercel 예시)
1. Vercel에서 이 저장소를 Import → Framework는 **Vite**로 자동 인식돼요.
2. Environment Variables에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 넣어요.

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
- 실제 팀원 데이터가 쌓인 뒤에는 개발용 프로젝트를 따로 만들어 거기에 연결하는 걸 추천해요.

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
| 글·리뷰·팀원 보기 | 같은 팀원 |
| 코드 올리기, 리뷰·답글 달기, 대화 해결 | 같은 팀원 (본인 이름으로만) |
| 리뷰 글 고치기·지우기 | 쓴 사람 (수정 제안 코드는 못 바꿔요, 마지막 댓글을 지우면 대화도 지워져요) |
| 상태 바꾸기, 글 삭제 | 글쓴이 |
| 수정 제안 적용 | 글쓴이 (`apply_suggestion` 함수로만, 코드 직접 수정은 막혀 있어요) |
| 팀 만들기 | 로그인한 누구나 (직책은 직접 골라요) |
| 팀 참여 | 초대 코드를 아는 사람 (`join_team`, 빈 직책만 고를 수 있어요) |
| 과제 하나 추가 | 같은 팀원 누구나 (`add_team_task`, 띄어쓰기만 다른 같은 과제는 막아요) |
| 내 직책 바꾸기 | 본인 (`set_my_role`, 빈 팀장·부팀장 자리 또는 팀원) |
| 팀 이름·과제 바꾸기, 초대 코드 새로 만들기, 팀원 직책 바꾸기·내보내기, 팀 삭제 | 팀장·부팀장 |
| 팀 나가기 | 본인 (마지막 사람이 나가면 팀이 지워져요) |
