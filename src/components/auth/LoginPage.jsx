import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import logoImg from '../../assets/logo.png';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, role, fullName);
        setSuccess('Akun berhasil dibuat! Silakan login.');
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const fillDummy = (type) => {
    if (type === 'admin') {
      setEmail('admin@digichat.ac.id');
      setPassword('admin123456');
    } else {
      setEmail('mahasiswa@digichat.ac.id');
      setPassword('mhs123456');
    }
    setIsLogin(true);
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-logo"><img src={logoImg} alt="DigiChatbot" /></div>
        <div className="login-brand">
          <h1>Digi<span>Chatbot</span></h1>
          <p>Sistem Chatbot Akademik Agentic berbasis AI untuk membantu mahasiswa</p>
        </div>
      </div>
      <div className="login-right">
        <div className="login-form-container">
          <h2>{isLogin ? 'Selamat Datang' : 'Buat Akun'}</h2>
          <p className="subtitle">{isLogin ? 'Masuk ke akun Anda' : 'Daftar akun baru'}</p>

          {error && <div className="form-error">{error}</div>}
          {success && <div className="form-success">{success}</div>}

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <div className="form-group">
                  <label>Nama Lengkap</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Masukkan nama lengkap" required />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select value={role} onChange={e => setRole(e.target.value)}>
                    <option value="student">Mahasiswa</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </>
            )}
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@contoh.com" required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Masukkan password" required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Memproses...' : (isLogin ? 'Masuk' : 'Daftar')}
            </button>
          </form>

          <div className="login-toggle">
            {isLogin ? 'Belum punya akun? ' : 'Sudah punya akun? '}
            <button onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}>
              {isLogin ? 'Daftar' : 'Masuk'}
            </button>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', gap: '8px' }}>
            <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => fillDummy('admin')}>
              Demo Admin
            </button>
            <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => fillDummy('student')}>
              Demo Mahasiswa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
