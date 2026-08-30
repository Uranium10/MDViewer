# MD북스 v2 (MDViewer)

Markdown과 텍스트 파일을 전자책처럼 읽고, 필요한 경우 암호화된 링크로 공유하는 Next.js 웹 애플리케이션입니다.

## 암호화된 공유

- 공유할 때 브라우저의 Web Crypto API로 임의의 256비트 AES-GCM 키와 96비트 IV를 생성합니다.
- Web Crypto API는 보안 컨텍스트에서 동작하므로 프로덕션에서는 HTTPS가 필요합니다. `localhost`는 로컬 개발용 보안 컨텍스트로 취급됩니다.
- 제목과 Markdown 본문은 브라우저에서 하나의 페이로드로 암호화됩니다.
- Turso에는 문서 ID, 암호문, IV, 암호화 버전, 생성 시각, 만료 시각만 저장합니다.
- v2 공유 문서는 암호화 페이로드와 DB `encryption_version`을 모두 `2`로 기록합니다.
- 복호화 키는 `/view/{id}#k={base64url_key}`의 URL 프래그먼트에만 포함됩니다. 프래그먼트는 HTTP 요청으로 서버에 전달되지 않습니다.
- 공유 문서 페이지는 클라이언트에서만 암호문을 가져와 복호화합니다. 링크 전체를 가진 사람은 문서를 열 수 있으므로 링크를 비밀로 취급해야 합니다.

## 보관 및 삭제 정책

- 공유 문서는 생성 시점부터 7일 동안 보관됩니다.
- 만료된 문서는 조회 API에서 `404`로 처리합니다.
- Vercel Cron이 매일 `03:00 UTC`에 만료된 레코드를 삭제합니다.
- 기존 평문 및 pre-v2 레코드는 마이그레이션할 때 복사하지 않고 완전히 삭제합니다. v2 스키마는 암호화 버전 `2`만 허용합니다.

## 환경 변수와 데이터베이스 준비

`.env.example`을 참고해 다음 값을 설정합니다.

- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`: Turso 연결 정보
- `CRON_SECRET`: 16자 이상의 임의 문자열. Vercel이 Cron 요청의 `Authorization` 헤더에 자동으로 전달합니다.
- `NEXT_PUBLIC_SITE_URL`: 프로덕션 사이트의 공개 URL

최초 생성 또는 기존 평문 테이블 마이그레이션은 한 번 실행합니다.

```bash
npm run db:init
```

주의: 기존 스키마에서 실행하면 저장되어 있던 평문 제목·본문과 pre-v2 레코드를 완전히 삭제합니다. 필요한 경우 실행 전에 Turso 백업을 준비하세요.

## 로컬 실행

```bash
npm install
npm run dev
```

개발자 연락: [kdm10ho@naver.com](mailto:kdm10ho@naver.com)
