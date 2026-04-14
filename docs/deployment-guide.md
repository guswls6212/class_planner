# class-planner 배포 가이드

AWS Lightsail + Docker + Nginx + Let's Encrypt SSL 기반 배포 절차.
Supabase(Auth + DB)는 클라우드 서비스 그대로 사용하는 하이브리드 구조.

> 최초 작성: 2026-04-10 (Phase 1 인프라 마이그레이션)


## 인프라 구성도

```
사용자 → DNS(info365.studio)
       → AWS Lightsail (13.209.250.174)
         → Nginx (80/443) → Next.js 컨테이너 (:3000)
         → Certbot (SSL 자동 갱신)
       → Supabase Cloud (Auth + PostgreSQL)
```

| 구성 요소 | 역할 | 비고 |
|-----------|------|------|
| Lightsail 인스턴스 | Next.js 앱 서버 | 1GB RAM, Ubuntu 24.04, ap-northeast-2 |
| Docker + Compose | 컨테이너 오케스트레이션 | 3개 서비스 (app, nginx, certbot) |
| Nginx | 리버스 프록시 + SSL 종료 | HTTP→HTTPS 리다이렉트 |
| Let's Encrypt | SSL 인증서 | 90일 자동 갱신 |
| Supabase | Auth + PostgreSQL DB | 별도 클라우드, SDK로 연결 |


## 환경 변수 설정

### 로컬 개발 환경 (.env.local)

프로젝트 루트에 `.env.local` 파일 생성 (git 미포함):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# E2E 테스트 전용 계정 (선택사항)
TEST_EMAIL=your-test-email@gmail.com
TEST_PASSWORD=your-test-password
```

확인:
```bash
npm run dev
# 브라우저 콘솔: console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
```

### 키 종류 설명

| 변수 | 공개 여부 | 사용 위치 | 설명 |
|------|----------|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 공개 OK | 프론트 + 백엔드 | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 공개 OK | 프론트엔드 | 공개 키, RLS 정책 적용됨 |
| `SUPABASE_SERVICE_ROLE_KEY` | **비공개** | API Routes만 | RLS 우회, 서버사이드 전용 |

**보안 규칙:**
- `service_role` 키는 절대 프론트엔드(`NEXT_PUBLIC_*`)에 노출 금지
- `.env.local`, `.env.production` 파일은 Git 커밋 금지
- Next.js: `NEXT_PUBLIC_` 접두사 변수는 클라이언트 번들에 하드코딩됨 (빌드 타임 주입)

### Supabase API 키 확인

Supabase 대시보드 → Settings → API → Project URL + anon public + service_role

---

## 사전 준비

### 1. SSH 설정 (로컬 Mac)

`~/.ssh/config`에 호스트 등록:

```
Host class-planner
    HostName 13.209.250.174
    User ubuntu
    IdentityFile ~/.ssh/LightsailDefaultKey-ap-northeast-2.pem
```

각 항목 설명:
- `Host class-planner`: 별칭. `ssh class-planner`로 접속 가능하게 해줌
- `HostName`: Lightsail 인스턴스의 고정 IP 주소
- `User ubuntu`: Lightsail Ubuntu 인스턴스의 기본 사용자
- `IdentityFile`: Lightsail에서 발급한 SSH 프라이빗 키 경로

키 파일 권한 설정 (최초 1회):
```bash
chmod 400 ~/.ssh/LightsailDefaultKey-ap-northeast-2.pem
```
- `chmod 400`: 소유자만 읽기 가능. SSH는 키 파일 권한이 너무 열려있으면 접속을 거부함

### 2. DNS 설정

도메인 관리 패널(Vercel 등)에서 A 레코드 추가:
- 호스트: `class-planner`
- 타입: `A`
- 값: `13.209.250.174` (Lightsail 고정 IP)

### 3. 환경변수 파일 (.env.production)

프로젝트 루트에 `.env.production` 필요. git에 포함되지 않으므로 수동 관리:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

이 파일은 두 군데에서 사용됨:
1. Docker 빌드 시 — `NEXT_PUBLIC_*` 변수가 Next.js 번들에 하드코딩됨 (빌드 타임)
2. 컨테이너 런타임 시 — `env_file`로 주입되어 서버사이드에서 사용됨


## 배포 절차

### 1단계: 프로젝트 파일을 서버로 전송

```bash
rsync -avz \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='coverage' \
  --exclude='test-results' \
  --exclude='playwright-report' \
  ~/lee_file/entrepreneur/project/dev-pack/class-planner/ \
  class-planner:~/class-planner/
