# 당고팡 (Dango Pang)

모바일 세로형(9:16, 최대 430px) 3D 캐주얼 대전 게임. 주문서 순서대로 당고 알을 꼬치에 먼저 꽂는 쪽이 주문서를 따낸다.
UI 문구와 코드 주석은 한국어로 쓴다.

## 명령어

```bash
npm run dev      # 개발 서버
npx tsc -b       # 타입체크 (noUnusedLocals/Parameters 켜져 있음)
npm run build    # 타입체크 + 프로덕션 빌드
```

이 PC에서는 5173 포트를 다른 프로젝트가 쓰는 경우가 있어, `localhost:5173` 에 엉뚱한 앱이 뜰 수 있다. 확인용으로는 `npx vite --port 5188 --strictPort` 를 쓴다.

## 구조

- `src/game/` — 렌더링과 무관한 게임 로직
  - `config.ts`: 색상·크기·타이밍·난이도 등 모든 튜닝 값. 수치는 여기에만 둔다.
  - `rules.ts`: 주문서 생성, 정답 판정, 트레이 리필, 트레이 슬롯 배치
  - `store.ts`: zustand 상태와 액션. 양쪽 공통 규칙은 `place()` 한 곳에 있다.
  - `cpuBot.ts`: setTimeout 기반 CPU 봇
  - `screenRegistry.ts`: View 간 화면 좌표 변환(내 꼬치 슬롯 → 앱 기준 px)
- `src/scene/` — R3F 씬 (Dango, Skewer, Tray, OrderBoard, FlightLayer 등)
- `src/ui/` — DOM HUD / 시작·결과 화면 / 훅(`useNow`, `useAfter`)

## 렌더링 규칙 (중요)

- **WebGL 컨텍스트는 하나.** `<Canvas>` 1개 + drei `<View>` 로 영역을 나눈다. Canvas 를 추가로 만들지 않는다.
- **Canvas 는 `position: fixed` 로 창 전체를 덮어야 한다.** drei View 의 화면 밖 판정이 "창 기준 좌표"와 "캔버스 크기"를 비교하기 때문에, 캔버스를 앱(430px) 안에 두면 넓은 창에서 오른쪽 View 들이 안 그려진다.
- View 들은 화면을 지우지 않으므로 `FrameClear` 가 useFrame priority 1 에서 전체를 지운다. **View 의 `index` 는 2 이상**으로 주고, 그 순서대로 그려진다. 비행 오버레이(`FlightLayer`)는 index 10 으로 가장 마지막에 그린다.
- 비행 알은 다른 View 위에 겹쳐 그리므로 깊이 테스트를 끈 머티리얼(`getDangoMaterial(color, true)`)을 쓴다.
- DOM 텍스트를 3D 위에 띄우려면 `z-index: 2` 이상 + `pointer-events: none`. 캔버스와 같은 스택 컨텍스트에서 비교되도록, 조상 요소에 `filter`/`transform`/`z-index` 로 새 스택 컨텍스트를 만들지 않는다.
- 3D 입력은 Canvas `eventSource` = 앱 컨테이너, 각 View 의 트래킹 div 가 이벤트 타깃이다. 오버레이 View 는 `pointer-events: none` 이어야 한다.

## 게임 로직 규칙

- **판정은 입력 순간, 화면 반영은 착지 순간.** 플레이어의 마지막 알은 탭하는 순간 승패가 정해진다(비행 시간 0.3초 때문에 불리해지지 않게). 대신 점수 증가, 새 주문서, 진 쪽 꼬치 사라짐, 결과 배지는 `lastCompletion.at`(= 착지 시각)에 맞춰 보여준다(`useAfter`, `prevOrder`). 이 둘을 어긋나게 바꾸면 "누가 이겼는지 헷갈린다"는 문제가 다시 생긴다.
- 주문서는 양쪽이 공유한다. 먼저 완성한 쪽이 +1 을 얻고, 진 쪽의 진행은 리셋된다.
- 트레이에는 항상 모든 색이 최소 1개씩 있도록 리필한다(`pickRefillColor`).
- 시간은 모두 `performance.now()` 기준이다.

## 에셋

`public/assets/` 의 PNG(bg_main, logo, cpu_avatar, plate, icon_timer, icon_star)는 없어도 동작한다. `AssetImg` 가 로드 실패 시 CSS 플레이스홀더로 대체하므로, 파일만 넣으면 교체된다.

## 디버깅 / 검증

- 개발 모드에서는 `window.__game` 에 zustand 스토어가 노출된다(`__game.getState()`, `__game.setState(...)`).
- 화면 확인은 헤드리스 Chrome(puppeteer-core + 시스템 Chrome, `--use-angle=swiftshader`)으로 모바일(390×844)과 넓은 창(1440×860)을 둘 다 본다. 헤드리스 스크린샷은 1초 넘게 걸릴 수 있어서, 짧은 연출은 스크린샷 대신 DOM 상태를 시간 간격으로 기록해서 검증한다.
