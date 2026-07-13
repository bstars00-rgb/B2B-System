import { useState } from 'react';
import AiSearchPage from './components/AiSearchPage';
import LoginPage from './components/LoginPage';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  if (!loggedIn) return <LoginPage onLogin={() => setLoggedIn(true)} />;
  return <AiSearchPage onLogout={() => setLoggedIn(false)} />;
}