```

명령어 분해:
- `rsync`: 파일 동기화 도구. scp보다 똑똑해서 변경된 파일만 전송
- `-a` (archive): 파일 권한, 타임스탬프, 디렉토리 구조 전부 보존
- `-v` (verbose): 전송되는 파일 목록을 터미널에 표시
- `-z` (compress): 전송 중 데이터 압축 (네트워크 트래픽 절감)
- `--exclude='node_modules'`: 수백MB짜리 의존성 폴더 제외. 서버에서 Docker 빌드 시 `npm ci`로 새로 설치함
- `--exclude='.next'`: Next.js 빌드 캐시 제외. 서버에서 새로 빌드함
- `--exclude='coverage'` 등: 테스트 산출물 제외. 서버에서 불필요
- 마지막 `/`(trailing slash): 디렉토리 내용물을 대상 경로에 직접 복사 (슬래시 없으면 디렉토리 자체가 복사됨)

### 2단계: 서버 초기 셋업

```bash
ssh class-planner
chmod +x ~/class-planner/scripts/setup-server.sh
~/class-planner/scripts/setup-server.sh
```

- `ssh class-planner`: SSH 접속 (위에서 설정한 별칭 사용)
- `chmod +x`: 스크립트에 실행 권한 부여. rsync 복사 시 권한이 빠질 수 있음
- `setup-server.sh`: 아래 6단계를 자동 수행

**setup-server.sh 내부 동작:**

| 단계 | 명령어 | 설명 |
|------|--------|------|
| 1/6 | `sudo apt-get update -y && upgrade -y` | OS 패키지 목록 갱신 + 보안 업데이트 적용 |
| 2/6 | `curl -fsSL https://get.docker.com \| sudo sh` | Docker 공식 설치 스크립트 실행 |
| | `sudo usermod -aG docker $USER` | 현재 유저를 docker 그룹에 추가 (`sudo` 없이 docker 사용 가능) |
| 3/6 | `sudo apt-get install -y docker-compose-plugin` | Docker Compose 플러그인 설치 |
| 4/6 | `sudo apt-get install -y git` | Git 설치 (향후 서버에서 직접 pull 가능) |
| 5/6 | `mkdir -p $APP_DIR` | 앱 디렉토리 생성 |
| 6/6 | 각 도구 버전 출력 | 정상 설치 확인 |

**Docker 첫 설치 후 필수:** 로그아웃 → 재접속 해야 docker 그룹 권한 적용됨.
```bash
exit
ssh class-planner
```

### 2.5단계: Swap 메모리 추가 (1GB RAM 서버 필수)

Next.js 프로덕션 빌드는 메모리를 많이 사용함. 1GB RAM으로는 빌드 중 OOM(Out of Memory)으로 서버가 멈출 수 있음. 반드시 swap을 추가한 후 빌드할 것.

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

명령어 분해:
- `fallocate -l 2G /swapfile`: 2GB 크기의 빈 파일 생성. 이 파일이 가상 메모리로 사용됨
- `chmod 600`: 소유자(root)만 읽기/쓰기 가능. 보안상 필수
- `mkswap`: 파일을 swap 형식으로 포맷
- `swapon`: swap 활성화. 이 시점부터 시스템이 디스크를 가상 메모리로 사용
- `echo ... >> /etc/fstab`: 서버 재부팅 시에도 swap이 자동 활성화되도록 등록

확인:
```bash
free -h
# Swap: 2.0Gi 가 보이면 성공
```

### 3단계: .env 심볼릭 링크 생성

