import { createClient } from "@tursodatabase/serverless/compat";

function credentials() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new Error("TURSO_DATABASE_URL과 TURSO_AUTH_TOKEN 환경변수가 필요합니다.");
  }
  return { url, authToken };
}

export function getTursoClient() {
  return createClient(credentials());
}
