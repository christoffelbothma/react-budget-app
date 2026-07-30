import { useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function PwaUpdatePrompt() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [previewPrompt, setPreviewPrompt] = useState(
    () => import.meta.env.DEV && new URLSearchParams(window.location.search).has('preview-update'),
  );
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh && !previewPrompt) return null;

  async function handleUpdate() {
    setIsUpdating(true);
    setMessage('');

    try {
      await updateServiceWorker(true);
    } catch {
      setIsUpdating(false);
      setMessage('The update could not be installed. Please try again.');
    }
  }

  function handleLater() {
    setNeedRefresh(false);
    setPreviewPrompt(false);
    setMessage('');

    if (previewPrompt) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  return (
    <section
      className="pwa-update-prompt"
      role="alertdialog"
      aria-labelledby="pwa-update-title"
      aria-describedby="pwa-update-description"
    >
      <span className="pwa-update-icon" aria-hidden="true">
        <Sparkles size={21} />
      </span>
      <div className="pwa-update-copy">
        <strong id="pwa-update-title">A newer BudgetR is available</strong>
        <p id="pwa-update-description">
          {message || 'Update now to get the latest improvements. Your saved data will stay safe.'}
        </p>
      </div>
      <div className="pwa-update-actions">
        <button className="pwa-update-later" type="button" onClick={handleLater} disabled={isUpdating}>
          Later
        </button>
        <button className="pwa-update-now" type="button" onClick={handleUpdate} disabled={isUpdating}>
          <RefreshCw size={17} className={isUpdating ? 'spin' : ''} />
          {isUpdating ? 'Updating…' : 'Update now'}
        </button>
      </div>
    </section>
  );
}
