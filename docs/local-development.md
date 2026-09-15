# 내 Mac에서 개발 환경 실행하기

## 현재 구성

세 프로그램을 Mac 한 대에서 실행한다. 외부 서버 계약이나 포트포워딩은 필요 없다. PostgreSQL은 Docker 컨테이너, Spring Boot와 React는 로컬 개발 프로세스다.

| 구성 | 주소/버전 | 역할 |
|---|---|---|
| React 19.3.0 + Vite 8.3.0 | http://127.0.0.1:5173 | 브라우저에 화면 제공 |
| Spring Boot 3.5.16 + Java 21 | http://127.0.0.1:8080 | API 처리, DB 연결 |
| PostgreSQL 18.6 | 127.0.0.1:5432 | bankcore 데이터베이스 |

브라우저 → Vite의 프록시 → Spring Boot → PostgreSQL 순서다. React에 DB 비밀번호를 전달하지 않는다. health 화면은 Spring Boot의 `/actuator/health`를 호출하며 DB 연결을 포함한 서버 health가 UP인지 표시한다. 이 주소는 개발 환경에서만 사용한다.

2026-09-15 이 Mac에서는 Node 24.11.1, npm 11.6.2, Java 21, Docker Desktop/Compose가 이미 설치되어 있었다. 기본 Java는 22였으므로 실행 스크립트가 Java 21을 선택한다. 시스템 전체 Java 설정은 변경하지 않는다.

## 첫 설정 — 현재 Mac에서는 이미 완료

프로젝트를 새로 내려받은 경우에만 아래를 수행한다.

```bash
cd "/Users/jun/Desktop/BankCore Lab"
node scripts/setup.mjs
cd frontend
npm ci
```

`setup.mjs`는 `.env`가 없을 때 무작위 DB 비밀번호를 생성하며 기존 파일은 유지한다. `.env`는 Git에서 제외되고 파일 권한은 생성 시 소유자만 읽고 쓰도록 설정된다. Gradle은 프로젝트의 Wrapper가 첫 실행 때 내려받으므로 별도 전역 설치가 필요 없다. 배포된 Gradle 압축 파일의 체크섬을 Wrapper 설정에 고정했다.

다른 Mac에서는 Java 21/Node/Docker Desktop 설치가 먼저 필요하다. `.nvmrc`는 이 프로젝트에서 검증한 Node 버전을 기록하며 nvm 사용 시 루트에서 `nvm use`로 선택한다.

## 매일 시작하기

Codex가 이미 켜 둔 서버가 실행 중이면 아래 명령을 중복 실행할 필요가 없다. 먼저 개발 화면을 열어 확인한다. 직접 실행하는 방식으로 전환할 때는 Codex에 기존 개발 서버 종료를 요청한 뒤 아래 절차를 따른다.

### 1. Docker와 PostgreSQL

Mac의 터미널에서 실행한다. Docker Desktop이 이미 실행 중이면 앱을 다시 열어도 된다.

```bash
cd "/Users/jun/Desktop/BankCore Lab"
open -a Docker
docker compose up -d --wait
docker compose ps
```

Docker가 아직 시작 중이라는 오류가 나오면 앱의 실행 완료를 기다린 뒤 compose 명령을 다시 실행한다. `healthy`이면 DB 준비 완료다. 이 터미널은 DB를 시작한 뒤 닫아도 된다. Docker Desktop의 Containers에서도 `bankcore-lab` 프로젝트를 볼 수 있다.

### 2. Spring Boot

터미널 창/탭 하나에서 실행한다.

```bash
cd "/Users/jun/Desktop/BankCore Lab"
./scripts/backend.sh
```

이 명령은 `.env`를 읽고 Java 21로 `backend/gradlew bootRun`을 실행한다. 최초 빌드에는 의존성 다운로드 시간이 든다. `Started BankCoreApplication`이 나오면 실행 완료다. **이 터미널은 실행 중 계속 열어 둔다.**

### 3. React

새 터미널 창/탭에서 실행한다.

```bash
cd "/Users/jun/Desktop/BankCore Lab/frontend"
npm run dev
```

