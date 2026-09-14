# 2단계: HTTP API 명세 v1

상태: 설계 계약 · 2026-09-14. 서버/클라이언트 구현 전 기준이며 아직 호출 가능한 API가 아니다.

## 1. 공통 규약

- Prefix `/api/v1`, JSON UTF-8, 필드명 camelCase. 문서 표의 경로는 prefix 이후다.
- ID는 UUID 문자열, amount/balance/차액/한도는 10진 문자열. 요청 amount는 `^[1-9][0-9]{0,12}$` 형식이고 10^12 이하를 추가 검사한다. float/지수/음수/0/공백/선행 0은 거절한다.
- timestamp는 UTC RFC 3339(`2026-09-15T03:00:00Z`), businessDate는 `YYYY-MM-DD`다. 영업일 의미는 [마감 ADR](adr/0003-business-day-close.md)을 따른다.
- 인증은 서버 세션 쿠키. 배포 쿠키 이름 BANKCORE_SESSION, HttpOnly/Secure/SameSite=Lax. 로그인 시 세션 ID 교체, 로그아웃 시 무효화. 유휴 만료 30분을 초기값으로 한다.
- `GET /auth/csrf`에서 CSRF 토큰을 받고 모든 POST/PATCH에 `X-CSRF-TOKEN`을 보낸다. 로그인/로그아웃 이후 토큰을 다시 받는다. 세션 쿠키는 JS에서 읽지 않는다. 개발 Vite proxy와 배포 reverse proxy로 동일 origin을 유지한다.
- C=CUSTOMER, O=OPERATOR, A=ADMIN. 역할 자동 상속 없음. 고객 경로는 본인 리소스만, 타인 UUID는 `404 RESOURCE_NOT_FOUND`. 직원/관리자는 고객 경로에 접근할 수 없다.
- 공개 경로는 CSRF 발급/가입/로그인뿐이다. 비인증 `401`, 역할/CSRF 위반 `403`. 세션 역할과 별개로 서버는 중요한 요청에서 최신 회원 상태를 확인한다.
- `X-Request-ID`는 서버가 검증/발급한 UUID를 응답에 넣는다. 로그·감사와 연결하며 원문 비밀정보는 넣지 않는다.
- 목록은 `{items: [...], nextCursor: string|null}`. `size` 기본 20, 최대 100. 기본 `(createdAt DESC,id DESC)` keyset pagination. 커서는 서버가 검증하고 필터와 결합하며 잘못된 커서는 400이다. 대사 결과는 `accountId ASC`를 쓴다.
- 알 수 없는 요청 필드는 400으로 거절한다. 실제 OpenAPI 파일과 계약 테스트는 구현 단계에서 이 명세를 기준으로 만든다.

## 2. 요청/응답 DTO

| 이름 | 필수 필드 / 선택 필드 |
|---|---|
| SignupRequest | loginId(소문자 영문·숫자·underscore, 4~50자), password(12~72 UTF-8 bytes). 역할 입력 금지 |
| LoginRequest | loginId, password |
| Member | id, loginId, role, status. 비밀번호 해시 반환 금지 |
| Account | id, accountNumber, currency, balance, status, createdAt. accountNumber 전체값은 본인 전용 |
| MoneyRequest | amount, currency(항상 KRW) |
| TransferRequest | sourceAccountId, destinationAccountNumber(숫자 12자리), amount, currency |
| ScheduleRequest | TransferRequest 필드 + executeAt(현재보다 미래, 최대 30일) |
| Transaction | id, kind, status, amount, currency, businessDate(null 가능), createdAt, completedAt(null 가능), failureCode(null 가능) |
| Schedule | id, sourceAccountId, destinationAccountNumberMasked, amount, currency, executeAt, status, transactionId(null 가능), failureCode(null 가능), createdAt |
| HistoryItem | transactionId, kind, direction(DEBIT/CREDIT), amount, currency, businessDate, occurredAt. 완료된 본인 계좌 원장 항목만 |
| Limit | perTransactionLimit, dailyTransferLimit, usedToday, remainingToday, businessDate |
| OperatorTransaction | Transaction 필드 + sourceAccountNumberMasked?, destinationAccountNumberMasked?, scheduledTransferId? |
| ReconciliationRun | id, businessDate, status, attemptCount, processedCount, mismatchCount, hasMismatch, startedAt?, finishedAt?, lastErrorCode? |
| ReconciliationResult | accountId, accountNumberMasked, businessDate, status, storedBalance, ledgerBalance, difference |
| AuditEvent | id, actorId?, action, targetType, targetId?, outcome, errorCode?, occurredAt, requestId |

