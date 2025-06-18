"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IoKey, IoEye, IoEyeOff, IoSave } from 'react-icons/io5';
import { useUserStore } from '@/store/userStore';
import styles from './setup.module.css';

export default function SetupApiKeyPage() {
  const router = useRouter();
  const { updateApiKey } = useUserStore();
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!apiKey.trim() || !apiKey.startsWith('sk-or-')) {
      setError('Please enter a valid OpenRouter API key');
      return;
    }

    setIsLoading(true);
    const success = await updateApiKey(apiKey);
    
    if (success) {
      router.push('/');
    } else {
      setError('Failed to validate API key. Please check and try again.');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="flex h-screen bg-neutral-900 text-white items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className={styles.container}>
          <h1 className={styles.title}>Final Step: Add Your API Key</h1>
          <p className={styles.subtitle}>
            To use Q2 Chat, you need an OpenRouter API key. This allows you to access all AI models.
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="apiKey" className={styles.label}>OpenRouter API Key</label>
              <div className={styles.inputWrapper}>
                <IoKey className={styles.inputIcon} />
                <input
                  id="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-or-..."
                  className={styles.input}
                  required
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className={styles.eyeButton}
                  tabIndex={-1}
                >
                  {showApiKey ? <IoEyeOff size={16} /> : <IoEye size={16} />}
                </button>
              </div>
              {error && (
                <div className={styles.error}>{error}</div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !apiKey.trim()}
              className={styles.submitButton}
            >
              {isLoading ? (
                <div className={styles.spinner} />
              ) : (
                <>
                  <IoSave size={18} />
                  <span>Save and Continue</span>
                </>
              )}
            </button>
          </form>

          <div className={styles.helpText}>
            <p>Don't have an API key? Get one at{' '}
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
      </div>
    </div>
  );
}