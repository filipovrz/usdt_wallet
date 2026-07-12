import { useState } from 'react';

import { Link } from 'react-router-dom';

import { Shield, Wallet, Import } from 'lucide-react';

import { useWallet } from '../context/WalletContext';

import { Button, Card, CopyrightFooter } from '../components/ui';

import { useNotify } from '../hooks/useNotify';



export function WelcomePage() {

  const { t } = useWallet();



  return (

    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-surface-900 via-surface-800 to-brand-900/20 p-6">

      <div className="w-full max-w-lg space-y-8">

        <div className="text-center">

          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/20 text-brand-400 shadow-glow">

            <Shield size={32} />

          </div>

          <h1 className="text-3xl font-bold text-white">{t.welcome}</h1>

          <p className="mt-3 text-gray-400">{t.welcomeDesc}</p>

        </div>



        <Card className="space-y-4">

          <Link to="/create">

            <Button className="w-full" variant="primary">

              <Wallet size={18} />

              {t.createWallet}

            </Button>

          </Link>

          <Link to="/import">

            <Button className="w-full" variant="secondary">

              <Import size={18} />

              {t.importWallet}

            </Button>

          </Link>

        </Card>



        <p className="text-center text-xs text-gray-600">{t.installInfo}</p>

        <CopyrightFooter />

      </div>

    </div>

  );

}



export function UnlockPage() {

  const { t, refreshSession, session } = useWallet();

  const notify = useNotify();

  const [password, setPassword] = useState('');

  const [error, setError] = useState('');

  const [loading, setLoading] = useState(false);



  const handleUnlock = async (e: React.FormEvent) => {

    e.preventDefault();

    setLoading(true);

    setError('');

    const res = await window.walletApi.unlock({ password });

    if (res.success) {

      await refreshSession();

      notify.success(notify.t.toast.unlockSuccess);

    } else {

      const msg = notify.apiError(res.error);

      setError(msg);

      notify.error(msg);

    }

    setLoading(false);

  };



  return (

    <div className="flex min-h-screen items-center justify-center bg-surface-900 p-6">

      <Card className="w-full max-w-md space-y-6">

        <div className="text-center">

          <h1 className="text-2xl font-bold">{t.unlock}</h1>

          {session.failedAttempts > 0 && (

            <p className="mt-2 text-sm text-amber-400">

              {session.failedAttempts}/5 опита

            </p>

          )}

        </div>

        <form onSubmit={handleUnlock} className="space-y-4">

          <input

            type="password"

            value={password}

            onChange={(e) => setPassword(e.target.value)}

            placeholder={t.password}

            className="w-full rounded-xl border border-surface-600 bg-surface-800 px-4 py-3 outline-none focus:border-brand-500"

            autoFocus

          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading || !password}>

            {loading ? t.loading : t.unlock}

          </Button>

        </form>

        <CopyrightFooter />

      </Card>

    </div>

  );

}

