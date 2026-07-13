import clsx from 'clsx';
import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, useState } from 'react';
import type { NetworkId, SendAssetType, WalletAccount } from '@shared/types';
import { ALL_NETWORK_IDS } from '@shared/networks';
import { getNetworkConfig } from '@shared/networks';

export function Button({
  variant = 'primary',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'primary' && 'bg-brand-500 hover:bg-brand-400 text-white shadow-glow',
        variant === 'secondary' && 'bg-surface-700 hover:bg-surface-600 text-white border border-surface-600',
        variant === 'danger' && 'bg-red-600 hover:bg-red-500 text-white',
        variant === 'ghost' && 'hover:bg-surface-700 text-gray-300',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({
  label,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <label className="block space-y-1.5">
      {label && <span className="text-sm text-gray-400">{label}</span>}
      <input
        className={clsx(
          'w-full rounded-xl border bg-surface-800 px-4 py-3 text-white placeholder:text-gray-500 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
          error ? 'border-red-500' : 'border-surface-600',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </label>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('rounded-2xl border border-surface-600 bg-surface-800/80 p-6 backdrop-blur', className)}>
      {children}
    </div>
  );
}

export function Badge({ children, variant = 'default' }: { children: ReactNode; variant?: 'default' | 'success' | 'warning' }) {
  return (
    <span
      className={clsx(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-surface-600 text-gray-300',
        variant === 'success' && 'bg-brand-900/50 text-brand-300',
        variant === 'warning' && 'bg-amber-900/50 text-amber-300'
      )}
    >
      {children}
    </span>
  );
}

export function CopyButton({
  text,
  label,
  copiedLabel,
  onCopied,
}: {
  text: string;
  label: string;
  copiedLabel?: string;
  onCopied?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        onCopied?.();
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? (copiedLabel || '✓') : label}
    </Button>
  );
}

export function AccountSelector({
  accounts,
  value,
  onChange,
  className,
  label = 'Акаунт / Account',
}: {
  accounts: WalletAccount[];
  value: string;
  onChange: (account: WalletAccount) => void;
  className?: string;
  label?: string;
}) {
  if (accounts.length <= 1) return null;
  return (
    <div className={clsx('space-y-2', className)}>
      <span className="text-sm text-gray-400">{label}</span>
      <select
        className="w-full rounded-lg border border-surface-600 bg-surface-800 px-3 py-2 text-sm"
        value={value}
        onChange={(e) => {
          const acc = accounts.find((a) => a.id === e.target.value);
          if (acc) onChange(acc);
        }}
      >
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function NetworkSelector({
  value,
  onChange,
  testnet = false,
}: {
  value: NetworkId;
  onChange: (v: NetworkId) => void;
  testnet?: boolean;
}) {
  return (
    <div className="space-y-2">
      <span className="text-sm text-gray-400">Мрежа / Network</span>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
        {ALL_NETWORK_IDS.map((net) => (
          <button
            key={net}
            type="button"
            onClick={() => onChange(net)}
            className={clsx(
              'rounded-xl border px-3 py-2.5 text-xs font-medium transition text-left',
              value === net
                ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                : 'border-surface-600 bg-surface-800 text-gray-400 hover:border-surface-500'
            )}
          >
            {getNetworkConfig(net, testnet).name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FeeTierSelector({
  value,
  onChange,
}: {
  value: 'slow' | 'normal' | 'fast';
  onChange: (v: 'slow' | 'normal' | 'fast') => void;
}) {
  const tiers = [
    { id: 'slow' as const, label: 'Slow' },
    { id: 'normal' as const, label: 'Normal' },
    { id: 'fast' as const, label: 'Fast' },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {tiers.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={clsx(
            'rounded-lg border px-3 py-2 text-sm',
            value === t.id ? 'border-brand-500 bg-brand-500/10 text-brand-300' : 'border-surface-600 text-gray-400'
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function SendAssetSelector({
  value,
  onChange,
  usdtLabel,
  usdcLabel,
  daiLabel,
  nativeLabel,
}: {
  value: SendAssetType;
  onChange: (v: SendAssetType) => void;
  usdtLabel: string;
  usdcLabel?: string;
  daiLabel?: string;
  nativeLabel: string;
}) {
  const options: Array<{ id: SendAssetType; label: string }> = [
    { id: 'usdt', label: usdtLabel },
    ...(usdcLabel ? [{ id: 'usdc' as const, label: usdcLabel }] : []),
    ...(daiLabel ? [{ id: 'dai' as const, label: daiLabel }] : []),
    { id: 'native', label: nativeLabel },
  ];
  const cols = options.length >= 4 ? 'grid-cols-2 sm:grid-cols-4' : options.length === 3 ? 'grid-cols-3' : 'grid-cols-2';
  return (
    <div className="space-y-2">
      <div className={clsx('grid gap-2', cols)}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={clsx(
              'rounded-xl border px-3 py-2.5 text-sm font-medium transition',
              value === option.id
                ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                : 'border-surface-600 bg-surface-800 text-gray-400 hover:border-surface-500'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const score = [
    password.length >= 8,
    password.length >= 12,
    /[A-Z]/.test(password) && /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-brand-500'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Strong'];
  const idx = Math.min(score, 4);
  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={clsx('h-1 flex-1 rounded', i <= idx ? colors[idx] : 'bg-surface-600')} />
        ))}
      </div>
      <span className="text-xs text-gray-500">{labels[idx]}</span>
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  );
}

export function ErrorAlert({ message }: { message: string }) {
  return <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{message}</div>;
}

export function SuccessAlert({ message }: { message: string }) {
  return <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm text-brand-200">{message}</div>;
}

export function WarningAlert({ message }: { message: string }) {
  return <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{message}</div>;
}

export function CopyrightFooter({ className }: { className?: string }) {
  return (
    <p className={clsx('text-center text-xs text-gray-600', className)}>
      © {new Date().getFullYear()} Evtinko Auctions
    </p>
  );
}

export function getExplorerTxUrl(network: NetworkId, hash: string, testnet = false): string {
  const cfg = getNetworkConfig(network, testnet);
  if (network === 'tron') return `${cfg.explorerUrl}/#/transaction/${hash}`;
  if (network === 'ton') return `${cfg.explorerUrl}/tx/${hash}`;
  if (network === 'solana' && testnet) return `${cfg.explorerUrl}/tx/${hash}?cluster=devnet`;
  return `${cfg.explorerUrl}/tx/${hash}`;
}