Docker Compose는 빌드 args(`${VARIABLE}` 형태)를 치환할 때 `.env` 파일만 자동으로 읽음. `.env.production`은 런타임 `env_file`에서만 인식됨.

```bash
cd ~/class-planner
ln -sf .env.production .env
```

- `ln -sf`: 심볼릭 링크 생성. `-s`는 심볼릭, `-f`는 기존 링크 덮어쓰기
- 효과: `.env` → `.env.production`을 가리키므로 docker compose가 빌드 시 환경변수를 읽을 수 있음

### 4단계: 배포 실행

```bash
cd ~/class-planner
./scripts/deploy.sh
```

**deploy.sh 내부 동작:**

#### [1/4] Docker 이미지 빌드

```bash
docker compose build --no-cache
```

- `docker compose build`: `docker-compose.yml`에 정의된 서비스의 Docker 이미지를 빌드
- `--no-cache`: 이전 빌드 캐시 무시. 환경변수나 코드 변경이 확실히 반영되도록 함

**빌드 과정 (Dockerfile 3단계 멀티스테이지):**

```
[base]     node:20-alpine 베이스 이미지
    ↓
[builder]  npm ci → 소스 복사 → npm run build (Next.js 프로덕션 빌드)
    ↓        ├─ ARG로 NEXT_PUBLIC_* 환경변수를 받아 빌드에 주입
    ↓        └─ standalone 모드로 빌드 (.next/standalone 생성)
    ↓
[runner]   standalone 결과물만 복사 → node server.js로 실행
             ├─ nextjs 유저로 실행 (보안: root 아님)
             └─ 최종 이미지 크기 최소화 (빌드 도구 미포함)
```

빌드 시간: 1GB+swap 서버에서 약 2분 소요.

#### [2/4] HTTP 모드로 초기 기동

```bash
cp nginx/init-ssl.conf nginx/active.conf
docker compose up -d class-planner nginx
```

- `cp nginx/init-ssl.conf nginx/active.conf`: SSL 인증서가 아직 없으므로 HTTP 전용 Nginx 설정을 사용
- `docker compose up -d`: 백그라운드(`-d`)로 컨테이너 시작
- `class-planner nginx`: certbot은 제외하고 앱+nginx만 먼저 기동

**init-ssl.conf 역할:**
- 80번 포트(HTTP)로 요청 수신
- `/.well-known/acme-challenge/` 경로는 certbot 인증용으로 열어둠
- 나머지 요청은 Next.js 앱으로 프록시

#### [3/4] SSL 인증서 발급

> **주의:** deploy.sh의 certbot 명령에 버그가 있음 (아래 트러블슈팅 참고). 수동 실행 필요:

```bash
docker compose run --rm --entrypoint "" certbot certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email trymakeit1000@gmail.com \
    --agree-tos \
    --no-eff-email \
    -d class-planner.info365.studio
```

명령어 분해:
- `docker compose run --rm`: 일회성 컨테이너 실행 후 자동 삭제
- `--entrypoint ""`: docker-compose.yml에 정의된 entrypoint(무한 renew 루프)를 무시
- `certbot certonly`: 인증서만 발급 (웹서버 설정은 건드리지 않음)
- `--webroot`: 웹루트 방식 인증. Nginx가 이미 돌고 있으므로 이 방식 사용
- `--webroot-path=/var/www/certbot`: Let's Encrypt가 검증 파일을 놓을 경로
- `--agree-tos`: 이용약관 자동 동의
- `--no-eff-email`: EFF 뉴스레터 수신 거부
- `-d class-planner.info365.studio`: 인증서를 발급받을 도메인

성공 시 인증서 위치:
- 인증서: `/etc/letsencrypt/live/class-planner.info365.studio/fullchain.pem`
- 키: `/etc/letsencrypt/live/class-planner.info365.studio/privkey.pem`
- 만료: 90일 (certbot 컨테이너가 12시간마다 자동 갱신 시도)

#### [4/4] HTTPS 설정으로 전환

