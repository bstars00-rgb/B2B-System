import { useState } from 'react';
import AiSearchPage from './components/AiSearchPage';
import HotelRoomTab from './components/HotelRoomTab';
import LoginPage from './components/LoginPage';
import { AUTH_KEY } from './utils/bookingStore';

/** ?hotel=<코드> 쿼리로 열리면 호텔 룸리스트 전용 탭 (실사이트: Select 시 새 창) */
const urlParams = new URLSearchParams(window.location.search);
const hotelParam = urlParams.get('hotel');

export default function App() {
  // Stay signed in — localStorage 유지로 새 탭(룸리스트)에서도 로그인 상태 공유
  const [loggedIn, setLoggedIn] = useState(() => {
    try {
      return localStorage.getItem(AUTH_KEY) === '1';
    } catch {
      return false;
    }
  });

  const handleLogin = (stay: boolean) => {
    if (stay) {
      try {
        localStorage.setItem(AUTH_KEY, '1');
      } catch {
        // 저장 실패 시 세션 내에서만 유지
      }
    }
    setLoggedIn(true);
  };
  const handleLogout = () => {
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch {
      // 무시
    }
    setLoggedIn(false);
  };

  if (!loggedIn) return <LoginPage onLogin={handleLogin} />;
  if (hotelParam) return <HotelRoomTab code={hotelParam} params={urlParams} />;
  return <AiSearchPage onLogout={handleLogout} />;
}
