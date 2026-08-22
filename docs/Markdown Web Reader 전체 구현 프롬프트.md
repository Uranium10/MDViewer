완전히 새로운 웹 프로젝트를 처음부터 구현해줘.

이 프로젝트는 AI가 생성한 Markdown 형식의 **소설, 시나리오, 세계관 설정, 캐릭터 문서, 장문의 텍스트​**를 읽기 좋은 형태로 렌더링하고, URL 하나로 다른 사람에게 공유하기 위한 개인용 Web Reader다.

Markdown은 입력과 저장 형식일 뿐이다.

최종 공유 화면은 GitHub README, Markdown Viewer, 문서 도구처럼 보여서는 안 된다.

목표는:

> Markdown으로 작성하고  
> 전자책처럼 읽고  
> URL 하나로 공유한다.

이다.

특히 스마트폰에서 **세로 스크롤뿐 아니라 좌우로 페이지를 넘기며 읽는 전자책 스타일 Reader**를 중요하게 구현한다.

공식 SaaS가 아니므로 인증, 회원가입, DB, 관리자 기능 등은 구현하지 않는다.

---

# 1. 기술 스택

새 Next.js 프로젝트를 생성한다.

기본 스택:

- 최신 안정 버전 Next.js
- App Router
- React
- TypeScript
- Tailwind CSS
- `react-markdown`
- `remark-gfm`
- `remark-breaks`
- `@vercel/blob`
- `nanoid`

가능하면 dependency를 최소화한다.

단순한 swipe와 pagination 때문에 거대한 UI/framework dependency를 추가하지 않는다.

필요한 경우 작은 dependency를 추가할 수 있지만 이유가 명확해야 한다.

사용하지 않는다:

- Turso
- SQLite
- PostgreSQL
- MySQL
- Supabase
- Firebase
- Prisma
- Drizzle
- ORM
- 인증 서비스

문서 영속 저장은 Vercel Blob만 사용한다.

---

# 2. 핵심 사용 흐름

```text
Markdown 직접 입력
       또는
.md 파일 선택 / Drag & Drop
              ↓
        Reader Preview
              ↓
           공유하기
              ↓
       Vercel Blob 저장
              ↓
       랜덤 공유 ID 생성
              ↓
       /s/{shareId}
              ↓
 모바일 / PC에서 Reader로 읽기
```

앱을 처음 열었을 때 불필요한 Landing Page를 보여주지 않는다.

바로 Markdown을 넣고 Preview하고 공유할 수 있어야 한다.

---

# 3. 페이지 구조

최소한 다음을 구현한다.

```text
/
```

작성 / Import / Preview / 공유 화면.

```text
/s/[id]
```

공유된 Markdown을 읽는 Reader.

필요하면 다음 API를 구현한다.

```text
/api/share
```

Blob 저장용.

Blob 조회가 서버 API를 거치는 편이 구조상 적절하다면:

```text
/api/share/[id]
```

등을 추가해도 된다.

단 API route를 쓸데없이 많이 만들지 않는다.

---

# 4. 메인 화면 `/`

기능:

- 제목 입력
- Markdown textarea
- `.md` 파일 선택
- Drag & Drop
- Preview
- 초기화
- 공유하기

Desktop에서는:

```text
┌──────────────────────┬──────────────────────┐
│                      │                      │
│ Markdown Editor      │ Reader Preview       │
│                      │                      │
│                      │                      │
│                      │                      │
└──────────────────────┴──────────────────────┘

                   공유하기
```

형태를 기본으로 한다.

Preview는 실제 `/s/[id]`에서 사용하는 것과 **동일한 Reader component와 typography**를 재사용한다.

즉:

```text
Preview
   │
   └── NovelReader
           ↑
           │
/s/[id] ───┘
```

가 되어야 한다.

Preview와 실제 공유 화면의 렌더링 결과가 달라지지 않게 한다.

---

# 5. 모바일 Editor

모바일에서 Editor와 Preview를 억지로 좌우 분할하지 않는다.

```text
[ 작성 ] [ 미리보기 ]
```

탭 방식으로 전환한다.

모바일에서도 제목 입력, 파일 불러오기, 공유하기가 어렵지 않아야 한다.

---

# 6. Markdown 파일 Import

`.md` 파일을:

- File Picker
- Drag & Drop

으로 읽을 수 있게 한다.

브라우저의 File API로 내용을 읽어서 textarea에 넣는다.

Markdown 원문은 수정하지 않는다.

특히 다음을 보존한다.

- 빈 줄
- 여러 줄의 독백
- Markdown emphasis
- heading
- blockquote
- `---`
- 의도적인 line break

파일명이:

```text
SEQUEL_scene_godric_first.md
```

라면 제목이 비어 있을 경우:

```text
SEQUEL_scene_godric_first
```

를 임시 제목으로 사용할 수 있다.

Markdown의 첫 번째 `# h1`이 존재한다면 그것을 제목 후보로 우선할 수도 있다.

