# 국가법령정보 공동활용 Open API 조사 결과 (api-targets.md)

> 출처: 국가법령정보 공동활용 (open.law.go.kr) 공식 OPEN API 활용가이드
> 조사일: 2026-07-18
> 이 문서에 기록된 target 코드/파라미터/응답필드는 **공식 가이드 페이지에서 실제로 확인한 값**만 기재한다.
> 확인하지 못한 값은 "미확인"으로 표시하며, 코드에서 추측하지 않는다.

## 0. 공통 사항

- **인증값(OC)**: 회원가입 후 발급되는 이메일 아이디 앞부분(신청한 API 인증값). 모든 요청에 `OC` 파라미터로 전달.
- **목록 조회 Base URL**: `http://www.law.go.kr/DRF/lawSearch.do`
- **본문 조회 Base URL**: `http://www.law.go.kr/DRF/lawService.do`
- **출력형태(type)**: `HTML` / `XML` / `JSON` — 본 프로젝트는 `XML`을 파싱해 정규화한다(JSON 미지원 target 대비). 국세청 판례는 HTML만 가능.
- 모든 호출은 **서버 사이드(route handler)** 에서만 수행하며 `OC` 키가 클라이언트로 노출되지 않게 한다.

---

## 1. 법령 (현행법령) — target=`law`  ✅ 확인 완료

### 1-1. 목록 조회 (guide: `lsNwListGuide`)
- **URL**: `GET http://www.law.go.kr/DRF/lawSearch.do`
- **target**: `law`

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| OC | string | Y | 신청한 API 인증값 |
| target | string | Y | `law` |
| type | char | Y | HTML / XML / JSON |
| search | int | N | 검색범위 1=법령명(기본) 2=본문검색 |
| query | string | N | 검색어(법령명) |
| display | int | N | 결과 개수 (default=20, **max=100**) |
| page | int | N | 페이지 (default=1) |
| sort | string | N | lasc/ldes/dasc/ddes/nasc/ndes/efasc/efdes |
| date | int | N | 공포일자 |
| efYd | string | N | 시행일자 범위 (YYYYMMDD~YYYYMMDD) |
| ancYd | string | N | 공포일자 범위 (YYYYMMDD~YYYYMMDD) |
| ancNo | string | N | 공포번호 범위 |
| rrClsCd | string | N | 제개정 종류 코드 |
| nb | int | N | 공포번호 |
| org | string | N | 소관부처 코드 |
| knd | string | N | 법령종류 코드 |
| lsChapNo | string | N | 법령분류 (01~44편) |
| gana | string | N | 사전식 검색(ga,na,da…) |
| popYn | string | N | 상세화면 팝업 여부(Y) |

**응답 필드**: `target, 키워드, section, totalCnt, page, law id, 법령일련번호, 현행연혁코드, 법령명한글, 법령약칭명, 법령ID, 공포일자, 공포번호, 제개정구분명, 소관부처명, 소관부처코드, 법령구분명, 공동부령구분, 시행일자, 자법타법여부, 법령상세링크`

### 1-2. 본문 조회 (guide: `lsNwInfoGuide`)
- **URL**: `GET http://www.law.go.kr/DRF/lawService.do`
- **target**: `law`

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| OC | string | Y | 인증값 |
| target | string | Y | `law` |
| type | char | Y | HTML / XML / JSON |
| ID | char | N* | 법령 ID (**ID 또는 MST 중 하나 필수**) |
| MST | char | N* | 법령 마스터 번호 |
| LM | string | N | 법령명 |
| LD | int | N | 공포일자 |
| LN | int | N | 공포번호 |
| JO | int | N | 조번호 |
| LANG | char | N | KO(한글)/ORI(원문) |

**응답 필드(요지)**: `법령ID, 공포일자, 공포번호, 법령명_한글, 소관부처, 시행일자, 조문번호, 조문내용, 항번호, 항내용, 호번호, 호내용, 별표번호, 별표제목, 부칙내용, 개정문내용`

> 목록 응답의 `법령ID`(또는 법령일련번호=MST)를 본문 조회의 `ID`/`MST`로 사용한다.

---

