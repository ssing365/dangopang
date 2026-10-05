# 당고팡 (Dango Pang)

모바일 세로 화면용 3D 캐주얼 대전 게임. 주문서 순서대로 당고 알을 꼬치에 먼저 꽂는 쪽이 이긴다.

## 실행

```bash
npm install
npm run dev      # 터미널에 뜨는 주소로 접속 (휴대폰 테스트는 npm run dev -- --host)
npm run build    # 프로덕션 빌드
```

## 구조

```
src/
  game/   config.ts   ← 색상·크기·타이밍·난이도 수치 전부 여기서 조정
          rules.ts    ← 주문서 생성, 정답 판정, 트레이 리필 규칙
          store.ts    ← zustand 게임 상태 (페이즈, 양쪽 꼬치, 트레이, 비행 알)
          cpuBot.ts   ← CPU 봇 (반응 시간 / 실수 확률)
          screenRegistry.ts ← View 사이를 넘나드는 비행 알용 화면 좌표 변환
  scene/  Dango, Skewer, Tray, OrderBoard, FlightLayer, Lights, FrameClear
  ui/     HUD, StartScreen, ResultScreen, AssetImg
```

렌더링은 `<Canvas>` 1개 + drei `<View>` 5개(주문서 / CPU 꼬치 / 내 꼬치 / 트레이 / 비행 오버레이)로 나눠 그린다.

## 교체용 에셋

`public/assets/` 에 아래 파일을 넣으면 자동으로 적용된다. 없으면 단색/그라데이션 플레이스홀더가 보인다.

| 파일명 | 쓰이는 곳 |
| --- | --- |
| `bg_main.png` | 전체 배경 (cover) |
| `logo.png` | 시작 화면 타이틀 |
| `cpu_avatar.png` | 상단 왼쪽 CPU 점수 옆 아바타 (원형으로 잘림) |
| `plate.png` | 양쪽 꼬치 아래 접시 |
| `icon_timer.png` | 상단 타이머 아이콘 |
| `icon_star.png` | 상단 오른쪽 내 점수 아이콘 |
