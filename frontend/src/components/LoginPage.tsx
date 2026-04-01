import { useState, useEffect, useRef } from 'react';
import { useLoginMutation } from '../api/api';
import { useDispatch } from 'react-redux';
import { login as loginAction } from '../store/authSlice';
import { useNavigate } from 'react-router-dom';

const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'password123';

export function LoginPage() {
  const [error, setError] = useState('');
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);

  const doLogin = async () => {
    setError('');
    try {
      const result = await login({ username: DEFAULT_USERNAME, password: DEFAULT_PASSWORD }).unwrap();
      localStorage.setItem('jwt_token', result.token);
      localStorage.setItem('username', DEFAULT_USERNAME);
      dispatch(loginAction(DEFAULT_USERNAME));
      navigate('/');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'data' in err) {
        const e = err as { data?: { error?: string } };
        setError(e.data?.error || 'Login failed');
      } else {
        setError('Login failed');
      }
    }
  };

  // 页面加载后自动登录
  useEffect(() => {
    doLogin();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doLogin();
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Blog System</h1>
        <p className="login-subtitle">Sign in to manage your blog</p>
        <form ref={formRef} onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              defaultValue={DEFAULT_USERNAME}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              defaultValue={DEFAULT_PASSWORD}
              required
            />
          </div>
          <button type="submit" disabled={isLoading} className="login-btn">
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
