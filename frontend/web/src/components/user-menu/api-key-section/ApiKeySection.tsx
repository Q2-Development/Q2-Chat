import { useState } from 'react';
import { IoKey, IoEye, IoEyeOff, IoSave, IoTrash, IoWarning, IoCheckmarkCircle, IoInformationCircle } from 'react-icons/io5';
import { useUserStore } from '@/store/userStore';
import styles from './ApiKeySection.module.css';

export const ApiKeySection = () => {
  const { openRouterApiKey, saveApiKey } = useUserStore();
  const [localApiKey, setLocalApiKey] = useState(openRouterApiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleApiKeyChange = (value: string) => {
    setLocalApiKey(value);
    setHasChanges(value !== openRouterApiKey);
  };

  const handleSave = () => {
    saveApiKey(localApiKey.trim());
    setHasChanges(false);
  };

  const handleClear = () => {
    setLocalApiKey('');
    setHasChanges(true);
  };

  const handleReset = () => {
    setLocalApiKey(openRouterApiKey);
    setHasChanges(false);
  };

  const isValidApiKey = (key: string) => {
    return key.trim().length > 0 && key.startsWith('sk-or-');
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return key;
    return `${key.slice(0, 8)}...${key.slice(-4)}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>API Keys</h2>
        <p className={styles.subtitle}>
          Manage your OpenRouter API key to access premium models and higher rate limits
        </p>
      </div>

      <div className={styles.infoCard}>
        <div className={styles.infoHeader}>
          <IoInformationCircle size={20} className={styles.infoIcon} />
          <h3 className={styles.infoTitle}>About OpenRouter API Keys</h3>
        </div>
        <div className={styles.infoContent}>
          <p>
            OpenRouter provides access to multiple AI models through a single API. 
            With your own API key, you get:
          </p>
          <ul className={styles.benefitsList}>
            <li>Access to premium models</li>
            <li>Higher rate limits</li>
            <li>Pay-per-use pricing</li>
            <li>No monthly subscription fees</li>
          </ul>
          <p className={styles.infoFooter}>
            Get your API key at{' '}
            <a 
              href="https://openrouter.ai/keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.link}
            >
              openrouter.ai/keys
            </a>
          </p>
        </div>
      </div>

      <div className={styles.apiKeyCard}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>OpenRouter API Key</h3>
          {openRouterApiKey && (
            <div className={styles.statusBadge}>
              <IoCheckmarkCircle size={16} />
              <span>Configured</span>
            </div>
          )}
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="apiKey" className={styles.label}>
            API Key
          </label>
          <div className={styles.inputWrapper}>
            <IoKey className={styles.inputIcon} />
            <input
              id="apiKey"
              type={showApiKey ? 'text' : 'password'}
              value={localApiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder="sk-or-v1-..."
              className={`${styles.input} ${
                localApiKey && !isValidApiKey(localApiKey) ? styles.inputError : ''
              }`}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className={styles.eyeButton}
              title={showApiKey ? 'Hide API key' : 'Show API key'}
            >
              {showApiKey ? <IoEyeOff size={16} /> : <IoEye size={16} />}
            </button>
          </div>
          
          {localApiKey && !isValidApiKey(localApiKey) && (
            <div className={styles.errorMessage}>
              <IoWarning size={14} />
              <span>API key should start with "sk-or-"</span>
            </div>
          )}
          
          {openRouterApiKey && !hasChanges && (
            <div className={styles.currentKey}>
              <span>Current key: {maskApiKey(openRouterApiKey)}</span>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button
            onClick={handleSave}
            disabled={!hasChanges || (localApiKey && !isValidApiKey(localApiKey))}
            className={styles.saveButton}
          >
            <IoSave size={16} />
            <span>Save API Key</span>
          </button>
          
          {hasChanges && (
            <button
              onClick={handleReset}
              className={styles.resetButton}
            >
              Reset
            </button>
          )}
          
          {localApiKey && (
            <button
              onClick={handleClear}
              className={styles.clearButton}
            >
              <IoTrash size={16} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      <div className={styles.securityCard}>
        <div className={styles.securityHeader}>
          <IoWarning size={20} className={styles.securityIcon} />
          <h3 className={styles.securityTitle}>Security Notice</h3>
        </div>
        <div className={styles.securityContent}>
          <ul className={styles.securityList}>
            <li>Your API key is stored locally in your browser</li>
            <li>Never share your API key with others</li>
            <li>Monitor your usage at OpenRouter dashboard</li>
            <li>You can revoke and regenerate keys anytime</li>
          </ul>
        </div>
      </div>

      <div className={styles.usageCard}>
        <h3 className={styles.usageTitle}>Usage & Billing</h3>
        <div className={styles.usageGrid}>
          <div className={styles.usageItem}>
            <div className={styles.usageLabel}>Current Month</div>
            <div className={styles.usageValue}>$0.00</div>
          </div>
          <div className={styles.usageItem}>
            <div className={styles.usageLabel}>Requests</div>
            <div className={styles.usageValue}>0</div>
          </div>
          <div className={styles.usageItem}>
            <div className={styles.usageLabel}>Tokens</div>
            <div className={styles.usageValue}>0</div>
          </div>
          <div className={styles.usageItem}>
            <div className={styles.usageLabel}>Last Used</div>
            <div className={styles.usageValue}>Never</div>
          </div>
        </div>
        <p className={styles.usageNote}>
          Usage statistics will be available once you start using your API key.
          Monitor detailed usage at the OpenRouter dashboard.
        </p>
      </div>
    </div>
  );
};