사용자가 입력한 제목이 가장 높은 우선순위를 가진다.

---

# 7. Markdown 렌더링

`react-markdown`을 사용한다.

remark:

```ts
remarkGfm
remarkBreaks
```

를 사용한다.

`remark-breaks`는 중요한 요구사항이다.

소설에서는 줄바꿈이 연출이기 때문이다.

예:

```md
*…*

*…아.*

*…아니야.*

*…이거 아니야.*
```

이런 호흡이 화면에서 망가지지 않아야 한다.

지원:

- h1 ~ h6
- paragraph
- italic
- bold
- blockquote
- horizontal rule
- ordered list
- unordered list
- link
- inline code
- fenced code
- GFM

Raw HTML은 기본적으로 지원하지 않는다.

`dangerouslySetInnerHTML`을 사용하지 않는다.

Markdown을 HTML 문자열로 변환해서 Blob에 저장하지 않는다.

**원본 Markdown 문자열을 저장한다.**

---

# 8. 이 앱의 정체성

이것은 Markdown Viewer가 아니다.

**Web Novel / Ebook Reader**다.

최종 공유 페이지를 봤을 때 다음 인상이 나야 한다.

- 문학적
- 조용함
- 현대적
- 읽기 편함
- 충분한 글자 크기
- 여백이 안정적
- UI보다 글이 먼저 보임

디자인 키워드:

- literary
- editorial
- elegant
- calm
- warm
- modern
- book-like
- typography focused
- distraction free
- highly readable

---

# 9. 절대 피해야 하는 UI

다음 형태로 만들지 않는다.

- GitHub README
- Notion clone
- SaaS Dashboard
- 관리자 페이지
- 개발자 문서
- Bootstrap 문서
- 카드가 끝없이 겹치는 UI
- 모든 영역에 border
- 모든 영역에 shadow
- 과도한 gradient
- 회색 일색
- 지나치게 작은 글씨
- 낮은 contrast
- 작은 아이콘
- 화면은 넓은데 본문은 조그만 UI

특히 AI가 흔히 사용하는:

```text
text-xs
text-sm
text-muted-foreground
```

를 긴 본문에 사용하지 않는다.

---

# 10. 가독성이 디자인보다 우선

예쁘게 보이게 하려고 글자를 작게 만들지 않는다.

본문 기본값:

## Desktop

```text
18px
line-height 1.9
```

정도를 기준으로 한다.

## Mobile

```text
17px
line-height 1.85
```

정도를 기준으로 한다.

특별한 이유 없이 모바일 본문을 16px 아래로 내리지 않는다.

14~15px 본문은 금지한다.

---

# 11. Reader 설정 가능한 Font Size

사용자가 조절할 수 있게 한다.

범위:

```text
16px ~ 24px
```

기본:

```text
18px Desktop
17~18px Mobile
```

증감 단위는 1px 정도.

설정은 localStorage에 저장한다.

---

# 12. Line Height

조절 가능하게 한다.

범위:

```text
1.6 ~ 2.2
```

기본:

```text
약 1.9
```

---

# 13. 본문 폭

Scroll Reader에서는 긴 줄을 피한다.

기본:

```text
약 720px
```

Reader Settings:

```text
좁게
기본
넓게
```

예:

```text
좁게   640px
기본   720px
넓게   800px
```

정도.

정확한 값은 시각적으로 조정해도 된다.

1440p나 4K 화면이라고 본문을 화면 전체 폭으로 늘리지 않는다.

---

# 14. Font 선택

가능하면 Reader 설정에 간단한 글꼴 옵션도 넣는다.

예:

```text
글꼴

고딕
명조
```

한국어 가독성이 좋은 font stack을 우선한다.

웹폰트를 사용한다면 로딩 비용을 고려한다.

필요하면 Next.js Font 기능을 사용한다.

명조체가 한글 italic 등에서 읽기 어렵다면 무리하게 적용하지 않는다.

이 옵션 구현이 과도하게 복잡해지는 경우 가장 후순위로 둔다.

---

# 15. Light Theme

순백 SaaS UI보다 장시간 읽기 편한 방향을 사용한다.

예:

- 매우 은은한 off-white / warm white background
- 거의 검정에 가까운 본문

단 강한 sepia나 누런 종이 texture는 금지한다.

contrast는 충분히 높게 유지한다.

---

# 16. Dark Theme

Dark mode 제공.

완전한:

```text
#000000 / #ffffff
```

조합보다는 조금 부드러운 dark gray + light foreground를 사용한다.

하지만 편안함을 핑계로 본문을 흐릿한 회색으로 만들지 않는다.

---

# 17. Reader Mode

이 앱의 핵심 기능이다.

사용자가 두 가지 읽기 방식을 선택할 수 있어야 한다.

```text
읽기 방식

[ 세로 스크롤 ]   [ 페이지 넘김 ]
```

설정은 localStorage에 저장한다.

두 모드는 동일한 Markdown과 typography 설정을 사용한다.

---

# 18. Scroll Mode

