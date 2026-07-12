import { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';

import { AlertTriangle } from 'lucide-react';

import { useWallet } from '../context/WalletContext';

import { Button, Card, Input, ErrorAlert, PasswordStrength, WarningAlert } from '../components/ui';

import { useNotify } from '../hooks/useNotify';



export function CreateWalletPage() {

  const { t, refreshSession } = useWallet();

  const notify = useNotify();

  const navigate = useNavigate();

  const [step, setStep] = useState<'form' | 'mnemonic'>('form');

  const [name, setName] = useState('Моят USDT портфейл');

  const [password, setPassword] = useState('');

  const [confirm, setConfirm] = useState('');

  const [mnemonic, setMnemonic] = useState('');

  const [error, setError] = useState('');

  const [loading, setLoading] = useState(false);

  const [passphrase, setPassphrase] = useState('');

  const [confirmed, setConfirmed] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {

    e.preventDefault();

    if (password.length < 8) {

      const msg = t.passwordMin;

      setError(msg);

      notify.warning(msg);

      return;

    }

    if (password !== confirm) {

      const msg = t.passwordsMismatch;

      setError(msg);

      notify.warning(msg);

      return;

    }

    setLoading(true);
    setError('');

    try {
      if (!window.walletApi?.createWallet) {
        throw new Error('WALLET_API_UNAVAILABLE');
      }
      const res = await window.walletApi.createWallet({ name, password, passphrase: passphrase || undefined });

      if (res.success && res.data) {
        setMnemonic(res.data.mnemonic);
        setStep('mnemonic');
        notify.success(notify.t.toast.walletCreated);
      } else {
        if (res.error === 'VAULT_EXISTS') {
          await refreshSession();
          notify.info(t.vaultAlreadyExists);
          navigate('/unlock', { replace: true });
          return;
        }
        const msg = res.error ? notify.apiError(res.error) : notify.t.errors.unknown;
        setError(msg);
        notify.error(msg);
      }
    } catch (err) {
      const msg =
        err instanceof Error && err.message === 'WALLET_API_UNAVAILABLE'
          ? 'Wallet API не е наличен — рестартирайте приложението.'
          : notify.t.errors.CREATE_WALLET_FAILED;
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };



  const handleFinish = async () => {
    if (!confirmed) return;
    setLoading(true);
    try {
      const res = await window.walletApi.finalizeWalletSetup({ password });
      if (res.success) {
        const session = await refreshSession({ sync: true });
        notify.success(notify.t.toast.walletReady);
        navigate(session?.unlocked ? '/dashboard' : '/unlock', { replace: true });
      } else {
        const msg = notify.apiError(res.error);
        notify.error(msg);
        setError(msg);
      }
    } catch {
      const msg = notify.t.errors.CREATE_WALLET_FAILED;
      notify.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };



  if (step === 'mnemonic') {

    return (

      <div className="flex min-h-screen items-center justify-center bg-surface-900 p-6">

        <Card className="w-full max-w-xl space-y-6">

          <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 p-4 text-amber-200">

            <AlertTriangle size={20} className="mt-0.5 shrink-0" />

            <div>

              <p className="font-semibold">{t.saveMnemonic}</p>

              <p className="mt-1 text-sm text-amber-300/80">{t.mnemonicWarning}</p>

            </div>

          </div>

          <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-900 p-4 font-mono text-sm">

            {mnemonic.split(' ').map((word, i) => (

              <span key={i} className="rounded-lg bg-surface-800 px-2 py-1 text-brand-300">

                {i + 1}. {word}

              </span>

            ))}

          </div>

          <label className="flex items-center gap-2 text-sm text-gray-400">

            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />

            Записах seed фразата на безопасно място

          </label>

          <Button className="w-full" disabled={!confirmed || loading} onClick={handleFinish}>

            {t.continue}

          </Button>

        </Card>

      </div>

    );

  }



  return (

    <div className="flex min-h-screen items-center justify-center bg-surface-900 p-6">

      <Card className="w-full max-w-md space-y-6">

        <h1 className="text-2xl font-bold">{t.createWallet}</h1>

        <WarningAlert message={t.createWalletHint} />

        <form onSubmit={handleCreate} className="space-y-4">

          <Input label={t.walletName} value={name} onChange={(e) => setName(e.target.value)} />

          <Input label="Passphrase (optional, BIP39)" type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />

          <Input

            label={t.password}

            type="password"

            value={password}

            onChange={(e) => setPassword(e.target.value)}

          />

          <PasswordStrength password={password} />

          <Input

            label={t.confirmPassword}

            type="password"

            value={confirm}

            onChange={(e) => setConfirm(e.target.value)}

          />

          {error && <ErrorAlert message={error} />}

          <div className="flex gap-3">

            <Button type="button" variant="ghost" onClick={() => navigate('/')}>

              {t.cancel}

            </Button>

            <Button type="submit" className="flex-1" disabled={loading}>

              {loading ? t.loading : t.create}

            </Button>

          </div>

        </form>

      </Card>

    </div>

  );

}



export function ImportWalletPage() {

  const { t, refreshSession } = useWallet();

  const notify = useNotify();

  const navigate = useNavigate();

  const [name, setName] = useState('Импортиран портфейл');

  const [mnemonic, setMnemonic] = useState('');

  const [password, setPassword] = useState('');

  const [confirm, setConfirm] = useState('');

  const [passphrase, setPassphrase] = useState('');

  const [error, setError] = useState('');

  const [loading, setLoading] = useState(false);



  const handleImport = async (e: React.FormEvent) => {

    e.preventDefault();

    if (password.length < 8) {

      const msg = t.passwordMin;

      setError(msg);

      notify.warning(msg);

      return;

    }

    if (password !== confirm) {

      const msg = t.passwordsMismatch;

      setError(msg);

      notify.warning(msg);

      return;

    }

    setLoading(true);
    setError('');

    try {
      const res = await window.walletApi.importWallet({ name, mnemonic, password, passphrase: passphrase || undefined });

      if (res.success) {
        await refreshSession();
        notify.success(notify.t.toast.walletImported);
        navigate('/dashboard');
      } else {
        const msg = res.error === 'INVALID_MNEMONIC' ? t.invalidMnemonic : notify.apiError(res.error);
        if (res.error === 'INVALID_MNEMONIC') notify.error(t.invalidMnemonic);
        else notify.error(msg);
        setError(msg);
      }
    } catch {
      const msg = notify.t.errors.unknown;
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };



  return (

    <div className="flex min-h-screen items-center justify-center bg-surface-900 p-6">

      <Card className="w-full max-w-md space-y-6">

        <h1 className="text-2xl font-bold">{t.importWallet}</h1>

        <form onSubmit={handleImport} className="space-y-4">

          <Input label={t.walletName} value={name} onChange={(e) => setName(e.target.value)} />

          <label className="block space-y-1.5">

            <span className="text-sm text-gray-400">{t.mnemonic}</span>

            <textarea

              value={mnemonic}

              onChange={(e) => setMnemonic(e.target.value)}

              className="w-full rounded-xl border border-surface-600 bg-surface-800 px-4 py-3 font-mono text-sm outline-none focus:border-brand-500 min-h-[100px]"

              placeholder="word1 word2 word3 ..."

            />

          </label>

          <Input label="Passphrase (optional)" type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />

          <Input

            label={t.password}

            type="password"

            value={password}

            onChange={(e) => setPassword(e.target.value)}

          />

          <PasswordStrength password={password} />

          <Input

            label={t.confirmPassword}

            type="password"

            value={confirm}

            onChange={(e) => setConfirm(e.target.value)}

          />

          {error && <ErrorAlert message={error} />}

          <div className="flex gap-3">

            <Button type="button" variant="ghost" onClick={() => navigate('/')}>

              {t.cancel}

            </Button>

            <Button type="submit" className="flex-1" disabled={loading}>

              {loading ? t.loading : t.import}

            </Button>

          </div>

        </form>

      </Card>

    </div>

  );

}

