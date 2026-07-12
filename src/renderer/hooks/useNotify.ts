import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import { formatApiError } from '../i18n/api-messages';

export function useNotify() {
  const { t } = useWallet();
  const toast = useToast();

  return {
    success: toast.success,
    error: toast.error,
    info: toast.info,
    warning: toast.warning,
    apiError: (code?: string) => {
      const msg = formatApiError(code, t);
      toast.error(msg);
      return msg;
    },
    t,
  };
}
