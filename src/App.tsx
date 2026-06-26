
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import { HomePage } from './pages/HomePage';
import { CreateRoomPage } from './pages/CreateRoomPage';
import { JoinRoomPage } from './pages/JoinRoomPage';
import { CaptainDashboard } from './pages/CaptainDashboard';
import { MemberDashboard } from './pages/MemberDashboard';
import { PaymentSplitsPage } from './pages/PaymentSplitsPage';
import { DemoPage } from './pages/DemoPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/create" element={<CreateRoomPage />} />
          <Route path="/join" element={<JoinRoomPage />} />
          <Route path="/captain/:roomCode" element={<CaptainDashboard />} />
          <Route path="/member/:roomCode" element={<MemberDashboard />} />
          <Route path="/splits/:roomCode" element={<PaymentSplitsPage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          className: 'border-l-4 font-sans text-sm shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
          style: {
            background: '#0F2035',
            color: '#fff',
            borderRadius: '12px',
            padding: '12px 16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          },
          success: {
            style: { borderLeft: '4px solid #00A8CC', background: '#0F2035', color: '#fff' },
            icon: '⚡',
          },
          error: {
            style: { borderLeft: '4px solid #EF4444', background: '#0F2035', color: '#fff' },
            icon: '✕',
          },
        }}
      />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
