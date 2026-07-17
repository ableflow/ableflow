# 에이블로우 데스크 (AbleLaw Desk)

국가법령정보 공동활용 Open API를 이용해 **현행법령·판례**를 검색하고, 사용자가 입력한 상황과 자료의 **공통점·차이점**을 정리하는 **개인용 로컬 조사 보조 도구**입니다.

> ⚠️ 이 도구는 관련 법령·판례·행정사례를 검색하고 비교하기 위한 조사 보조 도구입니다. 법률 자문이나 합법·불법에 대한 확정적 판단을 제공하지 않으며, 실제 판단은 구체적인 사실관계와 최신 법령에 따라 달라질 수 있습니다.

## 기술 스택

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS
- SQLite + **Drizzle ORM** (드라이버: `@libsql/client`)
- 국가법령정보 공동활용 Open API (DRF)
- AI: Claude API 우선, OpenAI 확장 가능하도록 추상화 (`src/lib/ai/provider.ts`)

## 요구 사항

- Node.js 20+ (본 프로젝트는 Node 26 에서 개발/검증)
- 국가법령정보 공동활용 API 인증값(OC) — https://open.law.go.kr 에서 발급
- Claude API 키 (또는 OpenAI 키)

## 설치 및 실행

```bash
npm install
cp .env.example .env.local   # 키를 직접 넣거나, 앱 실행 후 /settings 에서 입력
npm run dev                  # http://localhost:3000
```

설정은 `.env.local` 또는 앱의 **설정(/settings)** 화면에서 입력할 수 있습니다. 설정 화면 값이 우선하며 로컬 SQLite(`data/ablelaw.db`)에만 저장됩니다.

### 환경변수 (.env.example)

```
LAW_API_OC=            # 국가법령정보 OC 인증값
AI_PROVIDER=anthropic  # anthropic | openai
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
AI_MODEL=claude-3-5-sonnet-latest
```

## 화면

| 경로 | 설명 |
|---|---|
| `/` | 대시보드 (요약, 최근 조사, 설정 상태) |
| `/research/new` | 새 조사 입력 + 개인정보 익명화 미리보기 |
| `/research/[id]` | 조사 결과 (쟁점·법령·판례·비교·종합검토·원문출처) |
| `/history` | 조사 기록 (검색, 즐겨찾기, 태그, 삭제) |
| `/settings` | OC/AI 키, 모델, 검색 옵션, 연결 테스트 |

## 데이터 흐름

입력 → (선택) 개인정보 익명화 → AI 쟁점 추출(Zod 검증, 실패 시 1회 재시도) → 검색어 5~10개 생성 → 국가법령정보 목록 검색 → 중복 제거 → 검색 관련도 점수화 → 상위 본문 조회 → AI 공통점·차이점 비교 → 종합 검토 → SQLite 저장 → 결과 화면/내보내기.

자세한 내용은 `docs/implementation-plan.md`, API 스펙은 `docs/api-targets.md` 참고.

## 스크립트

```bash
npm run dev        # 개발 서버
npm run build      # 프로덕션 빌드
npm run start      # 프로덕션 실행
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run db:push    # drizzle-kit 스키마 반영 (선택; 앱은 기동 시 테이블 자동 생성)
```

## 테스트 질문 (기능 검증용)

1. 악성 배달고객 신고 서비스의 개인정보 제3자 제공 문제
2. 매수·매도 신호를 제공하는 주식 앱의 투자자문업 관련 문제
3. 직원과 프리랜서의 근로자성 판단 문제

각 질문에서 쟁점 추출 → 검색어 생성 → 자료 검색 → 원문 링크 → 비교 분석 → 저장까지 동작하는지 확인합니다. (실제 검색·AI 호출에는 OC/AI 키가 필요합니다.)

## 설계 메모 / 의도적 선택

- **ORM 드라이버**: 계획서에서는 `better-sqlite3` 를 고려했으나, 개발 환경(Node 26)에서 네이티브 빌드가 실패하여 **N-API 프리빌드 기반의 `@libsql/client`** 로 전환했습니다. Drizzle ORM(`drizzle-orm/libsql`) 은 그대로 사용합니다. 앱 기동 시 `src/lib/db/index.ts` 가 테이블을 자동 생성하므로 별도 마이그레이션 없이 동작합니다.
- **API 키 보호**: OC/AI 키는 서버 라우트에서만 사용되며, `/api/settings` 는 키 존재 여부만 반환하고 값 자체는 클라이언트로 보내지 않습니다.
- **검색 관련도**: 정렬용 휴리스틱 점수이며 법적 결론이 아닙니다(화면에 "검색 관련도"로만 표기).

## 미구현 / 확장 예정

공식 API 문서에서 **파라미터·응답 필드까지 검증 완료된 자료만** 구현했습니다.

- ✅ **현행법령** (`target=law`) — 목록·본문
- ✅ **판례** (`target=prec`) — 목록·본문
- ⏳ **헌재결정례(detc) / 법령해석례(expc) / 행정심판례(decc) / 부처별 법령해석 / 위원회 결정례**
  - `registry.ts` 에 자료 유형은 노출되나 `enabled:false` (준비중) 상태입니다.
  - 목록 가이드 핸들러명만 확인했고 정확한 target 코드·파라미터는 미검증이므로, 공식 가이드 확인 후 `src/lib/law-api/adapters/` 에 동일한 어댑터 인터페이스로 추가하면 자동 연결됩니다.
- ⏳ **OpenAI 제공사**: fetch 기반 최소 구현(`src/lib/ai/openai.ts`). 정식 SDK 연동 및 검증은 추후.
- PDF 전용 내보내기: 1차 버전 제외(브라우저 인쇄로 대체).

## 라이선스 / 용도

개인용 로컬 도구. 회원가입·외부 배포·외부 전송 기능 없음.
