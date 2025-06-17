import { IoSettings, IoSave, IoRefresh, IoVolumeHigh, IoVolumeOff,  IoMoon, IoSunny, IoKeypad } from 'react-icons/io5';
import { useUserStore } from '@/store/userStore';
import { useChatStore } from '@/store/chatStore';
import { ModelSelector } from '@/components/model-selector';
import styles from './PreferencesSection.module.css';

export const PreferencesSection = () => {
  const { 
    preferences, 
    updatePreferences, 
    preferencesLoading,
    isAuthenticated 
  } = useUserStore();
  
  const { 
    models, 
    modelsLoading, 
    modelsError, 
    modelSearch,
    fetchModels,
    setModelSearch 
  } = useChatStore();

  const handlePreferenceChange = async (key: keyof typeof preferences, value: any) => {
    await updatePreferences({ [key]: value });
  };

  const handleResetToDefaults = async () => {
    await updatePreferences({
      defaultModel: 'openai/gpt-4o',
      messageDisplay: 'comfortable',
      autoSave: true,
      soundEnabled: false,
      keyboardShortcuts: true,
      theme: 'dark',
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Preferences</h2>
        <p className={styles.subtitle}>
          Customize your Q2 Chat experience with these settings
          {!isAuthenticated && (
            <span className={styles.guestNote}>
              {' '}(Sign in to sync across devices)
            </span>
          )}
        </p>
      </div>

      <div className={styles.settingsGrid}>
        <div className={styles.settingCard}>
          <div className={styles.settingHeader}>
            <h3 className={styles.settingTitle}>Default Model</h3>
            <p className={styles.settingDescription}>
              Choose the AI model that will be selected by default for new chats. 
              Hover over models to see their capabilities and pricing.
            </p>
          </div>
          <div className={styles.settingControl}>
            <ModelSelector
              value={preferences.defaultModel}
              onChange={(model) => handlePreferenceChange('defaultModel', model)}
              models={models}
              modelsLoading={modelsLoading}
              modelsError={modelsError}
              modelSearch={modelSearch}
              onModelSearch={setModelSearch}
              onFetchModels={fetchModels}
              mode="inline"
              placeholder="Select default model"
              showTooltips={true}
              disabled={preferencesLoading}
              label=""
              showTools={true}
            />
          </div>
        </div>

        <div className={styles.settingCard}>
          <div className={styles.settingHeader}>
            <h3 className={styles.settingTitle}>Message Display</h3>
            <p className={styles.settingDescription}>
              Control the spacing and density of messages in chat
            </p>
          </div>
          <div className={styles.settingControl}>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="messageDisplay"
                  value="compact"
                  checked={preferences.messageDisplay === 'compact'}
                  onChange={(e) => handlePreferenceChange('messageDisplay', e.target.value)}
                  className={styles.radioInput}
                  disabled={preferencesLoading}
                />
                <span className={styles.radioCustom}></span>
                <div className={styles.radioContent}>
                  <span className={styles.radioTitle}>Compact</span>
                  <span className={styles.radioDescription}>Tighter spacing, more messages visible</span>
                </div>
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="messageDisplay"
                  value="comfortable"
                  checked={preferences.messageDisplay === 'comfortable'}
                  onChange={(e) => handlePreferenceChange('messageDisplay', e.target.value)}
                  className={styles.radioInput}
                  disabled={preferencesLoading}
                />
                <span className={styles.radioCustom}></span>
                <div className={styles.radioContent}>
                  <span className={styles.radioTitle}>Comfortable</span>
                  <span className={styles.radioDescription}>Relaxed spacing, easier to read</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className={styles.settingCard}>
          <div className={styles.settingHeader}>
            <h3 className={styles.settingTitle}>Auto-save Drafts</h3>
            <p className={styles.settingDescription}>
              Automatically save your message drafts as you type
            </p>
          </div>
          <div className={styles.settingControl}>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={preferences.autoSave}
                onChange={(e) => handlePreferenceChange('autoSave', e.target.checked)}
                className={styles.toggleInput}
                disabled={preferencesLoading}
              />
              <span className={styles.toggleSlider}>
                <span className={styles.toggleThumb}></span>
              </span>
              <span className={styles.toggleText}>
                {preferences.autoSave ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
        </div>

        <div className={styles.settingCard}>
          <div className={styles.settingHeader}>
            <h3 className={styles.settingTitle}>Sound Effects</h3>
            <p className={styles.settingDescription}>
              Play sounds for notifications and message completion
            </p>
          </div>
          <div className={styles.settingControl}>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={preferences.soundEnabled}
                onChange={(e) => handlePreferenceChange('soundEnabled', e.target.checked)}
                className={styles.toggleInput}
                disabled={preferencesLoading}
              />
              <span className={styles.toggleSlider}>
                <span className={styles.toggleThumb}>
                  {preferences.soundEnabled ? (
                    <IoVolumeHigh size={12} />
                  ) : (
                    <IoVolumeOff size={12} />
                  )}
                </span>
              </span>
              <span className={styles.toggleText}>
                {preferences.soundEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
        </div>

        <div className={styles.settingCard}>
          <div className={styles.settingHeader}>
            <h3 className={styles.settingTitle}>Keyboard Shortcuts</h3>
            <p className={styles.settingDescription}>
              Enable keyboard shortcuts for faster navigation
            </p>
          </div>
          <div className={styles.settingControl}>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={preferences.keyboardShortcuts}
                onChange={(e) => handlePreferenceChange('keyboardShortcuts', e.target.checked)}
                className={styles.toggleInput}
                disabled={preferencesLoading}
              />
              <span className={styles.toggleSlider}>
                <span className={styles.toggleThumb}>
                  <IoKeypad size={12} />
                </span>
              </span>
              <span className={styles.toggleText}>
                {preferences.keyboardShortcuts ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
        </div>

        <div className={styles.settingCard}>
          <div className={styles.settingHeader}>
            <h3 className={styles.settingTitle}>Theme</h3>
            <p className={styles.settingDescription}>
              Choose your preferred color theme (Light theme coming soon)
            </p>
          </div>
          <div className={styles.settingControl}>
            <div className={styles.themeSelector}>
              <button
                onClick={() => handlePreferenceChange('theme', 'dark')}
                className={`${styles.themeButton} ${
                  preferences.theme === 'dark' ? styles.themeButtonActive : ''
                }`}
                disabled={preferencesLoading}
              >
                <IoMoon size={20} />
                <span>Dark</span>
              </button>
              <button
                onClick={() => handlePreferenceChange('theme', 'light')}
                className={`${styles.themeButton} ${styles.themeButtonDisabled}`}
                disabled
              >
                <IoSunny size={20} />
                <span>Light</span>
                <span className={styles.comingSoon}>Soon</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.keyboardShortcuts}>
        <h3 className={styles.shortcutsTitle}>Keyboard Shortcuts</h3>
        <div className={styles.shortcutsGrid}>
          <div className={styles.shortcutItem}>
            <div className={styles.shortcutKeys}>
              <kbd>Ctrl</kbd> + <kbd>Enter</kbd>
            </div>
            <span className={styles.shortcutDescription}>Send message</span>
          </div>
          <div className={styles.shortcutItem}>
            <div className={styles.shortcutKeys}>
              <kbd>Ctrl</kbd> + <kbd>N</kbd>
            </div>
            <span className={styles.shortcutDescription}>New chat</span>
          </div>
          <div className={styles.shortcutItem}>
            <div className={styles.shortcutKeys}>
              <kbd>Ctrl</kbd> + <kbd>K</kbd>
            </div>
            <span className={styles.shortcutDescription}>Search models</span>
          </div>
          <div className={styles.shortcutItem}>
            <div className={styles.shortcutKeys}>
              <kbd>Esc</kbd>
            </div>
            <span className={styles.shortcutDescription}>Close modals</span>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          onClick={handleResetToDefaults}
          className={styles.resetButton}
          disabled={preferencesLoading}
        >
          <IoRefresh size={16} />
          <span>Reset to Defaults</span>
        </button>
      </div>

      {preferencesLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner}>
            <IoRefresh size={20} className={styles.spin} />
          </div>
        </div>
      )}
    </div>
  );
};