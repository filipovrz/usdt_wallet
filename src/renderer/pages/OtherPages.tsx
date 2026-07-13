import { useState, useEffect } from 'react';
import { Shield, Usb, Plus, Trash2, Pencil } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { Button, Card, Input, ErrorAlert, SuccessAlert } from '../components/ui';
import type { MultisigPolicy, NetworkId } from '@shared/types';
import { NetworkSelector } from '../components/ui';
import { useNotify } from '../hooks/useNotify';

export function SecurityPage() {
  const { t } = useWallet();
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">{t.security}</h1>
      <Card className="space-y-4">
        <div className="flex items-center gap-3">
          <Shield className="text-brand-400" size={24} />
          <h2 className="text-lg font-semibold">{t.securityTitle}</h2>
        </div>
        <ul className="space-y-2">
          {t.securityItems.map((item, i) => (
            <li key={i} className="text-sm text-gray-300">• {item}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function BackupPage() {
  const { t } = useWallet();
  const notify = useNotify();
  const [password, setPassword] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');

  const handleReveal = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await window.walletApi.getMnemonic(password);
    if (res.success && res.data) {
      setMnemonic(res.data.mnemonic);
      setPassphrase(res.data.passphrase || '');
      setRevealed(true);
      setPassword('');
      notify.success(notify.t.toast.mnemonicRevealed);
    } else {
      const msg = notify.apiError(res.error);
      setError(msg);
    }
  };

  const handleExport = async () => {
    const res = await window.walletApi.exportEncryptedBackup();
    if (res.success && res.data) {
      setBackupMsg(`Exported: ${res.data.path}`);
      notify.success(notify.t.toast.backupExported);
    } else {
      setBackupMsg(notify.t.toast.backupExportCancelled);
      notify.warning(notify.t.toast.backupExportCancelled);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">{t.backup}</h1>
      <Card className="max-w-xl space-y-4">
        <p className="text-sm text-amber-300">{t.mnemonicWarning}</p>
        {!revealed ? (
          <form onSubmit={handleReveal} className="space-y-4">
            <Input label={t.password} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <ErrorAlert message={error} />}
            <Button type="submit">{t.showMnemonic}</Button>
          </form>
        ) : (
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-900 p-4 font-mono text-sm">
            {mnemonic.split(' ').map((word, i) => (
              <span key={i} className="rounded-lg bg-surface-800 px-2 py-1">{i + 1}. {word}</span>
            ))}
          </div>
        )}
        {passphrase && <p className="text-sm text-gray-400">Passphrase: {passphrase}</p>}
        <Button variant="secondary" onClick={handleExport}>Export encrypted backup file</Button>
        {backupMsg && <SuccessAlert message={backupMsg} />}
      </Card>
    </div>
  );
}

export function SettingsPage() {
  const { t, settings, setLang, lang, refreshSession, session, activeAccount, setActiveAccount } = useWallet();
  const notify = useNotify();
  const [local, setLocal] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [vaultPath, setVaultPath] = useState('');
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [accountNames, setAccountNames] = useState<Record<string, string>>({});
  const [updateMsg, setUpdateMsg] = useState('');
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const acc of session.accounts) next[acc.id] = acc.name;
    setAccountNames(next);
  }, [session.accounts]);

  const handleSave = async () => {
    const res = await window.walletApi.updateSettings(local);
    if (!res.success) {
      notify.apiError(res.error);
      return;
    }
    if (local.language !== lang) setLang(local.language);
    document.documentElement.classList.toggle('light', local.theme === 'light');
    await refreshSession();
    setSaved(true);
    notify.success(notify.t.toast.settingsSaved);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveApiKeys = async () => {
    const res = await window.walletApi.updateSettings(local);
    if (res.success) {
      notify.success(notify.t.toast.apiKeysSaved);
    } else {
      notify.apiError(res.error);
    }
  };

  const handleChangePassword = async () => {
    const res = await window.walletApi.changePassword({ currentPassword: pwdCurrent, newPassword: pwdNew });
    if (res.success) {
      setPwdMsg(notify.t.toast.passwordChanged);
      notify.success(notify.t.toast.passwordChanged);
      setPwdCurrent('');
      setPwdNew('');
    } else {
      const msg = notify.apiError(res.error);
      setPwdMsg(msg);
    }
  };

  const handleAddAccount = async () => {
    if (!newAccountName.trim()) {
      notify.warning(notify.t.toast.accountNameRequired);
      return;
    }
    const res = await window.walletApi.addAccount(newAccountName.trim());
    if (res.success) {
      setNewAccountName('');
      await refreshSession();
      notify.success(notify.t.toast.accountAdded);
    } else {
      notify.apiError(res.error);
    }
  };

  const handleRenameAccount = async (accountId: string) => {
    const name = (accountNames[accountId] || '').trim();
    if (!name) {
      notify.warning(notify.t.toast.accountNameRequired);
      return;
    }
    const res = await window.walletApi.renameAccount(accountId, name);
    if (res.success) {
      await refreshSession();
      if (activeAccount?.id === accountId && res.data) setActiveAccount(res.data);
      notify.success(notify.t.toast.accountRenamed);
    } else {
      notify.apiError(res.error);
    }
  };

  const handleRemoveAccount = async (accountId: string, accountName: string) => {
    const msg = t.confirmRemoveAccount.replace('{name}', accountName);
    if (!confirm(msg)) return;
    const res = await window.walletApi.removeAccount(accountId);
    if (res.success) {
      const updated = await refreshSession();
      if (activeAccount?.id === accountId) {
        const first = updated?.accounts[0];
        if (first) setActiveAccount(first);
      }
      notify.success(notify.t.toast.accountRemoved);
    } else {
      notify.apiError(res.error);
    }
  };

  const handleCheckUpdates = async () => {
    const res = await window.walletApi.checkForUpdates();
    if (res.success && res.data) {
      setUpdateMsg(res.data.message || notify.t.toast.updateLatest);
      setUpdateAvailable(!!res.data.available);
      if (res.data.available) notify.info(notify.t.toast.updateAvailable);
      else notify.success(notify.t.toast.updateLatest);
    } else {
      const msg = notify.apiError(res.error);
      setUpdateMsg(msg);
    }
  };

  const handleDownloadUpdate = async () => {
    const res = await window.walletApi.downloadUpdate();
    if (res.success) {
      setUpdateMsg(res.data?.message || notify.t.toast.updateDownloadStarted);
      notify.info(notify.t.toast.updateDownloadStarted);
      if (res.data?.downloaded) setUpdateAvailable(false);
    } else {
      notify.apiError(res.error);
    }
  };

  const handleInstallUpdate = async () => {
    notify.info(notify.t.toast.updateInstallRestart);
    await window.walletApi.installUpdate();
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">{t.settings}</h1>

      <Card className="max-w-lg space-y-4">
        <h2 className="font-semibold">General</h2>
        <label className="block text-sm">Language
          <select className="mt-1 w-full rounded-xl border border-surface-600 bg-surface-800 px-4 py-2" value={local.language}
            onChange={(e) => setLocal({ ...local, language: e.target.value as 'bg' | 'en' })}>
            <option value="bg">Български</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="block text-sm">Theme
          <select className="mt-1 w-full rounded-xl border border-surface-600 bg-surface-800 px-4 py-2" value={local.theme}
            onChange={(e) => setLocal({ ...local, theme: e.target.value as 'dark' | 'light' })}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={local.testnetMode} onChange={(e) => setLocal({ ...local, testnetMode: e.target.checked })} />
          Testnet mode
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={local.offlineMode} onChange={(e) => setLocal({ ...local, offlineMode: e.target.checked })} />
          Offline mode (view-only)
        </label>
        <Input label={t.autoLock} type="number" min={1} max={120} value={local.autoLockMinutes}
          onChange={(e) => setLocal({ ...local, autoLockMinutes: parseInt(e.target.value, 10) })} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={local.hideBalances} onChange={(e) => setLocal({ ...local, hideBalances: e.target.checked })} />
          {t.hideBalances}
        </label>
        <Button onClick={handleSave}>{saved ? 'Saved!' : 'Save settings'}</Button>
      </Card>

      <Card className="max-w-lg space-y-4">
        <h2 className="font-semibold">API Keys</h2>
        <Input label="TronGrid API Key" value={local.trongridApiKey} onChange={(e) => setLocal({ ...local, trongridApiKey: e.target.value })} />
        <Input label="Etherscan API Key" value={local.etherscanApiKey} onChange={(e) => setLocal({ ...local, etherscanApiKey: e.target.value })} />
        <Input label="BscScan API Key" value={local.bscscanApiKey} onChange={(e) => setLocal({ ...local, bscscanApiKey: e.target.value })} />
        <Input label="PolygonScan API Key" value={local.polygonscanApiKey} onChange={(e) => setLocal({ ...local, polygonscanApiKey: e.target.value })} />
        <Input label="Arbiscan API Key" value={local.arbiscanApiKey} onChange={(e) => setLocal({ ...local, arbiscanApiKey: e.target.value })} />
        <Input label="Basescan API Key" value={local.basescanApiKey} onChange={(e) => setLocal({ ...local, basescanApiKey: e.target.value })} />
        <Input label="Snowtrace API Key (Avalanche)" value={local.snowtraceApiKey} onChange={(e) => setLocal({ ...local, snowtraceApiKey: e.target.value })} />
        <Input label="Toncenter API Key (TON)" value={local.toncenterApiKey} onChange={(e) => setLocal({ ...local, toncenterApiKey: e.target.value })} />
        <Input label="Lineascan API Key (Linea)" value={local.lineascanApiKey} onChange={(e) => setLocal({ ...local, lineascanApiKey: e.target.value })} />
        <Input label="Scrollscan API Key (Scroll)" value={local.scrollscanApiKey} onChange={(e) => setLocal({ ...local, scrollscanApiKey: e.target.value })} />
        <p className="text-xs text-gray-500">
          Optional — improve transaction history. Free keys from trongrid.io, etherscan.io, toncenter.com, lineascan.build, scrollscan.com. Optimism and zkSync use Etherscan key.
        </p>
        <Button variant="secondary" onClick={handleSaveApiKeys}>Save API keys</Button>
      </Card>

      <Card className="max-w-lg space-y-4">
        <h2 className="font-semibold">Lightning (LND)</h2>
        <p className="text-xs text-gray-500">
          Свържи собствен LND node чрез REST API. Lightning не работи без настроен node — портфейлът
          само изпраща/получава през твоя LND (без вграден node).
        </p>
        <Input
          label="LND REST URL"
          value={local.lndRestUrl}
          onChange={(e) => setLocal({ ...local, lndRestUrl: e.target.value })}
          placeholder="https://127.0.0.1:8080"
        />
        <Input
          label="LND Macaroon (hex)"
          value={local.lndMacaroon}
          onChange={(e) => setLocal({ ...local, lndMacaroon: e.target.value })}
          placeholder="0201036c6e64..."
        />
        <p className="text-xs text-gray-500">
          Macaroon: <code className="text-brand-300">~/.lnd/data/chain/bitcoin/mainnet/admin.macaroon</code>{' '}
          (hex: <code className="text-brand-300">xxd -ps -c 256 admin.macaroon</code> на Linux/macOS).
          REST трябва да е включен в lnd.conf (<code className="text-brand-300">restlisten=127.0.0.1:8080</code>).
        </p>
        <Button variant="secondary" onClick={handleSaveApiKeys}>Save Lightning settings</Button>
      </Card>

      <Card className="max-w-lg space-y-4">
        <h2 className="font-semibold">Accounts ({session.accounts.length})</h2>
        <ul className="space-y-3 text-sm">
          {session.accounts.map((acc) => (
            <li key={acc.id} className="rounded-lg border border-surface-600 bg-surface-800/50 px-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  className="min-w-[180px] flex-1"
                  value={accountNames[acc.id] ?? acc.name}
                  onChange={(e) =>
                    setAccountNames({ ...accountNames, [acc.id]: e.target.value })
                  }
                />
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => handleRenameAccount(acc.id)}
                  title={t.renameAccount}
                >
                  <Pencil size={14} />
                  {t.saveAccountName}
                </Button>
                {session.accounts.length > 1 && (
                  <Button
                    variant="danger"
                    type="button"
                    onClick={() => handleRemoveAccount(acc.id, acc.name)}
                    title={t.removeAccount}
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
              <p className="mt-2 break-all font-mono text-xs text-gray-500">
                <span className="text-gray-400">TRON:</span> {acc.tronAddress}
              </p>
              <p className="mt-1 break-all font-mono text-xs text-gray-500">
                <span className="text-gray-400">ETH:</span> {acc.ethAddress}
              </p>
              {acc.solanaAddress && (
                <p className="mt-1 break-all font-mono text-xs text-gray-500">
                  <span className="text-gray-400">SOL:</span> {acc.solanaAddress}
                </p>
              )}
              {acc.tonAddress && (
                <p className="mt-1 break-all font-mono text-xs text-gray-500">
                  <span className="text-gray-400">TON:</span> {acc.tonAddress}
                </p>
              )}
              {acc.bitcoinAddress && (
                <p className="mt-1 break-all font-mono text-xs text-gray-500">
                  <span className="text-gray-400">BTC:</span> {acc.bitcoinAddress}
                </p>
              )}
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Input value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} placeholder="New account name" />
          <Button onClick={handleAddAccount}><Plus size={16} /></Button>
        </div>
      </Card>

      <Card className="max-w-lg space-y-4">
        <h2 className="font-semibold">Change password</h2>
        <Input label="Current" type="password" value={pwdCurrent} onChange={(e) => setPwdCurrent(e.target.value)} />
        <Input label="New" type="password" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} />
        <Button onClick={handleChangePassword}>Change password</Button>
        {pwdMsg && <p className="text-sm text-gray-400">{pwdMsg}</p>}
      </Card>

      <Card className="max-w-lg space-y-4">
        <Button variant="secondary" onClick={async () => {
          const res = await window.walletApi.exportVault();
          if (res.success && res.data) {
            setVaultPath(res.data.path);
            notify.success(notify.t.toast.vaultPathShown);
          } else {
            notify.apiError(res.error);
          }
        }}>{t.exportVault}</Button>
        {vaultPath && <p className="break-all font-mono text-xs text-gray-500">{vaultPath}</p>}
        <Button variant="secondary" onClick={handleCheckUpdates}>Check for updates</Button>
        {updateAvailable && (
          <>
            <Button variant="secondary" onClick={handleDownloadUpdate}>Download update</Button>
            <Button onClick={handleInstallUpdate}>Install & restart</Button>
          </>
        )}
        {updateMsg && <p className="text-sm text-gray-400">{updateMsg}</p>}
        <Button variant="danger" onClick={async () => {
          if (confirm(t.deleteWarning)) {
            const res = await window.walletApi.deleteVault();
            if (res.success) {
              notify.success(notify.t.toast.walletDeleted);
              await refreshSession();
            } else {
              notify.apiError(res.error);
            }
          }
        }}>{t.deleteWallet}</Button>
      </Card>
    </div>
  );
}

export function HardwareWalletPage() {
  const notify = useNotify();
  const [devices, setDevices] = useState<Array<{ id: string; type: string; name: string; path?: string }>>([]);
  const [scanMsg, setScanMsg] = useState('');
  const [address, setAddress] = useState('');
  const [network, setNetwork] = useState<'tron' | 'ethereum'>('tron');
  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
    setLoading(true);
    setScanMsg('');
    const res = await window.walletApi.scanHardwareDevices();
    if (res.success && res.data) {
      setDevices(res.data);
      if (res.data.length) {
        notify.success(`${notify.t.toast.hardwareFound} (${res.data.length})`);
        setScanMsg(`Found ${res.data.length} device(s)`);
      } else {
        notify.info(notify.t.toast.hardwareNotFound);
        setScanMsg('No USB devices detected');
      }
    } else {
      const msg = notify.apiError(res.error);
      setScanMsg(msg);
    }
    setLoading(false);
  };

  const handleGetAddress = async (device: (typeof devices)[0]) => {
    setLoading(true);
    setAddress('');
    const res = await window.walletApi.getHardwareAddress(
      { id: device.id, type: device.type as 'ledger' | 'trezor', name: device.name, path: device.path },
      network
    );
    if (res.success && res.data) {
      setAddress(res.data.address);
      setScanMsg(`Address (${res.data.path}): ${res.data.address}`);
      notify.success(notify.t.toast.hardwareAddressRead);
    } else if (res.error === 'TREZOR_USE_SUITE') {
      notify.warning(notify.t.toast.trezorUseSuite);
      setScanMsg(notify.t.toast.trezorUseSuite);
    } else {
      const msg = notify.apiError(res.error);
      setScanMsg(msg);
    }
    setLoading(false);
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Hardware Wallet</h1>
      <Card className="max-w-lg space-y-4">
        <div className="flex items-center gap-3">
          <Usb className="text-brand-400" size={32} />
          <div>
            <h2 className="font-semibold">Ledger / Trezor</h2>
            <p className="text-sm text-gray-400">Connect via USB for cold signing</p>
          </div>
        </div>
        <p className="text-sm text-gray-300">
          Ledger: open TRON or Ethereum app on device, then scan and read address.
          Trezor: device detection only — use Trezor Suite for signing.
        </p>
        <label className="block text-sm">Network for address
          <select className="mt-1 w-full rounded-xl border border-surface-600 bg-surface-800 px-4 py-2"
            value={network} onChange={(e) => setNetwork(e.target.value as 'tron' | 'ethereum')}>
            <option value="tron">TRON (TRC-20)</option>
            <option value="ethereum">Ethereum / BSC / Polygon (EVM)</option>
          </select>
        </label>
        <Button variant="secondary" onClick={handleScan} disabled={loading}>
          {loading ? 'Scanning…' : 'Scan for devices'}
        </Button>
        {scanMsg && <p className="text-sm text-gray-400">{scanMsg}</p>}
        {devices.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-lg bg-surface-900 px-3 py-2">
            <span className="text-sm">{d.name} ({d.type})</span>
            {d.type === 'ledger' && (
              <Button variant="ghost" onClick={() => handleGetAddress(d)} disabled={loading}>Read address</Button>
            )}
          </div>
        ))}
        {address && <p className="break-all font-mono text-xs text-brand-300">{address}</p>}
        <p className="text-xs text-gray-500">Supported: Ledger Nano S/X (USB), Trezor Model T/One (detection)</p>
      </Card>
    </div>
  );
}

