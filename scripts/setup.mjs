import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const destination = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(destination)) {
  console.log('기존 .env를 유지합니다.');
} else {
  writeFileSync(destination, `BANKCORE_DB_PASSWORD=${randomBytes(24).toString('hex')}\n`, {
    flag: 'wx', mode: 0o600,
  });
  console.log('로컬 DB 설정을 .env에 생성했습니다. 비밀번호는 출력하지 않습니다.');
}