일반적인 장문 Reader다.

```text
본문
 ↓
본문
 ↓
본문
 ↓
```

자연스러운 vertical scroll을 사용한다.

Desktop과 모바일 모두 지원한다.

Reader width 설정은 Scroll Mode에서 특히 중요하다.

---

# 19. Paginated Mode

진짜 전자책처럼 동작하는 읽기 방식이다.

**단순히 `## 1`, `## 2` 단위로 한 화면씩 보여주는 기능이 아니다.**

한 절이 화면보다 길어도 실제 화면 높이를 기준으로 여러 페이지로 자동 분할한다.

예:

```text
Page 12

의뢰는 창고 하나였다.

봉래시장 서쪽 물류 구역,
컨테이너 열여섯 동.

...
```

Swipe →

```text
Page 13

문은 이미 열려 있었다.

안쪽은 조용했다.

...
```

이어야 한다.

---

# 20. Paginated Mode 구현 방향

가능하면 CSS multi-column layout을 이용한다.

개념:

```text
하나의 긴 Markdown DOM

        ↓

fixed page height

        ↓

CSS columns

┌──────┐  ┌──────┐  ┌──────┐
│Page 1│  │Page 2│  │Page 3│
└──────┘  └──────┘  └──────┘
```

콘텐츠 높이를 현재 Reader viewport에 맞추고 column이 가로 방향으로 생성되게 한다.

그 후:

- scrollWidth
- viewport width
- column gap

등을 이용해서 전체 page count를 계산한다.

현재 page index에 따라 정확한 page step만큼 가로 이동시킨다.

구체적인 구현은 실제 브라우저 동작을 확인하면서 가장 안정적인 방식을 선택한다.

중요한 것은 외형만 페이지처럼 만들지 말고 **실제로 긴 Markdown이 화면 크기에 맞게 자동 pagination**되어야 한다는 것이다.

---

# 21. Repagination

다음이 변하면 page count를 다시 계산한다.

- window resize
- mobile orientation 변경
- 글자 크기 변경
- line-height 변경
- font 변경
- viewport 변경
- Reader UI 크기 변경

`ResizeObserver` 등을 적절히 활용한다.

reflow 후 현재 읽던 위치가 엉뚱한 장면으로 튀지 않게 한다.

---

# 22. 페이지 위치 보존

단순히:

```text
page = 37
```

만 저장하면 font size 변경 후 의미가 없어질 수 있다.

가능하면 현재 읽고 있는:

- heading
- approximate document progress
- DOM anchor
- text position

중 적절한 기준을 같이 보관해서 repagination 후 가까운 위치로 복원한다.

지나친 복잡성이 생기는 경우:

```text
normalized progress 0~1
```

방식으로 구현해도 된다.

예:

```text
0.438
```

이면 문서 약 43.8% 지점.

---

# 23. Scroll ↔ Page Mode 전환

읽던 중 모드를 바꿔도 문서 처음으로 돌아가지 않아야 한다.

예:

```text
Scroll mode 42%
      ↓
Page mode
      ↓
대략 같은 42% 지점
```

으로 이동한다.

반대 방향도 마찬가지다.

---

# 24. 모바일 Swipe

Paginated Mode에서는 좌우 swipe를 지원한다.

```text
← 오른쪽 swipe
이전 페이지

왼쪽 swipe →
다음 페이지
```

제스처는 손가락 이동을 자연스럽게 따라가게 한다.

손가락을 움직이는 동안 현재 페이지가 같이 움직이고, 일정 threshold를 넘으면 다음 페이지로 snap한다.

threshold는 지나치게 민감하지 않게 설정한다.

예:

```text
페이지 폭의 약 15~25%
```

또는 velocity 기반 판단을 함께 사용할 수 있다.

---

# 25. Swipe Animation

과장된 종이 넘김 3D animation을 만들지 않는다.

다음 느낌을 목표로 한다.

> iOS 사진 앱처럼 부드럽게 slide → snap

짧고 자연스럽게 구현한다.

애니메이션 duration은 대략:

```text
180 ~ 280ms
```

범위를 고려한다.

`prefers-reduced-motion`도 존중한다.

---

# 26. Swipe와 세로 제스처 구분

사용자가 약간 세로로 움직였다고 페이지가 넘어가지 않게 한다.

gesture 시작 후:

```text
|dx| > |dy|
```

이며 일정 threshold 이상일 때 horizontal gesture로 판단한다.

Scroll Mode에서는 일반적인 세로 스크롤을 방해하지 않는다.

---

# 27. Text Selection 보호

사용자가 텍스트를 선택하려고 drag하는데 페이지가 넘어가면 안 된다.

특히 Desktop에서:

- text selection
- link click
- button
- Reader Settings
- TOC
- Markdown copy UI

등과 pagination gesture가 충돌하지 않도록 한다.

interactive element에서 시작된 pointer event는 페이지 swipe로 처리하지 않는다.

---

# 28. 페이지 Tap Navigation

