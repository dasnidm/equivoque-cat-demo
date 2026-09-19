# Equivoque Cat Demo

세 고양이의 선택과 시각적 유지·제거 반응을 이용하는 정적 UI/UX 데모입니다.
HTML, CSS, vanilla JavaScript만 사용하며 빌드나 외부 라이브러리가 필요하지 않습니다.

## 실행

`public/index.html`을 브라우저에서 열거나 `python -m http.server 8765 --directory public`으로 실행합니다.

## 배포

Vercel의 Other 프레임워크로 배포하며 공개되는 사이트 파일은 `public/` 아래의 세 파일입니다.
GitHub 저장소는 비공개입니다. 배포 사이트는 별도의 공개 URL을 갖습니다.

## 원본과 범위

2026-09-20에 research vault의 `70-demo/equivoque-choice-webapp`에서 복사했습니다.
배포 준비 시 원본의 UI와 동작을 변경하지 않았습니다.
이 데모에는 연구용 행동 로그 수집·설문·데이터 저장 기능이 구현되어 있지 않습니다.
화면에는 선택 도중 설명 문구가 없고, 완료 후 결과 문장이 표시됩니다.
