# BankCore Lab

동시 요청과 장애 상황에서도 거래 정합성을 보장하는 계좌이체 및 일 마감 대사 시스템입니다.

이 프로젝트는 화면 기능의 양보다 다음 은행 전산 핵심 역량을 증명하는 것을 목표로 합니다.

- 데이터베이스 트랜잭션과 동시성 제어
- 멱등성을 이용한 중복 이체 방지
- 복식부기 기반 거래 원장과 잔액 정합성
- 실패 복구가 가능한 일 마감 대사 배치
- 인증·인가, 개인정보 마스킹, 감사 로그
- 자동화 테스트, 부하 테스트, 모니터링 및 CI/CD

## 기술 방향

- Backend: Java 21, Spring Boot, Spring Security, JPA/QueryDSL
- Frontend: React, TypeScript, Vite
- Data: PostgreSQL, Redis
- Test: JUnit 5, Testcontainers, k6
- Operations: Docker Compose, GitHub Actions, Prometheus, Grafana
- Architecture: Modular Monolith

## 진행 상태

- [x] 1단계: 요구사항과 금융거래 규칙 정의
- [x] 2단계: 모듈 구조, ERD, API 설계
- [ ] 3단계: 회원·계좌 기본 기능
- [ ] 4단계: 입출금·이체 트랜잭션
- [ ] 5단계: 동시성과 멱등성
- [ ] 6단계: 거래 원장과 일 마감 대사
- [ ] 7단계: 인증·권한·감사 로그
- [ ] 8단계: 장애 복구와 재처리
- [ ] 9단계: 부하 테스트와 모니터링
- [ ] 10단계: 배포와 CI/CD
- [ ] 11단계: 포트폴리오 문서화
- [ ] 12단계: 자소서 및 기술면접 준비

## 문서

- [요구사항 및 금융거래 규칙](docs/requirements.md)
- [로컬 개발 환경 실행 안내](docs/local-development.md)
- [모듈 구조와 의존 방향](docs/architecture.md)
- [ERD와 데이터 사전](docs/data-model.md)
- [HTTP API 명세](docs/api.md)
- [설계 검증 및 요구사항 추적](docs/validation-plan.md)
- [ADR-0001: 모듈형 모놀리스 선택](docs/adr/0001-modular-monolith.md)
- [ADR-0002: 트랜잭션·멱등성·복구](docs/adr/0002-transaction-idempotency.md)
- [ADR-0003: 영업일 마감과 대사](docs/adr/0003-business-day-close.md)
- [1단계 면접 노트](docs/interview-notes/phase-01.md)
- [2단계 면접 노트](docs/interview-notes/phase-02.md)

## 현재 완료 범위

2026-09-14 기준 1·2단계 **설계 문서**를 완료했다. 2026-09-15에 3단계의 개발 환경(Spring Boot, React/Vite, PostgreSQL Compose)과 연결 확인 화면을 추가했다. 회원·계좌 기능, DB 마이그레이션, 자동화 금융 테스트와 성능 측정은 아직 없다. 금융 테스트 항목은 검증 계획이며 통과 실적을 의미하지 않는다.

설계 기준은 고객별 일일 이체 한도, PostgreSQL 행 잠금과 영속 멱등성 키, 단일 금융 커밋, 마감 스냅샷이다. Redis는 캐시/세션 확장 후보이며 초기 금융 정확성의 필수 구성요소가 아니다.

다음 작업은 3단계 마이그레이션, 회원·계좌 및 인증 기능 구현이다. 실행 방법과 고정한 버전은 로컬 개발 환경 안내를 따른다.

이 저장소의 설계 기준 문서는 이전 프로젝트 대화의 1단계 산출물을 이관한 뒤 보완했다. 설계 변경은 요구사항 변경 이력과 ADR에 남긴다. 기존 GitHub 초기 커밋 이력은 유지한다.

> 이 프로젝트의 한도와 금융 규칙은 학습용 가상 정책이며 실제 금융회사의 정책을 나타내지 않습니다. 실제 개인정보와 계좌정보는 사용하지 않습니다.