모바일 Paginated Mode에서는 tap으로도 이동할 수 있게 한다.

화면:

```text
┌────────┬────────────────┬────────┐
│ 이전   │       UI       │ 다음   │
│ 25%    │      50%       │ 25%    │
└────────┴────────────────┴────────┘
```

정도의 invisible tap zone 개념.

왼쪽:

```text
이전 페이지
```

오른쪽:

```text
다음 페이지
```

가운데:

```text
Reader UI show / hide
```

단 링크나 버튼을 누를 때 tap navigation이 발동하면 안 된다.

---

# 29. Reader UI 숨기기

Paginated Mode에서는 몰입도를 위해 toolbar를 평소에 최소화하거나 숨길 수 있다.

평상시:

```text
        조우 — 「믿나」


          본문

          본문

          본문



                 12 / 47
```

가운데 Tap:

```text
←     조우 — 「믿나」      Aa   ⋯


          본문

          본문


────────●─────────────
12 / 47             목차
```

처럼 Reader control이 나타난다.

다시 가운데를 누르면 사라진다.

UI가 나타났다고 실제 본문의 page height가 크게 변경되어 매번 repagination되지 않도록 가능하면 toolbar를 overlay로 처리한다.

---

# 30. Desktop Keyboard

Paginated Mode에서:

```text
ArrowLeft
ArrowRight
```

를 지원한다.

가능하면:

```text
PageUp
PageDown
```

도 자연스럽게 지원할 수 있다.

단 form input이나 textarea에 focus가 있을 때 keyboard navigation을 가로채지 않는다.

---

# 31. Desktop Click

Paginated Mode에서 Reader 양 끝을 클릭하면:

```text
왼쪽 → 이전
오른쪽 → 다음
```

으로 이동할 수 있다.

중앙 영역은 UI toggle 등으로 사용할 수 있다.

Cursor나 hover affordance는 지나치게 눈에 띄지 않게 한다.

---

# 32. Trackpad

브라우저의 일반적인 vertical scroll gesture를 무리하게 가로채지 않는다.

확실한 horizontal trackpad gesture가 감지되는 경우에만 페이지 전환을 고려한다.

모바일 swipe와 keyboard navigation이 우선이다.

Trackpad 지원 때문에 Reader가 불안정해지면 이 기능은 생략 가능하다.

---

# 33. 페이지 번호

Paginated Mode:

```text
12 / 47
```

처럼 표시한다.

너무 강한 visual weight를 주지 않는다.

단 글자를 지나치게 작게 만들지 않는다.

대략 14~15px 정도.

---

# 34. Reading Progress

Scroll Mode에서도 진행률을 제공한다.

가능하면 화면 최상단:

```text
━━━━━━────────────
```

같은 2~3px 정도의 아주 얇은 progress indicator를 사용한다.

또는 unobtrusive percentage.

큰 progress card는 만들지 않는다.

Paginated Mode에서는:

```text
12 / 47
```

및 progress indicator를 사용할 수 있다.

---

# 35. Chapter / Section Navigation

Markdown heading을 분석해서 목차를 만든다.

특히:

```md
## 1
## 2
## 3
...
## 15
```

형식을 잘 지원한다.

일반적인:

```md
## 제1장
## 추격
## 아지트
```

도 지원한다.

Reader 상단에:

```text
목차
```

버튼을 둔다.

Desktop:

- popover
- side sheet

Mobile:

- bottom sheet
- drawer

중 적절한 방식을 사용한다.

목차를 항상 본문 옆에 붙여 Reader 폭을 좁게 만들지 않는다.

---

# 36. 목차 이동과 Paginated Mode

목차에서 chapter를 선택했을 때 Paginated Mode에서도 해당 heading이 포함된 page로 바로 이동한다.

이를 위해 각 heading DOM element와 page 위치를 측정해서 적절한 page index를 계산한다.

---

# 37. Numeric Heading 스타일

Markdown 소설에서:

```md
## 8
```

같은 heading은 기술 문서 h2처럼 보여서는 안 된다.

장/절 전환 느낌으로:

```text


                 8


```

처럼 충분한 위아래 여백과 절제된 스타일을 준다.

다만 일반 heading:

```md
## 아지트
```

까지 억지로 숫자와 똑같이 처리할 필요는 없다.

---

# 38. 페이지 Split 품질

가능하면 다음 요소가 페이지 끝에서 어색하게 찢어지지 않게 CSS pagination property를 조정한다.

- heading
- blockquote
- code block
- 짧은 list
- horizontal rule

예:

```css
break-inside: avoid;
```

등을 필요한 요소에 적절히 사용한다.

단 긴 paragraph 전체에 무조건 `break-inside: avoid`를 사용해서 거대한 빈 공간이 생기게 하지 않는다.

---

# 39. Orphan / Widow 체감 줄이기

브라우저 지원 범위 안에서 문단의 한 줄만 다음 페이지로 넘어가는 현상을 완화할 수 있으면 한다.

하지만 복잡한 custom typesetting engine을 만들지는 않는다.

