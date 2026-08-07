import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<'en' | 'ta'>('en');
  const navigate = useNavigate();

  const t = {
    en: {
      title: 'VBills Stock',
      sub: 'Management System',
      userLabel: 'Branch / User ID',
      passLabel: 'Password',
      loginBtn: 'Login',
      forgot: 'Forgot password?',
      errorMsg: 'Wrong password / User ID',
    },
    ta: {
      title: 'VBills Stock',
      sub: 'மேலாண்மை அமைப்பு',
      userLabel: 'கிளை / பயனர் ID',
      passLabel: 'கடவுச்சொல்',
      loginBtn: 'உள்நுழை',
      forgot: 'கடவுச்சொல் மறந்துவிட்டதா?',
      errorMsg: 'தவறான கடவுச்சொல் / Wrong password',
    },
  }[lang];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Demo bypass
    if (username === 'admin' && password === 'admin') {
      localStorage.setItem('token', 'fake-jwt-token');
      localStorage.setItem('user', JSON.stringify({ role: 'ADMIN', username: 'Admin' }));
      window.location.href = '/';
      return;
    }
    if (username === 'branch' && password === 'branch') {
      localStorage.setItem('token', 'fake-jwt-token');
      localStorage.setItem('user', JSON.stringify({ role: 'BRANCH', username: 'RPC1', branch_id: 2 }));
      window.location.href = '/';
      return;
    }
    if (username === 'warehouse' && password === 'warehouse') {
      localStorage.setItem('token', 'fake-jwt-token');
      localStorage.setItem('user', JSON.stringify({ role: 'WAREHOUSE', username: 'Godown' }));
      window.location.href = '/';
      return;
    }

    try {
      const res = await axios.post('http://localhost:3000/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      window.location.href = '/';
    } catch (err: any) {
      setError(err.response?.data?.error || t.errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1E56A0 0%, #2980B9 50%, #4C8DD9 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Poppins', 'Noto Sans Tamil', sans-serif",
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none',
      }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            width: `${120 + i * 80}px`,
            height: `${120 + i * 80}px`,
            top: `${[10, 60, 20, 70, 40, 80][i]}%`,
            left: `${[5, 80, 50, 10, 90, 40][i]}%`,
            transform: 'translate(-50%,-50%)',
          }} />
        ))}
      </div>

      {/* Login Card */}
      <div style={{
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(12px)',
        borderRadius: 20,
        padding: '40px 36px',
        width: '100%',
        maxWidth: 420,
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        animation: 'slideUp 0.4s ease',
        position: 'relative',
      }}>

        {/* Language toggle */}
        <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 4 }}>
          {(['en', 'ta'] as const).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: '1.5px solid',
                borderColor: lang === l ? 'var(--vb-blue)' : 'var(--vb-border)',
                background: lang === l ? 'var(--vb-blue)' : 'transparent',
                color: lang === l ? '#fff' : 'var(--vb-muted)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: l === 'ta' ? "'Noto Sans Tamil', sans-serif" : 'Poppins',
              }}
            >
              {l === 'en' ? 'EN' : 'தமிழ்'}
            </button>
          ))}
        </div>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 72,
            height: 72,
            background: 'linear-gradient(135deg, #1E56A0, #4C8DD9)',
            borderRadius: 18,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            boxShadow: '0 8px 24px rgba(30,86,160,0.3)',
          }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: '#fff' }}>V</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1B1F27', lineHeight: 1.1 }}>
            {t.title}
          </div>
          <div style={{
            fontSize: 14, color: '#6B7280', marginTop: 4, fontWeight: 500,
            fontFamily: lang === 'ta' ? "'Noto Sans Tamil', sans-serif" : 'Poppins',
          }}>
            {t.sub}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Username */}
          <div>
            <label className="vb-label" style={{ fontFamily: lang === 'ta' ? "'Noto Sans Tamil', sans-serif" : undefined }}>
              {t.userLabel}
            </label>
            <input
              type="text"
              required
              className="vb-input vb-input-lg"
              placeholder={lang === 'en' ? 'e.g. admin or RPC1' : 'எ.கா. admin அல்லது RPC1'}
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>

          {/* Password */}
          <div>
            <label className="vb-label" style={{ fontFamily: lang === 'ta' ? "'Noto Sans Tamil', sans-serif" : undefined }}>
              {t.passLabel}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                required
                className="vb-input vb-input-lg"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingRight: 52 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280',
                  display: 'flex', padding: 4,
                }}
              >
                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'var(--vb-red-pale)',
              border: '1px solid rgba(231,76,60,0.3)',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--vb-red-dark)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: lang === 'ta' ? "'Noto Sans Tamil', sans-serif" : 'Poppins',
            }}>
              ⚠ {error}
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="vb-btn vb-btn-save"
            style={{ width: '100%', marginTop: 4 }}
          >
            {loading ? (
              <span style={{
                width: 20, height: 20, border: '3px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                display: 'inline-block',
              }} />
            ) : t.loginBtn}
          </button>

          {/* Forgot */}
          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: 'var(--vb-blue)', fontWeight: 600,
                fontFamily: lang === 'ta' ? "'Noto Sans Tamil', sans-serif" : 'Poppins',
              }}
            >
              {t.forgot}
            </button>
          </div>
        </form>

        {/* Demo hint */}
        <div style={{
          marginTop: 24,
          padding: '10px 14px',
          background: '#F7F9FC',
          borderRadius: 8,
          fontSize: 12,
          color: '#6B7280',
          textAlign: 'center',
          lineHeight: 1.6,
        }}>
          Demo: <strong>admin / admin</strong> · <strong>branch / branch</strong> · <strong>warehouse / warehouse</strong>
        </div>
      </div>
    </div>
  );
};

export default Login;
