import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function App() {
  const [status, setStatus] = useState<'checking' | 'up' | 'down'>('checking');
  const [checkedAt, setCheckedAt] = useState<string>();
  async function check() {
    setStatus('checking');
    try {
      const response = await fetch('/actuator/health', { signal: AbortSignal.timeout(6000) });
      const body = await response.json();
      setStatus(response.ok && body.status === 'UP' ? 'up' : 'down');
    } catch {
      setStatus('down');
    }
    setCheckedAt(new Date().toLocaleTimeString('ko-KR'));
  }
  useEffect(() => { void check(); }, []);
  return (
    <main>
      <p className="eyebrow">BANKCORE LAB / LOCAL DEVELOPMENT</p>
      <h1>첫 연결부터,<br />차근차근.</h1>
      <p className="intro">은행 전산직 포트폴리오를 위한 로컬 개발 공간입니다.</p>
      <section aria-labelledby="connection-title">
        <div className="section-heading">
          <h2 id="connection-title">개발 환경 연결</h2>
          <span className="tag">3단계 · 환경 구성</span>
        </div>
        <div className="row"><span>React 웹 화면</span><strong>실행 중</strong></div>
        <div className="row"><span>Spring Boot + PostgreSQL</span>
          <strong className={status} role="status">
            {status === 'checking' ? '연결 확인 중…' : status === 'up' ? '연결 정상' : '연결 확인 필요'}
          </strong>
        </div>
        <p className="hint">{status === 'down'
          ? 'Docker의 PostgreSQL과 Spring Boot 서버가 실행 중인지 확인해 주세요.'
          : '서버가 데이터베이스에 실제로 접속할 수 있는지 확인합니다.'}</p>
        <button onClick={() => void check()} disabled={status === 'checking'}>연결 다시 확인</button>
        {checkedAt && <small>마지막 확인 {checkedAt}</small>}
      </section>
      <p className="footer">다음 작업: 회원가입 · 로그인 · 계좌 개설. 현재는 연결 확인 화면입니다.</p>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