브라우저 기본 layout을 최대한 활용한다.

---

# 40. Mobile Viewport

Paginated Mode에서는 `100vh`보다 모바일 browser UI 변화에 잘 대응하는:

```text
100dvh
```

계열을 고려한다.

iPhone 등의 safe area도 고려한다.

예:

```css
env(safe-area-inset-top)
env(safe-area-inset-bottom)
```

Reader 내용이나 toolbar가 notch / home indicator와 겹치지 않아야 한다.

---

# 41. Orientation

세로 ↔ 가로 회전 시 Reader가 깨지지 않아야 한다.

회전 후:

- page width 재측정
- page count 재계산
- 읽던 위치 복원

을 수행한다.

---

# 42. Reader Header

상단 UI는 최소화한다.

예:

```text
작품 메모       목차              Aa   ☾   ⋯
```

또는 작은 제목을 같이 사용할 수 있다.

Header가 본문보다 시각적으로 강해서는 안 된다.

하지만 버튼 자체는 쉽게 찾을 수 있어야 한다.

UI font를 지나치게 작게 만들지 않는다.

대략:

```text
15~16px
```

기준.

---

# 43. Reader Settings

`Aa` 메뉴:

```text
읽기 설정

읽기 방식
○ 세로 스크롤
● 페이지 넘김

글자 크기
−     18     +

행간
−     1.9    +

본문 폭
좁게 / 기본 / 넓게

글꼴
고딕 / 명조

테마
Light / Dark
```

정도의 구성을 목표로 한다.

모든 설정은 localStorage에 저장한다.

---

# 44. Reader Preference 저장

예:

```text
reader-settings
```

에:

```ts
{
  mode,
  fontSize,
  lineHeight,
  width,
  fontFamily,
  theme
}
```

형태로 저장할 수 있다.

SSR hydration mismatch가 발생하지 않도록 안전하게 처리한다.

---

# 45. 읽던 위치 저장

문서별로 마지막 위치를 저장한다.

예:

```text
reader-position:{documentId}
```

저장 데이터에는 필요에 따라:

```ts
{
  progress: 0.438,
  headingId: "...",
  page: 12,
  scrollY: ...
}
```

등을 넣을 수 있다.

각 모드에 필요한 값을 적절히 활용한다.

---

# 46. 읽던 위치 복원 UX

같은 브라우저에서 문서를 다시 열었을 때 이전 위치로 돌아갈 수 있다.

바로 자동 복원해도 되고:

```text
이전에 읽던 위치로 이동
```

같은 작은 toast/action을 제공해도 된다.

과도한 modal은 사용하지 않는다.

---

# 47. 작품 메모

Markdown 맨 처음에 다음 구조가 들어올 수 있다.

```md
> 시퀄. 고드릭 첫 등장.
> 등장: ...
> 구성: ...
> 주의: ...
```

작성자용 메타데이터 성격이다.

가능하면 문서 시작 지점의 연속 blockquote를 감지해서:

```text
작품 메모 보기
```

collapsible UI로 렌더링한다.

펼치기 전에는 본문 몰입을 방해하지 않는다.

단 Markdown AST를 지나치게 hack하지 않는다.

복잡하다면 우선 blockquote를 아름답게 렌더링한 뒤 구조를 분리한다.

---

# 48. Paragraph 디자인

한국어 장문에 적합해야 한다.

대사가 짧게 반복되어도 과도하게 벌어지지 않아야 하고, 긴 서술문은 서로 너무 붙지 않아야 한다.

페이지 모드와 Scroll Mode에서 동일한 문학적 rhythm을 유지한다.

---

# 49. Italic / 독백

다음 같은 문장이 많이 등장한다.

```md
*…*

*…선배.*

*…말 안 해요?*
```

한글 italic이 지나치게 기울어져 가독성이 떨어지지 않게 테스트한다.

필요하면 font 선택에 따라 italic 표현 방식을 미세 조정한다.

하지만 opacity를 낮춰 독백을 흐릿하게 만들지 않는다.

---

# 50. Blockquote

개발 문서의 단순한:

```text
│ quoted text
```

스타일에만 의존하지 않는다.

소설/설정집에 어울리는 절제된 디자인을 사용한다.

---

# 51. Horizontal Rule

`---`는 장면 전환과 호흡으로 사용될 수 있다.

강한 선을 하나 긋기보다 충분한 위아래 여백과 은은한 separator를 사용한다.

---

# 52. Links

Markdown link가 있으면 정상 작동해야 한다.

external link는 안전한 속성을 적용한다.

Paginated Mode의 tap area 때문에 링크 click이 페이지 이동으로 오인되지 않게 한다.

---

# 53. Code

주 목적은 소설이지만 설정 문서에서 code block이 등장할 수도 있다.

읽을 수 있게 렌더링한다.

Syntax Highlight dependency는 필수 아니다.

코드 때문에 전체 앱이 무거워지지 않게 한다.

---

# 54. 원본 Markdown 메뉴