MASKED 계좌번호는 마지막 4자리만 남긴다(예: `********1234`). 수취 계좌가 다른 고객의 계좌인 경우 고객 이체 응답에서도 전체 번호를 반환하지 않는다. amount 외에 과거 거래 당시의 잔액/현재 잔액을 Transaction DTO에 섞지 않는다. 최신 잔액은 계좌 조회로 받는다.

## 3. 인증·회원·계좌

| Method / 경로 | 권한 | 요청 | 성공 / 주요 실패 |
|---|---|---|---|
| GET /auth/csrf | 공개 | 없음 | 200 `{token,headerName:"X-CSRF-TOKEN"}` |
| POST /members | 공개+CSRF | SignupRequest | 201 Member, 409 LOGIN_ID_TAKEN |
| POST /auth/login | 공개+CSRF | LoginRequest | 200 Member + 세션 쿠키, 401 INVALID_CREDENTIALS |
| POST /auth/logout | 로그인+CSRF | 없음 | 204, 세션 제거 |
| GET /members/me | 로그인 | 없음 | 200 Member |
| POST /accounts | C | `{currency:"KRW"}` | 201 Account(balance="0"), 503 DAY_CLOSING |
| GET /accounts | C | cursor?,size? | 200 Account 목록 |
| GET /accounts/{accountId} | C | 없음 | 200 Account, 404 |
| POST /accounts/{accountId}/close | C | `{}` | 200 Account(CLOSED), 409 ACCOUNT_NOT_EMPTY/PENDING_SCHEDULE_EXISTS |
| GET /accounts/{accountId}/transactions | C | cursor?,size?,from?,to? | 200 HistoryItem 목록 |
| GET /members/me/transfer-limit | C | 없음 | 200 Limit |

계좌 생성은 멱등성 키 대상이 아니다. 응답 유실 시 계좌 목록을 확인하고 무조건 재전송하지 않는다. 계좌 해지는 이미 CLOSED이면 200으로 현재 상태를 반환한다. 이력의 from은 포함/to는 제외, UTC 시각, 기본 최근 30일·최대 조회 폭 90일이다. 비활성 회원 로그인 거절 메시지는 비밀번호 오류와 구분하지 않는다.

## 4. 입금·출금·이체·예약

아래 금액 생성 및 예약 등록 POST는 `Idempotency-Key` 필수다(16~128자의 ASCII `A-Z a-z 0-9 . _ : -`). 키 범위는 고객 전체, 같은 키+같은 정규화 요청은 같은 리소스/확정 응답, 다른 요청은 409다. 키는 MVP에서 만료시키지 않는다.

| Method / 경로 | 권한 | 요청 | 성공 / 주요 실패 |
|---|---|---|---|
| POST /accounts/{accountId}/deposits | C | MoneyRequest | 201 Transaction 또는 202, 422 BALANCE_LIMIT_EXCEEDED |
| POST /accounts/{accountId}/withdrawals | C | MoneyRequest | 201 Transaction 또는 202, 422 INSUFFICIENT_FUNDS |
| POST /transfers | C | TransferRequest | 201 Transaction 또는 202, 422 DAILY_LIMIT_EXCEEDED |
| GET /transactions/{transactionId} | C | 없음 | 200 Transaction(PENDING/COMPLETED/FAILED), 404 |
| POST /scheduled-transfers | C | ScheduleRequest | 201 Schedule, 422 INVALID_EXECUTION_TIME |
| GET /scheduled-transfers | C | cursor?,size?,status? | 200 Schedule 목록 |
| GET /scheduled-transfers/{scheduleId} | C | 없음 | 200 Schedule, 404 |
| POST /scheduled-transfers/{scheduleId}/cancel | C | `{}` | 200 Schedule(CANCELLED), 409 SCHEDULE_ALREADY_PROCESSING/SCHEDULE_ALREADY_FINISHED |