```bash
cp nginx/default.conf nginx/active.conf
docker compose restart nginx
```

- `cp nginx/default.conf nginx/active.conf`: HTTPS가 포함된 전체 Nginx 설정으로 교체
- `docker compose restart nginx`: Nginx 재시작하여 새 설정 적용

**default.conf (HTTPS) 동작:**
- 80번 포트: 모든 HTTP 요청을 HTTPS로 301 리다이렉트
- 443번 포트: SSL 종료 + 보안 헤더 추가 + Next.js로 리버스 프록시
- 보안 헤더: X-Frame-Options(클릭재킹 방지), HSTS(강제 HTTPS), X-Content-Type-Options(MIME 스니핑 방지)


## docker-compose.yml 서비스 설명

### class-planner (Next.js 앱)

```yaml
build:
  context: .              # 현재 디렉토리를 빌드 컨텍스트로 사용
  args:                   # Dockerfile의 ARG에 전달할 빌드 인자
    NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}
container_name: class-planner
restart: unless-stopped   # 크래시 시 자동 재시작 (수동 stop 제외)
ports:
  - "3000:3000"           # 호스트:컨테이너 포트 매핑
env_file:
  - .env.production       # 런타임 환경변수 주입
healthcheck:              # 30초마다 헬스체크, 3회 실패 시 unhealthy 마킹
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000"]
```

### nginx (리버스 프록시)

```yaml
image: nginx:alpine       # 공식 Nginx 경량 이미지
ports:
  - "80:80"               # HTTP
  - "443:443"             # HTTPS
volumes:
  - ./nginx/active.conf:/etc/nginx/conf.d/default.conf  # Nginx 설정 파일 마운트
  - ./certbot/conf:/etc/letsencrypt                      # SSL 인증서 공유
  - ./certbot/www:/var/www/certbot                       # certbot 웹루트 공유
depends_on:
  - class-planner         # class-planner 컨테이너가 먼저 기동된 후 시작
```

### certbot (SSL 인증서 관리)

```yaml
image: certbot/certbot
volumes:                  # nginx와 동일한 볼륨 공유 (인증서 + 웹루트)
  - ./certbot/conf:/etc/letsencrypt
  - ./certbot/www:/var/www/certbot
entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
```

entrypoint 분해:
- `trap exit TERM`: SIGTERM 시그널 받으면 깔끔하게 종료
- `while :; do ... done`: 무한 루프
- `certbot renew`: 만료 임박한 인증서 갱신 시도
- `sleep 12h & wait $${!}`: 12시간 대기 후 반복. `wait`로 시그널 수신 가능하게 함


## 운영 명령어

```bash
# 서버 접속
ssh class-planner
cd ~/class-planner

# 상태 확인
docker compose ps                    # 컨테이너 상태 목록
docker compose logs -f               # 전체 로그 실시간 스트리밍
docker compose logs -f class-planner # 앱 로그만
docker compose logs -f nginx-proxy   # Nginx 로그만

# 재시작
docker compose restart               # 전체 재시작 (이미지 재빌드 없음)
docker compose restart class-planner # 앱만 재시작

# 전체 재배포 (코드 변경 시)
docker compose down                  # 모든 컨테이너 중지 + 삭제
docker compose build --no-cache      # 이미지 새로 빌드
docker compose up -d                 # 전체 서비스 시작

# 디스크 정리 (오래된 이미지 삭제)
docker image prune -f                # 사용하지 않는 이미지 삭제
docker system prune -f               # 미사용 컨테이너/네트워크/이미지 전부 삭제

# SSL 인증서 수동 갱신
docker compose run --rm --entrypoint "" certbot certbot renew

# swap 상태 확인
free -h
```


## 코드 업데이트 배포 (일상 배포)

초기 셋업 이후 코드를 수정하고 다시 배포할 때:

```bash
# 1. 로컬에서 서버로 변경된 파일 전송
rsync -avz \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='coverage' \
  --exclude='test-results' \
  --exclude='playwright-report' \
  ~/lee_file/entrepreneur/project/dev-pack/class-planner/ \
  class-planner:~/class-planner/

# 2. 서버에서 재빌드 + 재시작
ssh class-planner
cd ~/class-planner
docker compose down
docker compose build --no-cache
docker compose up -d
```

소요 시간: rsync ~10초 + 빌드 ~2분 + 시작 ~10초 = 약 2~3분


## 트러블슈팅

### Docker 권한 오류
```
permission denied while trying to connect to the Docker daemon socket
```
원인: Docker 설치 직후 docker 그룹 권한이 현재 세션에 미적용.
해결: `exit` → `ssh class-planner`로 재접속.

### OOM (Out of Memory) — 빌드 중 서버 먹통
```
Read from remote host: Operation timed out
```
원인: 1GB RAM으로 Next.js 빌드 시 메모리 부족. 서버가 응답 불가 상태.
해결:
1. AWS 콘솔 또는 CLI로 인스턴스 리부트: `aws lightsail reboot-instance --instance-name class-planner-server --region ap-northeast-2`
2. 재접속 후 swap 추가 (위 2.5단계 참고)
3. 다시 빌드

### 환경변수 누락 (빌드 시)
```
WARN: The "NEXT_PUBLIC_SUPABASE_URL" variable is not set. Defaulting to a blank string.
```
원인: Docker Compose가 빌드 args를 `.env` 파일에서 읽는데, `.env`가 없음.
해결: `ln -sf .env.production .env` 후 재빌드.

### 환경변수 누락 (런타임)
```
Error: Missing Supabase environment variables
```
원인: `.env.production` 파일이 서버에 없거나 값이 비어있음.
해결: 로컬에서 수동 전송: `scp ~/.../class-planner/.env.production class-planner:~/class-planner/`

### certbot "No renewals were attempted"
원인: docker-compose.yml의 entrypoint(renew 루프)가 `certonly` 명령을 덮어씌움.
해결: `--entrypoint ""`를 추가하여 수동 실행 (위 3/4단계 참고).

### SSH 타임아웃 (빌드 중)
원인: 빌드가 오래 걸리면서 SSH 세션이 타임아웃됨 (출력 없는 시간 초과).
해결: `~/.ssh/config`에 keepalive 추가:
```
Host class-planner
    ...
    ServerAliveInterval 60
    ServerAliveCountMax 3
```
- `ServerAliveInterval 60`: 60초마다 서버에 keepalive 패킷 전송
- `ServerAliveCountMax 3`: 3회 연속 응답 없으면 연결 종료


## 비용 구조

| 항목 | 월 비용 | 비고 |
|------|---------|------|
| Lightsail (1GB) | $7 | 최초 90일 무료 (2026-04-09 생성 → 2026-07-08까지 무료) |
| 도메인 (info365.studio) | Vercel에서 구매 | 연 단위 |
| Supabase | Free tier | Auth + DB. 무료 한도: 500MB DB, 50K MAU |
| SSL (Let's Encrypt) | $0 | 무료, 90일 자동 갱신 |


## 파일 구조 참고

```
class-planner/
├── Dockerfile              # 멀티스테이지 빌드 정의
├── docker-compose.yml      # 3개 서비스 오케스트레이션
├── .dockerignore           # Docker 빌드 시 제외할 파일
├── .env.production         # 환경변수 (git 미포함, 수동 관리)
├── .env                    # → .env.production 심볼릭 링크
├── nginx/
│   ├── default.conf        # HTTPS 포함 전체 Nginx 설정
│   ├── init-ssl.conf       # SSL 발급 전 HTTP 전용 설정
│   └── active.conf         # 현재 사용 중인 설정 (git 미포함)
├── certbot/                # SSL 인증서 저장소 (git 미포함)
│   ├── conf/               # /etc/letsencrypt 마운트
│   └── www/                # /.well-known/acme-challenge 마운트
└── scripts/
    ├── setup-server.sh     # 서버 초기 셋업 (Docker, Git 설치)
    └── deploy.sh           # 빌드 + SSL + 기동 자동화
```