**이 터미널도 열어 둔다.** 브라우저에서 [개발 화면](http://127.0.0.1:5173)을 열고 `Spring Boot + PostgreSQL: 연결 정상`인지 확인한다. 연결이 되지 않으면 화면의 다시 확인 버튼으로 재조회한다.

개발할 때는 서버 두 개를 실행한 채 코드를 수정한다. 프런트엔드는 저장하면 Vite가 반영한다. 현재 백엔드에는 DevTools가 없으므로 Java 변경 후 Ctrl+C로 멈추고 다시 실행한다.

## 종료하기 / 다시 시작하기

Spring Boot와 React는 각각 실행한 터미널에서 **Ctrl+C**를 누른다. PostgreSQL은 프로젝트 루트에서 다음을 실행한다.

```bash
docker compose stop
```

다음에는 위의 시작 명령을 다시 실행하면 된다. Docker volume에 DB 데이터를 보관하므로 일반 stop/start로 지워지지 않는다. `docker compose down -v`는 데이터를 삭제하는 명령이므로 일상적인 종료에 사용하지 않는다. Mac을 재시작하면 개발 서버는 다시 실행해야 한다. PostgreSQL은 Docker 실행 후 재시작 정책에 따라 자동 실행될 수도 있으므로 compose ps로 확인한다.

## 확인 명령과 문제 해결

프로젝트 루트에서:

```bash
docker compose ps
curl --fail http://127.0.0.1:8080/actuator/health
curl --fail http://127.0.0.1:5173/actuator/health
docker compose exec postgres psql -U bankcore -d bankcore
```

두 health 응답은 모두 `{"status":"UP"}`이면 정상이다. 두 번째는 Vite 프록시까지 확인한다. psql에서 `SELECT current_database();`로 연결을 확인하고 `\q`로 빠져나온다. DB에는 아직 회원/계좌 테이블을 만들지 않았다.

| 증상 | 확인할 것 |
|---|---|
| Cannot connect to the Docker daemon | Docker Desktop 실행 완료 후 다시 시도 |
| 5432/8080/5173 already in use | 이전 서버 터미널이 남아 있는지 확인. `lsof -nP -iTCP:5432 -iTCP:8080 -iTCP:5173 -sTCP:LISTEN`으로 주체 확인 |
| 화면은 보이나 연결 확인 필요 | 백엔드 시작 로그, `docker compose ps`, 직접 health 응답 순으로 확인 |
| health 503/DOWN | DB 중단 또는 인증 실패. PostgreSQL과 Spring Boot 로그 확인 |
| 비밀번호 인증 실패 | 기존 DB volume의 비밀번호와 .env가 일치하는지 확인. .env를 다시 생성해도 기존 DB 비밀번호는 자동 변경되지 않음 |
| /api/v1/accounts가 403 | 현재는 정상. 업무 API 구현 전 모든 업무 경로를 닫아 둠 |
| frontend preview에서 연결 실패 | preview는 빌드 결과 미리보기다. 현재 API 연결 검증은 `npm run dev`에서 수행 |

DB 비밀번호는 로컬 `.env`에서 확인한다. `bankcore` 사용자는 이 개발 DB 초기화를 위한 계정이며 운영 배포 시에는 마이그레이션 사용자와 제한된 앱 사용자를 분리한다. 지금 실행 설정은 모두 루프백 주소에 바인딩하며 인터넷 공개 배포용이 아니다.

## 빌드와 테스트

```bash
cd "/Users/jun/Desktop/BankCore Lab"
./scripts/backend.sh test bootJar
cd frontend
npm run build
```

백엔드 테스트는 공개 health/차단된 업무 경로의 보안 규칙을 검사한다. DB 연결은 실행 중인 health와 PostgreSQL 쿼리로 별도 확인한다. 회원·계좌/금융 정합성 테스트는 아직 구현하지 않았다.

2026-09-15 실제 검증: 백엔드 보안 테스트 2개 통과 및 bootJar 생성, 프런트엔드 TypeScript 검사/프로덕션 빌드 통과. PostgreSQL 18.6 쿼리 실행, 직접/프록시 health UP, 미구현 업무 경로 403, 브라우저 연결 정상 표시를 확인했다. DB 중단 시 프록시 health가 HTTP 503/DOWN, 재시작 후 UP으로 복구됨을 확인했다. `.env`와 빌드/의존성 폴더가 Git에서 제외되는 것도 확인했다.

## 이번 작업 범위와 다음 작업

3단계 중 개발 환경과 연결 확인 화면을 구성했다. 회원가입, 로그인/세션, 계좌 개설, ERD에 따른 Flyway 마이그레이션은 이어서 진행한다. `.env`, 빌드 산출물, node_modules는 업로드하지 않고 실행 코드·설정·lockfile만 GitHub에 올린다.

Java 21 및 JUnit 5 기반 기존 설계와 맞추어 Spring Boot 3.5 계열을 선택했다. 메이저 버전 전환은 별도 호환성 검토 후 진행한다. 참고: [Spring Boot 3.5 실행 요구사항](https://docs.spring.io/spring-boot/3.5/system-requirements.html), [Vite 시작 안내](https://vite.dev/guide/), [PostgreSQL 공식 Docker 이미지 및 18+ volume 경로](https://hub.docker.com/_/postgres).
