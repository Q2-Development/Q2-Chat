import { useState } from 'react';
import { IoPerson, IoSave, IoMail, IoCalendar } from 'react-icons/io5';
import { useUserStore } from '@/store/userStore';
import styles from './ProfileSection.module.css';

export const ProfileSection = () => {
  const { 
    user, 
    userName, 
    avatarUrl, 
    isAuthenticated, 
    updateProfile, 
  } = useUserStore();
  
  const [localUserName, setLocalUserName] = useState(userName);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleNameChange = (value: string) => {
    setLocalUserName(value);
    setHasChanges(value !== userName);
  };

  const handleSave = () => {
    if (hasChanges && localUserName.trim()) {
      updateProfile({ userName: localUserName.trim() });
      setIsEditing(false);
      setHasChanges(false);
    }
  };

  const handleCancel = () => {
    setLocalUserName(userName);
    setIsEditing(false);
    setHasChanges(false);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <div className={styles.guestState}>
          <div className={styles.guestIcon}>
            <IoPerson size={48} />
          </div>
          <h2 className={styles.guestTitle}>Guest Mode</h2>
          <p className={styles.guestDescription}>
            You're currently using Q2 Chat as a guest. Your conversations are not saved 
            and won't sync across devices.
          </p>
          <div className={styles.guestFeatures}>
            <h3 className={styles.featuresTitle}>Sign in to unlock:</h3>
            <ul className={styles.featuresList}>
              <li>💬 Save and sync conversations</li>
              <li>🔧 Custom preferences</li>
              <li>🔑 Personal API keys</li>
              <li>📱 Cross-device access</li>
              <li>🎨 Custom themes and settings</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Profile Settings</h2>
        <p className={styles.subtitle}>
          Manage your account information and preferences
        </p>
      </div>

      <div className={styles.profileCard}>
        <div className={styles.avatarSection}>
          <div className={styles.avatarContainer}>
            <div className={styles.avatar}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className={styles.avatarImage} />
              ) : (
                <IoPerson size={32} />
              )}
            </div>
          </div>
        </div>
        <div className={styles.formSection}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Display Name</label>
            {isEditing ? (
              <div className={styles.editingContainer}>
                <input
                  type="text"
                  value={localUserName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={styles.input}
                  placeholder="Enter your display name"
                  autoFocus
                />
                <div className={styles.editActions}>
                  <button
                    onClick={handleSave}
                    disabled={!hasChanges || !localUserName.trim()}
                    className={styles.saveButton}
                  >
                    <IoSave size={16} />
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className={styles.cancelButton}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.displayContainer}>
                <span className={styles.displayValue}>
                  {userName || 'Not set'}
                </span>
                <button
                  onClick={() => setIsEditing(true)}
                  className={styles.editButton}
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Email Address</label>
            <div className={styles.staticField}>
              <IoMail className={styles.fieldIcon} />
              <span className={styles.fieldValue}>{user?.email}</span>
              <span className={styles.fieldBadge}>Verified</span>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Member Since</label>
            <div className={styles.staticField}>
              <IoCalendar className={styles.fieldIcon} />
              <span className={styles.fieldValue}>
                {formatDate(user?.created_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.statsCard}>
        <h3 className={styles.statsTitle}>Account Statistics</h3>
        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <div className={styles.statValue}>0</div>
            <div className={styles.statLabel}>Total Chats</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statValue}>0</div>
            <div className={styles.statLabel}>Messages Sent</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statValue}>0</div>
            <div className={styles.statLabel}>Models Used</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statValue}>0</div>
            <div className={styles.statLabel}>Files Uploaded</div>
          </div>
        </div>
      </div>
    </div>
  );
};