export function MultisigPage() {
  const { settings } = useWallet();
  const notify = useNotify();
  const [policies, setPolicies] = useState<MultisigPolicy[]>([]);
  const [name, setName] = useState('');
  const [threshold, setThreshold] = useState(2);
  const [totalSigners, setTotalSigners] = useState(3);
  const [signers, setSigners] = useState('');
  const [network, setNetwork] = useState<NetworkId>('tron');
  const [deployPassword, setDeployPassword] = useState('');
  const [deployMsg, setDeployMsg] = useState('');

  const load = async () => {
    const res = await window.walletApi.getMultisigPolicies();
    if (res.success && res.data) setPolicies(res.data);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    const res = await window.walletApi.addMultisigPolicy({
      name,
      threshold,
      totalSigners,
      signers: signers.split('\n').filter(Boolean),
      network,
    });
    if (res.success) {
      setName('');
      setSigners('');
      notify.success(notify.t.toast.policyAdded);
      load();
    } else {
      notify.apiError(res.error);
    }
  };

  const handleDeploy = async (policyId: string) => {
    if (!deployPassword) {
      notify.warning(notify.t.errors.INVALID_PASSWORD);
      setDeployMsg(notify.t.errors.INVALID_PASSWORD);
      return;
    }
    setDeployMsg('Deploying TRON permissions…');
    notify.info('Deploying TRON permissions…');
    const res = await window.walletApi.deployMultisigPolicy(policyId, deployPassword);
    if (res.success && res.data) {
      setDeployMsg(`Deployed: ${res.data.txHash}`);
      setDeployPassword('');
      notify.success(notify.t.toast.multisigDeployed);
    } else {
      const msg = notify.apiError(res.error);
      setDeployMsg(msg);
    }
    load();
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Multi-Sig Policies</h1>
      <Card className="max-w-lg space-y-4">
        <p className="text-sm text-gray-400">
          Define M-of-N signing policies. TRON: deploy on-chain via account permissions. EVM: policy storage + Gnosis Safe export.
        </p>
        <NetworkSelector value={network} onChange={setNetwork} testnet={settings.testnetMode} />
        <Input label="Policy name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Threshold (M)" type="number" min={1} value={threshold} onChange={(e) => setThreshold(parseInt(e.target.value, 10))} />
          <Input label="Total signers (N)" type="number" min={1} value={totalSigners} onChange={(e) => setTotalSigners(parseInt(e.target.value, 10))} />
        </div>
        <label className="block text-sm">Signer addresses (one per line)
          <textarea className="mt-1 w-full rounded-xl border border-surface-600 bg-surface-800 px-4 py-3 font-mono text-xs min-h-[80px]"
            value={signers} onChange={(e) => setSigners(e.target.value)} />
        </label>
        <Button onClick={handleAdd}>Add policy</Button>
      </Card>
      <Card className="max-w-lg space-y-3">
        <Input label="Password for on-chain deploy" type="password" value={deployPassword}
          onChange={(e) => setDeployPassword(e.target.value)} />
        {deployMsg && <p className="text-sm text-gray-400">{deployMsg}</p>}
      </Card>
      <Card>
        {policies.map((p) => (
          <div key={p.id} className="flex justify-between border-b border-surface-700 py-3 last:border-0">
            <div>
              <p className="font-semibold">{p.name}</p>
              <p className="text-sm text-gray-400">
                {p.threshold}-of-{p.totalSigners} · {p.network}
                {p.deployStatus && ` · ${p.deployStatus}`}
                {p.deployTxHash && ` · ${p.deployTxHash.slice(0, 10)}…`}
              </p>
            </div>
            <div className="flex gap-2">
              {p.network === 'tron' && p.deployStatus !== 'deployed' && (
                <Button variant="secondary" onClick={() => handleDeploy(p.id)}>Deploy on-chain</Button>
              )}
              <Button variant="ghost" onClick={async () => {
                const res = await window.walletApi.removeMultisigPolicy(p.id);
                if (res.success) {
                  notify.success(notify.t.toast.policyRemoved);
                  load();
                } else {
                  notify.apiError(res.error);
                }
              }}>
                <Trash2 size={16} className="text-red-400" />
              </Button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