Markdown 관련 기능은 일반 Reader 화면에서 전면 노출하지 않는다.

`⋯` 메뉴 안에:

```text
원본 Markdown 보기
Markdown 복사
.md 다운로드
```

기능을 둔다.

---

# 55. 원본 보기

렌더링하지 않은 raw Markdown을:

- `<pre>`
- read-only textarea

등으로 보여준다.

원본 formatting이 유지되어야 한다.

---

# 56. Markdown 다운로드

저장된 원본 Markdown 문자열 그대로 `.md` 파일로 다운로드한다.

가능하면 문서 제목을 안전하게 sanitize해서 filename으로 사용한다.

---

# 57. Blob 저장 구조

DB는 없다.

Vercel Blob에:

```text
shares/{id}.json
```

형태로 저장한다.

Document type:

```ts
export interface SharedDocument {
  id: string;
  title: string;
  markdown: string;
  createdAt: string;
}
```

예:

```json
{
  "id": "V7fK29Px4mQ2cN8s",
  "title": "조우 — 「믿나」",
  "markdown": "# 조우 — 「믿나」\n\n...",
  "createdAt": "..."
}
```

---

# 58. 공유 ID

`nanoid` 등으로 충분히 추측하기 어려운 ID를 사용한다.

약:

```ts
nanoid(16)
```

정도.

사용자가 직접 ID를 지정할 수 있게 하지 않는다.

---

# 59. Blob 저장

`POST /api/share`

body:

```json
{
  "title": "...",
  "markdown": "..."
}
```

Route Handler 서버에서:

1. validation
2. random ID 생성
3. SharedDocument 생성
4. JSON 직렬화
5. Vercel Blob 저장
6. share URL 반환

`BLOB_READ_WRITE_TOKEN`은 절대로 클라이언트에 노출하지 않는다.

Vercel Blob 공식 SDK의 현재 API를 확인해서 구현한다.

SDK 버전과 맞지 않는 오래된 예제 코드를 무작정 복사하지 않는다.

---

# 60. Blob Path

랜덤 share ID 자체가 이미 충분한 entropy를 가지므로 다음과 같이 저장할 수 있다.

```text
shares/{id}.json
```

경로를 ID에서 결정할 수 있도록 구성한다.

Vercel Blob의 random suffix 정책이 pathname lookup을 방해한다면 공식 SDK의 현재 동작을 확인하고 `addRandomSuffix: false` 등의 적절한 옵션을 사용한다.

동일 ID를 덮어쓰지 않는다.

---

# 61. Blob 읽기 — 중요

존재하지 않거나 현재 SDK에서 지원되지 않는 `get()` API가 있다고 가정하지 않는다.

**구현 시점의 최신 `@vercel/blob` 공식 문서를 확인한다.**

Public Blob의 경우 공식적으로 지원되는 방식인:

- Blob metadata 조회
- pathname / URL 조회
- `head()`가 지원된다면 head
- 반환된 Blob URL에 `fetch()`
- 기타 현재 SDK의 공식 read 방법

중 가장 단순하고 안정적인 방식을 사용한다.

DB 없이:

```text
share ID
   ↓
shares/{id}.json
   ↓
Blob object
   ↓
JSON
```

을 찾을 수 있어야 한다.

전체 store를 매 요청마다 전부 `list()`해서 검색하는 구조는 피한다.

---

# 62. Blob 읽기 실패

다음을 구분한다.

- 존재하지 않는 ID
- 잘못된 ID
- Blob network 오류
- malformed JSON

존재하지 않는 문서는 정상적인 404 Reader 화면을 제공한다.

---

# 63. Share 완료 UX

공유 중:

```text
공유 중...
```

상태 표시.

버튼 중복 클릭 방지.

성공:

```text
공유 링크가 생성되었습니다.

https://domain/s/xxxxxxxxxxxxxxxx

[ 링크 복사 ]
```

링크 복사 성공 feedback 제공.

가능하면 Web Share API 지원 기기에서는:

```text
공유
```

를 눌러 시스템 공유 sheet를 띄우는 기능도 제공한다.

지원되지 않으면 clipboard fallback.

---

# 64. Validation

최소:

- 빈 Markdown 금지
- 지나치게 큰 입력 제한
- invalid JSON 처리
- invalid ID 거부
- share button duplicate 방지

개인용 장문 소설을 다룰 수 있을 정도의 여유 있는 크기를 허용한다.

몇 KB 수준의 지나치게 작은 제한을 걸지 않는다.

---

# 65. 제목

사용자 입력 제목 우선.

없으면:

1. 첫 번째 H1
2. `.md` filename
3. `Untitled`

순으로 추론할 수 있다.

---

# 66. 접근성

반드시 고려한다.

- 충분한 contrast
- keyboard focus 표시
- semantic heading
- button aria-label
- drawer accessibility
- Reader control keyboard support
- 최소 40~44px touch target
- browser zoom 허용

절대:

```html
user-scalable=no
```

를 넣지 않는다.

---