## 2. 판례 — target=`prec`  ✅ 확인 완료

### 2-1. 목록 조회 (guide: `precListGuide`)
- **URL**: `GET http://www.law.go.kr/DRF/lawSearch.do`
- **target**: `prec`

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| OC | string | Y | 인증값 |
| target | string | Y | `prec` |
| type | char | Y | HTML / XML / JSON |
| search | int | N | 1=판례명(기본) 2=본문검색 |
| query | string | N | 검색어 |
| display | int | N | 결과 개수 (default=20, **max=100**) |
| page | int | N | 페이지 (default=1) |
| org | string | N | 법원종류 (대법원:400201, 하위법원:400202) |
| curt | string | N | 법원명 (예: 대법원, 서울고등법원) |
| JO | string | N | 참조법령명 (형법, 민법 등) |
| gana | string | N | 사전식 검색 |
| sort | string | N | lasc/ldes/dasc/ddes/nasc/ndes |
| date | int | N | 판례 선고일자 |
| prncYd | string | N | 선고일자 범위 (예: 20090101~20090130) |
| nb | string | N | 판례 사건번호 |
| datSrcNm | string | N | 데이터출처명 |
| popYn | string | N | 팝업 여부(Y) |

**응답 필드**: `target, 공포번호, 키워드, section, totalCnt, page, prec id, 판례일련번호, 사건명, 사건번호, 선고일자, 법원명, 법원종류코드, 사건종류명, 사건종류코드, 판결유형, 선고, 데이터출처명, 판례상세링크`

### 2-2. 본문 조회 (guide: `precInfoGuide`)
- **URL**: `GET http://www.law.go.kr/DRF/lawService.do`
- **target**: `prec`

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| OC | string | Y | 인증값 |
| target | string | Y | `prec` |
| type | char | Y | HTML / XML / JSON (국세청 판례는 HTML만) |
| ID | char | Y | 판례 일련번호 |
| LM | string | N | 판례명 |

**응답 필드**: `판례정보일련번호, 사건명, 사건번호, 선고일자, 선고, 법원명, 법원종류코드, 사건종류명, 사건종류코드, 판결유형, 판시사항, 판결요지, 참조조문, 참조판례, 판례내용`

---

## 3. 확장 예정 자료 (구조만 준비, 어댑터는 단계적 연결)

아래 target 코드/가이드명은 공식 guideList.do 에서 **핸들러명만 확인**했고, 상세 파라미터/필드는 각 가이드 페이지 확인 후 어댑터를 추가한다. 확인 전에는 registry에 `enabled: false` 로 등록한다.

| 자료 | 목록 guide | 본문 guide | 예상 target | 상태 |
|---|---|---|---|---|
| 헌재결정례 | `detcListGuide` | `detcInfoGuide` | `detc`(추정, 미확인) | 미구현 |
| 법령해석례 | `expcListGuide` | `expcInfoGuide` | `expc`(추정, 미확인) | 미구현 |
| 행정심판례 | `deccListGuide` | `deccInfoGuide` | `decc`(추정, 미확인) | 미구현 |
| 부처별 법령해석 | `cgmExpc*ListGuide` (부처별) | `cgmExpc*InfoGuide` | 미확인 | 미구현 |
| 위원회 결정례 | (부처/위원회별) | | 미확인 | 미구현 |

> 위 "예상 target"은 목록 핸들러명에서 유추한 값이며 **공식 파라미터 표로 검증되기 전까지 코드에 사용하지 않는다.**

---

## 4. 제한사항 / 주의점

- `display` 최대 100건 → 그 이상은 `page` 페이징 필요.
- 정렬 옵션은 자료별로 다름(판례는 efasc/efdes 없음).
- 응답 필드명이 **한글 키**이므로 XML 파싱 후 `normalize.ts`에서 영문 필드로 매핑한다.
- 일부 자료(국세청 판례 등)는 JSON/XML 미지원 → HTML만 제공되는 경우가 있어 어댑터별 type 협상 필요.
- API는 호출량/이용약관 제한이 있을 수 있으므로 재시도·타임아웃·에러 처리를 클라이언트 계층에서 통일한다.
