# 네온 브릭 크러시 (Neon Brick Crush) - Development Epics

## Epic Overview

| # | Epic Name | Goal |
|---|-----------|------|
| 1 | 코어 플레이 | 기본 플레이어블 루프를 완성한다 |
| 2 | 게이트 & 피버 | 차별화된 전개 변화와 역전 장치를 구현한다 |
| 3 | 퍼즐 월드 & 레벨 | 실제 콘텐츠 구조와 레벨 진행을 만든다 |
| 4 | 메타 진행 & BM | 장기 동기와 운영/수익화 구조를 붙인다 |
| 5 | 폴리시 & 감각 완성 | 시청각 임팩트와 최종 완성도를 높인다 |

---

## Epic 1: 코어 플레이

### Goal

조준, 발사, 블록 파괴, 턴 종료, 실패/재도전, 광고 시청 후 재도전이 가능한 최소 플레이어블을 만든다.

### Scope

**Includes:**
- 드래그 조준, 릴리즈 발사
- 블록 충돌 및 파괴
- 턴 종료와 공 회수
- 보드 하강
- 실패 조건과 즉시 재도전
- 광고 시청 후 재도전 기회

**Excludes:**
- 게이트 특수 효과
- 피버 시스템
- 메타 진행
- 고급 폴리시

### Dependencies

없음

### Deliverable

기본 브릭브레이커 루프와 실패 직후 재도전 동선이 플레이 가능한 상태

### Stories

- As a player, I can drag to aim and release to shoot so that I control each turn.
- As a player, I can break blocks with the ball so that I feel direct progress.
- As a player, I can see the board descend after each turn so that pressure increases.
- As a player, I can fail and instantly retry so that the game keeps its fast tempo.
- As a player, I can choose to watch an ad for a retry opportunity so that I get one more chance in a high-tension moment.

---

## Epic 2: 게이트 & 피버

### Goal

게이트와 피버를 통해 이 게임만의 차별화된 전개와 역전 감각을 만든다.

### Scope

**Includes:**
- 게이트 1종 이상
- 게이트 시각/사운드 피드백
- 피버 게이지 충전
- 피버 버튼 발동
- 연쇄 결과 증폭

**Excludes:**
- 다수의 고급 게이트 기믹
- 장기 메타 보상

### Dependencies

Epic 1

### Deliverable

좋은 샷과 피버 타이밍이 판을 바꾸는 핵심 차별점이 플레이 가능한 상태

### Stories

- As a player, I can route shots through a gate so that the turn outcome changes.
- As a player, I can charge a fever gauge so that I build toward a power moment.
- As a player, I can manually trigger fever so that I choose when to reverse momentum.

---

## Epic 3: 퍼즐 월드 & 레벨

### Goal

월드, 스테이지, 별점, 해금 구조를 통해 실제 게임다운 콘텐츠 루프를 만든다.

### Scope

**Includes:**
- 1개 이상 월드
- 약 10개 이상의 스테이지
- 튜토리얼/일반/챌린지/월드 마지막 구조
- 별점 시스템
- 맵 선택형 진행

**Excludes:**
- 장기 이벤트 운영
- 최종 polish

### Dependencies

Epic 1, 2

### Deliverable

플레이어가 한 월드를 따라가며 별점과 진행을 경험할 수 있는 콘텐츠 구조

### Stories

- As a player, I can select stages from a world map so that progression feels clear.
- As a player, I can earn stars after clearing stages so that I have replay goals.
- As a player, I can play a world-ending challenge stage so that each world has a climax.

---

## Epic 4: 메타 진행 & BM

### Goal

XP, 레벨업, 해금, 광고 보상, IAP, 이벤트 보상을 통해 장기 동기와 운영 구조를 만든다.

### Scope

**Includes:**
- 경험치 획득과 레벨업
- 별점/레벨 기반 해금 조건
- 보상형 광고
- 인앱결제 기초 구조
- 시즌/개발 이벤트 보상 구조

**Excludes:**
- 과도한 화폐 경제
- 복잡한 라이브옵스 시스템

### Dependencies

Epic 3

### Deliverable

짧은 세션 이후에도 돌아오게 만드는 장기 진행 및 BM 구조

### Stories

- As a player, I can earn XP from play so that I feel long-term progress.
- As a player, I can unlock new content with stars and level milestones so that replay matters.
- As a player, I can choose reward ads so that I gain optional extra benefits.
- As a player, I can access event rewards so that there are fresh reasons to return.

---

## Epic 5: 폴리시 & 감각 완성

### Goal

네온 연출, 사운드, 진동, UI polish, 성능 최적화를 통해 완성도와 임팩트를 끌어올린다.

### Scope

**Includes:**
- 네온 VFX polish
- 연쇄/피버 연출 강화
- 신스웨이브 BGM/SFX 적용
- 진동 피드백
- UI polish
- 성능 및 발열 최적화

**Excludes:**
- 신규 코어 메커닉 추가
- 대규모 콘텐츠 확장

### Dependencies

Epic 1-4

### Deliverable

짧은 한 판 안에서도 강한 손맛과 시청각 임팩트를 주는 완성형 빌드

### Stories

- As a player, I can feel strong audiovisual impact on key moments so that great shots feel memorable.
- As a player, I can experience responsive vibration feedback so that hits feel tactile.
- As a player, I can play smoothly on mobile so that polish supports the core loop.