# 67. Reduced Motion

다음을 지원한다.

```css
prefers-reduced-motion
```

사용자가 reduced motion을 선호하면 page slide animation과 UI animation을 크게 줄이거나 제거한다.

---

# 68. 모바일 가시성

약 390px viewport로 실제 확인한다.

다음을 만족해야 한다.

- 본문 기본 17px 이상
- 양쪽 padding 약 18~22px
- line-height 충분함
- 작은 버튼 없음
- Reader toolbar가 본문을 압박하지 않음
- page number 읽기 가능
- swipe가 자연스러움

---

# 69. Desktop 가시성

1440px 이상에서 확인한다.

- 본문이 작아 보이지 않음
- 지나치게 넓지 않음
- 중앙에 안정적인 reading column
- toolbar는 적당히 가까움
- 큰 모니터를 이유로 font를 작게 만들지 않음

---

# 70. Paginated Mode의 Page Layout

모바일에서는 한 화면에 한 페이지를 기본으로 한다.

Desktop에서도 우선 한 페이지 중심으로 구현한다.

구현이 매우 안정적인 경우 추후 넓은 화면에서:

```text
[ 왼쪽 페이지 ] [ 오른쪽 페이지 ]
```

2-page spread를 지원할 수 있게 구조를 확장 가능하도록 만들 수 있다.

하지만 **초기 구현에서는 2-page spread를 필수 기능으로 만들지 않는다.**

한 페이지 Reader의 완성도를 우선한다.

---

# 71. Page Mode Fallback

Paginated Mode가 특정 브라우저나 비정상 DOM 때문에 제대로 계산되지 않는 경우 앱 전체가 깨져서는 안 된다.

안정적으로 Scroll Mode로 fallback할 수 있게 한다.

---

# 72. Browser Support

최신:

- Chrome
- Edge
- Safari
- Firefox

에서 핵심 읽기 기능이 동작하도록 한다.

Paginated CSS behavior가 브라우저별로 차이가 있으면 가장 단순하고 안정적인 구현을 택한다.

특정 브라우저 전용 API에 Reader 전체를 의존하지 않는다.

---

# 73. CSS 변수

Reader 핵심 값은 한 곳에서 관리한다.

예:

```css
--reader-font-size: 18px;
--reader-line-height: 1.9;
--reader-max-width: 720px;
--reader-page-gap: 32px;
```

컴포넌트 곳곳에 magic number를 중복하지 않는다.

---

# 74. 권장 구조

예:

```text
app/
  page.tsx

  api/
    share/
      route.ts

  s/
    [id]/
      page.tsx

components/
  editor/
    MarkdownEditor.tsx
    MarkdownDropzone.tsx
    EditorPreviewTabs.tsx

  reader/
    NovelReader.tsx

    ScrollReader.tsx
    PaginatedReader.tsx

    ReaderHeader.tsx
    ReaderSettings.tsx
    ReaderTableOfContents.tsx
    ReaderMenu.tsx
    ReadingProgress.tsx

  ui/
    최소 공용 component

hooks/
  useReaderSettings.ts
  useReadingPosition.ts
  usePagination.ts
  useSwipeNavigation.ts

lib/
  blob/
    documents.ts

  markdown/
    headings.ts
    title.ts

types/
  document.ts
```

정확히 같을 필요는 없지만 Reader logic을 하나의 giant component에 모두 집어넣지 않는다.

---

# 75. 지나친 추상화 금지

반대로:

- Repository Pattern
- Service Layer 여러 단계
- DI container
- state framework
- Redux
- Zustand

등은 특별한 이유가 없으면 추가하지 않는다.

이 프로젝트 규모에는 React state + hooks면 충분하다.

---

# 76. 환경 변수

`.env.local.example`

을 만들고 필요한 Vercel Blob 환경변수를 명확히 적는다.

예:

```text
BLOB_READ_WRITE_TOKEN=
```

실제 secret은 Git에 commit하지 않는다.

환경변수가 없으면 개발자가 바로 이해할 수 있는 오류를 출력한다.

---

# 77. 프로젝트 디자인

Reader가 메인 제품이다.

Editor UI보다 Reader UI 완성도에 더 많은 신경을 쓴다.

색을 많이 사용하는 앱이 아니다.

한두 개의 accent 정도만 사용한다.

과한 brand decoration은 필요 없다.

---

# 78. 긴 Markdown 테스트

짧은 Lorem Ipsum으로 테스트를 끝내지 않는다.

실제 테스트 fixture를 만든다.

최소:

- h1 title
- 첫 blockquote 작품 메모
- `## 1` ~ `## 15`
- 긴 한국어 paragraph
- 짧은 대사
- italic 독백
- bold
- `---`
- list
- link
- 수백 줄 이상의 내용

을 포함한다.

---

# 79. 반드시 Paginated Mode를 긴 문서로 검증

다음을 실제 확인한다.