다른 요청의 STATUS 오류: ACCOUNT_NOT_ACTIVE, SAME_ACCOUNT, TRANSACTION_LIMIT_EXCEEDED, INVALID_RECIPIENT(존재하지 않는 계좌), CURRENCY_NOT_SUPPORTED. 수취 계좌 존재 여부만 최소한으로 오류에 드러내며 실명·잔액은 제공하지 않는다. 실제 금융용 계좌 유효성 조회/실명 인증은 제외 범위다.

예약 등록은 형식/소유권/계좌 상태/1회 한도/미래 시각을 확인한다. 실행 시 다시 검증하며 잔액·일일 한도는 선점하지 않는다. 취소 API는 CANCELLED 재요청이면 200, 종결된 성공/실패 예약이면 409다. 예약 등록 동일 키 재요청은 최초 201 응답을 재생하므로 현재 상태는 GET으로 확인한다.

### 정상 이체 예시

```http
POST /api/v1/transfers
Content-Type: application/json
Idempotency-Key: demo-transfer-000001
X-CSRF-TOKEN: <발급된 토큰>

{
  "sourceAccountId": "11111111-1111-4111-8111-111111111111",
  "destinationAccountNumber": "100000000002",
  "amount": "30000",
  "currency": "KRW"
}
```

```json
{
  "id": "22222222-2222-4222-8222-222222222222",
  "kind": "TRANSFER",
  "status": "COMPLETED",
  "amount": "30000",
  "currency": "KRW",
  "businessDate": "2026-09-14",
  "createdAt": "2026-09-14T04:00:00Z",
  "completedAt": "2026-09-14T04:00:00.100Z",
  "failureCode": null
}
```

201에는 `Location: /api/v1/transactions/{id}`. 처리가 진행 중이면 202, 동일한 Location 및 `Retry-After: 2`, Transaction(status=PENDING, businessDate/completedAt=null). 최초 키를 유지하여 재요청하거나 GET으로 확인한다. 버튼 비활성화만으로 중복 방지를 구현하지 않는다. 확정 실패를 조회하는 GET 자체는 200이고 Transaction.status=FAILED다.

## 5. 직원·관리자

| Method / 경로 | 권한 | 요청/필터 | 성공 / 주요 실패 |
|---|---|---|---|
| GET /operator/transactions | O | transactionId?,status?,businessDate?,cursor?,size? | 200 OperatorTransaction 목록 |
| GET /operator/transactions/{id} | O | 없음 | 200 OperatorTransaction |
| PATCH /operator/accounts/{id}/status | O | `{status:"FROZEN" 또는 "ACTIVE"}` | 200 `{id,status}`, 409 ACCOUNT_CLOSED |
| GET /operator/reconciliations | O | businessDate?,cursor?,size? | 200 ReconciliationRun 목록 |
| GET /operator/reconciliations/{runId} | O | 없음 | 200 ReconciliationRun |
| GET /operator/reconciliations/{runId}/results | O | status?,cursor?,size? | 200 ReconciliationResult 목록 |
| POST /operator/reconciliations/{runId}/retry | O | `{}` | 202 ReconciliationRun, 409 RUN_NOT_RETRYABLE |
| GET /operator/audit-events | O | from?,to?,action?,cursor?,size? | 200 AuditEvent 목록 |
| PATCH /admin/members/{id}/role | A | `{role:"CUSTOMER" 또는 "OPERATOR" 또는 "ADMIN"}` | 200 Member, 409 LAST_ADMIN |
| PATCH /admin/members/{id}/transfer-limit | A | `{perTransactionLimit,dailyTransferLimit}` 문자열 | 200 `{memberId,perTransactionLimit,dailyTransferLimit}` |

