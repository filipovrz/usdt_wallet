import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { flushSync } from 'react-dom';
import type {
  SessionInfo,
  AppSettings,
  WalletAccount,
  BalanceInfo,
  NetworkId,
} from '@shared/types';
import { DEFAULT_SETTINGS } from '@shared/types';
import { translations, type Language } from '../i18n/translations';

interface WalletContextValue {
  session: SessionInfo;
  settings: AppSettings;
  t: (typeof translations)['bg'];
  lang: Language;
  setLang: (lang: Language) => void;
  refreshSession: (options?: { sync?: boolean }) => Promise<SessionInfo | null>;
  activeAccount: WalletAccount | null;
  setActiveAccount: (account: WalletAccount | null) => void;
  activeNetwork: NetworkId;
  setActiveNetwork: (network: NetworkId) => void;
  balance: BalanceInfo | null;
  refreshBalance: () => Promise<void>;
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  touchActivity: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionInfo>({
    unlocked: false,
    hasVault: false,
    accounts: [],
    settings: DEFAULT_SETTINGS,
    failedAttempts: 0,
  });
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [lang, setLangState] = useState<Language>('bg');
  const [activeAccount, setActiveAccount] = useState<WalletAccount | null>(null);
  const [activeNetwork, setActiveNetwork] = useState<NetworkId>('tron');
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = translations[lang];

  const refreshSession = useCallback(async (options?: { sync?: boolean }): Promise<SessionInfo | null> => {
    try {
      if (!window.walletApi) {
        setError('Wallet API not available — restart the application.');
        setLoading(false);
        return null;
      }
      const res = await window.walletApi.getSession();
      if (res.success && res.data) {
        const apply = () => {
          setSession(res.data!);
          setSettings(res.data!.settings);
          setLangState(res.data!.settings.language);
          setActiveNetwork(res.data!.settings.defaultNetwork);
          if (res.data!.accounts.length > 0 && !activeAccount) {
            setActiveAccount(res.data!.accounts[0]);
          }
        };
        if (options?.sync) {
          flushSync(apply);
        } else {
          apply();
        }
        return res.data;
      }
    } catch {
      setError('Failed to connect to wallet backend.');
    } finally {
      setLoading(false);
    }
    return null;
  }, [activeAccount]);

  const refreshBalance = useCallback(async () => {
    if (!activeAccount || !session.unlocked) return;
    const res = await window.walletApi.getBalance(activeAccount.id, activeNetwork);
    if (res.success && res.data) setBalance(res.data);
  }, [activeAccount, activeNetwork, session.unlocked]);

  const touchActivity = useCallback(() => {
    window.walletApi.touchActivity();
  }, []);

  const setLang = useCallback(
    async (newLang: Language) => {
      setLangState(newLang);
      const newSettings = { ...settings, language: newLang };
      setSettings(newSettings);
      await window.walletApi.updateSettings(newSettings);
    },
    [settings]
  );

  useEffect(() => {
    document.documentElement.classList.toggle('light', settings.theme === 'light');
  }, [settings.theme]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    setBalance(null);
    if (session.unlocked && activeAccount) {
      refreshBalance();
      const interval = setInterval(refreshBalance, 30000);
      return () => clearInterval(interval);
    }
  }, [session.unlocked, activeAccount, activeNetwork, refreshBalance]);

  useEffect(() => {
    const handler = () => touchActivity();
    window.addEventListener('mousemove', handler);
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('mousemove', handler);
      window.removeEventListener('keydown', handler);
    };
  }, [touchActivity]);

  return (
    <WalletContext.Provider
      value={{
        session,
        settings,
        t,
        lang,
        setLang,
        refreshSession,
        activeAccount,
        setActiveAccount,
        activeNetwork,
        setActiveNetwork,
        balance,
        refreshBalance,
        loading,
        error,
        setError,
        touchActivity,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