1. 첫 페이지
2. 중간 페이지
3. 마지막 페이지
4. chapter boundary
5. font size 변경 후 repagination
6. line-height 변경 후 repagination
7. 모바일 portrait
8. 모바일 landscape
9. desktop resize
10. Scroll → Page
11. Page → Scroll
12. 재접속 후 위치 복원

---

# 80. Swipe 검증

다음 상황을 확인한다.

- 느린 swipe
- 빠른 swipe
- 작은 drag
- 세로 drag
- 텍스트 선택
- link tap
- toolbar tap
- 첫 페이지에서 이전
- 마지막 페이지에서 다음

첫/마지막에서는 overscroll 느낌 정도만 주고 잘못된 page index로 넘어가지 않는다.

---

# 81. Reader 미감 자체 검토

완성 후 스스로 다음 질문을 한다.

### A

스크린샷만 봤을 때 Markdown Viewer가 아니라 전자책/Web Novel Reader처럼 보이는가?

### B

스마트폰으로 30분 이상 읽을 만한가?

### C

글자를 작게 만들어 세련돼 보이게 하지는 않았는가?

### D

대사와 독백의 여백 및 리듬이 유지되는가?

### E

페이지를 넘기는 동작이 UI gimmick이 아니라 실제로 읽기 편한가?

### F

Reader control이 사라지면 작품 자체만 남는가?

하나라도 아니라면 조정한 후 완료한다.

---

# 82. 하지 말 것

구현하지 않는다:

- 로그인
- 회원가입
- 계정
- 댓글
- 좋아요
- 조회수
- 관리자
- 문서 Dashboard
- 문서 검색 서비스
- 공동 편집
- Yjs
- WebSocket
- AI 생성
- 결제
- 광고
- analytics
- Turso
- SQL
- ORM

현재 앱의 목적은:

```text
Markdown 넣기
        ↓
읽기 좋게 보기
        ↓
Blob에 저장
        ↓
URL 공유
        ↓
전자책처럼 읽기
```

뿐이다.

---

# 83. 구현 순서

긴 설계 문서를 먼저 작성하지 말고 실제 구현을 시작한다.

권장 순서:

1. Next.js 프로젝트 구성
2. Markdown renderer
3. Reader typography
4. Editor / import
5. Scroll Reader
6. Paginated Reader
7. pagination measurement
8. swipe / keyboard / tap navigation
9. Reader Settings
10. 목차
11. 읽던 위치 저장
12. Blob 저장/조회
13. 공유 URL
14. raw/copy/download
15. 반응형 검증
16. 긴 문서 QA
17. 실제 production build 확인

---

# 84. 완료 조건

다음이 모두 실제로 동작해야 완료다.

- 새 프로젝트 처음부터 구성
- `npm run dev` 정상
- production build 성공
- Markdown 직접 입력
- `.md` File Picker
- `.md` Drag & Drop
- Reader Preview
- Markdown 줄바꿈 보존
- 작품 메모
- 목차
- chapter navigation
- 세로 Scroll Reader
- 진짜 Paginated Reader
- 실제 viewport 기반 자동 페이지 분할
- 모바일 좌우 swipe
- swipe drag-follow animation
- snap
- 왼쪽/오른쪽 tap navigation
- 중앙 tap UI toggle
- Desktop ArrowLeft / ArrowRight
- page number
- reading progress
- Scroll ↔ Page 위치 유지
- font size 변경
- line-height 변경
- width 변경
- Light/Dark
- 가능한 경우 font 변경
- Reader 설정 저장
- 읽던 위치 저장
- resize repagination
- orientation repagination
- mobile safe area
- reduced motion
- Blob 저장
- 랜덤 공유 ID
- `/s/[id]`
- 다른 기기에서 공유 URL 읽기
- 존재하지 않는 문서 404
- 링크 복사
- Web Share API 가능 시 공유
- raw Markdown 보기
- Markdown 복사
- `.md` 다운로드
- 긴 Markdown QA
- 모바일/PC 가독성 검증

---

# 85. 마지막으로 매우 중요한 요구사항

기능을 많이 넣었다고 Reader 자체가 복잡해 보여서는 안 된다.

설정은 많아도 평소 화면은:

```text
          작품 제목


            본문

            본문

            본문


              12 / 47
```

정도로 조용해야 한다.

**기능은 숨어 있고 글은 드러나 있어야 한다.**

최종 사용자가 Markdown을 전혀 몰라도 상관없어야 한다.

친구에게 공유 URL 하나를 보내면 설명 없이 열어서 바로 읽을 수 있어야 한다.

---

구현이 끝난 뒤 긴 보고서를 작성하지 말고 다음만 정리한다.

1. 프로젝트 구조
2. 설치한 dependency
3. Reader 구현 방식
4. Pagination 구현 방식
5. Swipe 구현 방식
6. 기본 typography 수치
7. Vercel Blob 구성
8. 필요한 환경변수
9. 로컬 실행 방법
10. Vercel 배포 방법
11. 직접 테스트한 viewport
12. 남아 있는 기술적 한계가 있다면 그것만 명확히 보고한다.