직원 거래 필터의 기본 조회 범위는 최근 30일 접수 거래이며 사업일 필터는 실행일로 추가 제한한다. 마감 목록은 생성 시각·ID 내림차순, 결과는 accountId 오름차순이다. 감사 조회 기간 기본 7일, 최대 30일. 원문 요청/비밀번호/인증 헤더는 어떤 관리자 응답에도 포함하지 않는다.

대사 재실행은 FAILED 또는 heartbeat가 만료된 RUNNING만 재개한다. READY는 스케줄러가 실행한다. 재실행 시작과 함께 attemptCount를 늘리는 판단은 run 행 잠금 아래 수행한다. 완료된 run 재실행이나 실행 중 중복 요청은 409다. 재시도 응답에는 Location을 넣는다. 마감 자체의 강제 실행/과거 수정은 운영 HTTP API로 노출하지 않는다.

마지막 ACTIVE ADMIN을 제거하는 역할 변경은 금지한다. 모든 역할 변경은 관리자 집합 검사용 전용 DB 트랜잭션 잠금(구현 시 고정 advisory lock ID)을 먼저 얻고, 대상 customer_policies 행 잠금 뒤 현재 ADMIN 수를 다시 센다. 금융 실행은 이 관리자 잠금을 요청하지 않는다. 관리 행위 및 직원 보호 조회는 감사 기록을 남긴다.

## 6. 오류 계약

```json
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "잔액이 부족합니다.",
    "requestId": "33333333-3333-4333-8333-333333333333",
    "transactionId": "22222222-2222-4222-8222-222222222222",
    "retryable": false
  }
}
```

transactionId는 접수된 거래가 있을 때만 포함한다. 현재 HTTP requestId는 요청마다 새로 붙이고 저장된 거래 실패 코드/메시지만 재사용한다. 따라서 재요청 시 금융 결과는 동일하되 추적 ID는 다를 수 있다. 서버 stack trace와 SQL은 반환하지 않는다.

| HTTP | 대표 code | 키/거래 처리 |
|---|---|---|
| 400 | INVALID_REQUEST, IDEMPOTENCY_KEY_REQUIRED, INVALID_CURSOR | 접수 전 거절, 키 미소비 |
| 401 | AUTHENTICATION_REQUIRED, INVALID_CREDENTIALS | 접수 전 거절 |
| 403 | FORBIDDEN, CSRF_INVALID | 사전 거절. 실행 시 권한 상실이면 접수 거래 FAILED |
| 404 | RESOURCE_NOT_FOUND | 타인/없는 리소스를 동일하게 처리 |
| 409 | IDEMPOTENCY_CONFLICT, ACCOUNT_NOT_EMPTY, PENDING_SCHEDULE_EXISTS, RUN_NOT_RETRYABLE | 추가 금융 반영 없음 |
| 422 | INSUFFICIENT_FUNDS, ACCOUNT_NOT_ACTIVE, TRANSACTION_LIMIT_EXCEEDED, DAILY_LIMIT_EXCEEDED, BALANCE_LIMIT_EXCEEDED, SAME_ACCOUNT, INVALID_RECIPIENT, INVALID_EXECUTION_TIME, CURRENCY_NOT_SUPPORTED | 형식/참조 거절은 미접수, 접수 후 업무 거절은 FAILED |
| 503 | TEMPORARILY_UNAVAILABLE, DAY_CLOSING | 커밋 여부를 단정하지 않음. 원래 키 유지, 조회/재요청 |

로그인 속도 제한은 3단계 보안 골격에서 구체화한다. 런타임 지표/헬스는 공개 고객 API에 포함하지 않으며 운영 네트워크와 권한으로 제한한다.
