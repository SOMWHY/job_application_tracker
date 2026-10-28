import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authClient } from '../lib/authClient';

export default function Register() {
  const navigate = useNavigate();
  const { refetch } = authClient.useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await authClient.signUp.email({ name, email, password });
      if (error) {
        setError(error.message ?? '注册失败');
        return;
      }
      await refetch();
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow">
        <h1 className="mb-6 text-center text-2xl font-bold">注册</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">姓名</label>
            <input
              data-testid="register-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">邮箱</label>
            <input
              data-testid="register-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">密码（至少 8 位）</label>
            <input
              data-testid="register-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            data-testid="register-submit"
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-slate-900 py-2 text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? '注册中…' : '注册'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          已有账号？{' '}
          <Link to="/login" className="text-slate-900 underline">
            登录
          </Link>
        </p>
      </div>
    </div>
  );
}
