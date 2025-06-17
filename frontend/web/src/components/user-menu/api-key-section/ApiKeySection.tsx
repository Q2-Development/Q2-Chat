// import { useState, useEffect } from 'react';
// import { IoKey, IoEye, IoEyeOff, IoSave, IoTrash, IoWarning, IoCheckmarkCircle, IoInformationCircle, IoRefresh } from 'react-icons/io5';
// import { useUserStore } from '@/store/userStore';
// import styles from './ApiKeySection.module.css';

// export const ApiKeySection = () => {
//   const { 
//     openRouterApiKey, 
//     apiKeyStatus, 
//     saveApiKey, 
//     deleteApiKey, 
//     loadApiKeyStatus,
//     apiKeyLoading,
//     isAuthenticated 
//   } = useUserStore();
  
//   const [localApiKey, setLocalApiKey] = useState('');
//   const [showApiKey, setShowApiKey] = useState(false);
//   const [hasChanges, setHasChanges] = useState(false);
//   const [validationError, setValidationError] = useState('');

//   useEffect(() => {
//     // Load initial API key from localStorage for display
//     setLocalApiKey(openRouterApiKey);
//   }, [openRouterApiKey]);

//   useEffect(() => {
//     // Load API key status when component mounts
//     if (isAuthenticated) {
//       loadApiKeyStatus();
//     }
//   }, [isAuthenticated, loadApiKeyStatus]);

//   const handleApiKeyChange = (value: string) => {
//     setLocalApiKey(value);
//     setHasChanges(value !== openRouterApiKey);
    
//     // Validate API key format
//     if (value.trim() && !value.trim().startsWith('sk-or-')) {
//       setValidationError('API key should start with "sk-or-"');
//     } else {
//       setValidationError('');
//     }
//   };

//   const handleSave = async () => {
//     if (!hasChanges || validationError) return;
    
//     const success = await saveApiKey(localApiKey.trim());
//     if (success) {
//       setHasChanges(false);
//     }
//   };

//   const handleClear = () => {
//     setLocalApiKey('');
//     setHasChanges(true);
//     setValidationError('');
//   };

//   const handleReset = () => {
//     setLocalApiKey(openRouterApiKey);
//     setHasChanges(false);
//     setValidationError('');
//   };

//   const handleDelete = async () => {
//     if (window.confirm('Are you sure you want to delete your API key?')) {
//       const success = await deleteApiKey();
//       if (success) {
//         setLocalApiKey('');
//         setHasChanges(false);
//         setValidationError('');
//       }
//     }
//   };

//   const isValidApiKey = (key: string) => {
//     return key.trim().length > 0 && key.startsWith('sk-or-');
//   };

//   const getCurrentKeyDisplay = () => {
//     if (isAuthenticated && apiKeyStatus) {
//       return apiKeyStatus.hasKey ? apiKeyStatus.maskedKey : null;
//     }
//     return openRouterApiKey ? `${openRouterApiKey.slice(0, 8)}...${openRouterApiKey.slice(-4)}` : null;
//   };

//   return (
//     <div className={styles.container}>
//       <div className={styles.header}>
//         <h2 className={styles.title}>API Keys</h2>
//         <p className={styles.subtitle}>
//           Manage your OpenRouter API key to access premium models and higher rate limits
//         </p>
//       </div>

//       <div className={styles.infoCard}>
//         <div className={styles.infoHeader}>
//           <IoInformationCircle size={20} className={styles.infoIcon} />
//           <h3 className={styles.infoTitle}>About OpenRouter API Keys</h3>
//         </div>
//         <div className={styles.infoContent}>
//           <p>
//             OpenRouter provides access to multiple AI models through a single API. 
//             With your own API key, you get:
//           </p>
//           <ul className={styles.benefitsList}>
//             <li>Access to premium models</li>
//             <li>Higher rate limits</li>
//             <li>Pay-per-use pricing</li>
//             <li>No monthly subscription fees</li>
//             <li>Better model availability</li>
//             <li>Faster response times</li>
//           </ul>
//           <p className={styles.infoFooter}>
//             Get your API key at{' '}
//             <a 
//               href="https://openrouter.ai/keys" 
//               target="_blank" 
//               rel="noopener noreferrer"
//               className={styles.link}
//             >
//               openrouter.ai/keys
//             </a>
//           </p>
//         </div>
//       </div>

//       <div className={styles.apiKeyCard}>
//         <div className={styles.cardHeader}>
//           <h3 className={styles.cardTitle}>OpenRouter API Key</h3>
//           {((isAuthenticated && apiKeyStatus?.hasKey) || (!isAuthenticated && openRouterApiKey)) && (
//             <div className={styles.statusBadge}>
//               <IoCheckmarkCircle size={16} />
//               <span>Configured</span>
//             </div>
//           )}
//         </div>

//         <div className={styles.inputGroup}>
//           <label htmlFor="apiKey" className={styles.label}>
//             API Key
//           </label>
//           <div className={styles.inputWrapper}>
//             <IoKey className={styles.inputIcon} />
//             <input
//               id="apiKey"
//               type={showApiKey ? 'text' : 'password'}
//               value={localApiKey}
//               onChange={(e) => handleApiKeyChange(e.target.value)}
//               placeholder="sk-or-v1-..."
//               className={`${styles.input} ${
//                 validationError ? styles.inputError : ''
//               }`}
//               disabled={apiKeyLoading}
//             />
//             <button
//               type="button"
//               onClick={() => setShowApiKey(!showApiKey)}
//               className={styles.eyeButton}
//               title={showApiKey ? 'Hide API key' : 'Show API key'}
//               disabled={apiKeyLoading}
//             >
//               {showApiKey ? <IoEyeOff size={16} /> : <IoEye size={16} />}
//             </button>
//           </div>
          
//           {validationError && (
//             <div className={styles.errorMessage}>
//               <IoWarning size={14} />
//               <span>{validationError}</span>
//             </div>
//           )}
          
//           {getCurrentKeyDisplay() && !hasChanges && (
//             <div className={styles.currentKey}>
//               <span>Current key: {getCurrentKeyDisplay()}</span>
//               {isAuthenticated && (
//                 <span className={styles.storedSecurely}> (stored securely on server)</span>
//               )}
//             </div>
//           )}
//         </div>

//         <div className={styles.actions}>
//           <button
//             onClick={handleSave}
//             disabled={Boolean(!hasChanges || validationError || apiKeyLoading || !localApiKey.trim())}
//             className={styles.saveButton}
//           >
//             {apiKeyLoading ? (
//               <IoRefresh size={16} className={styles.spin} />
//             ) : (
//               <IoSave size={16} />
//             )}
//             <span>{apiKeyLoading ? 'Saving...' : 'Save API Key'}</span>
//           </button>
          
//           {hasChanges && (
//             <button
//               onClick={handleReset}
//               className={styles.resetButton}
//               disabled={apiKeyLoading}
//             >
//               Reset
//             </button>
//           )}
          
//           {localApiKey && (
//             <button
//               onClick={handleClear}
//               className={styles.clearButton}
//               disabled={apiKeyLoading}
//             >
//               <IoTrash size={16} />
//               <span>Clear</span>
//             </button>
//           )}

//           {((isAuthenticated && apiKeyStatus?.hasKey) || (!isAuthenticated && openRouterApiKey)) && (
//             <button
//               onClick={handleDelete}
//               className={styles.deleteButton}
//               disabled={apiKeyLoading}
//             >
//               <IoTrash size={16} />
//               <span>Delete Key</span>
//             </button>
//           )}
//         </div>

//         {!isAuthenticated && (
//           <div className={styles.guestWarning}>
//             <IoWarning size={16} />
//             <span>
//               API key is stored locally in your browser. 
//               <strong> Sign in to store it securely and sync across devices.</strong>
//             </span>
//           </div>
//         )}
//       </div>

//       <div className={styles.securityCard}>
//         <div className={styles.securityHeader}>
//           <IoWarning size={20} className={styles.securityIcon} />
//           <h3 className={styles.securityTitle}>Security & Privacy</h3>
//         </div>
//         <div className={styles.securityContent}>
//           <ul className={styles.securityList}>
//             {isAuthenticated ? (
//               <>
//                 <li>Your API key is encrypted and stored securely on our servers</li>
//                 <li>Keys are encrypted in transit and at rest</li>
//                 <li>Only you can access or modify your API key</li>
//                 <li>API keys are never logged or shared</li>
//               </>
//             ) : (
//               <>
//                 <li>Your API key is stored locally in your browser only</li>
//                 <li>Keys are not synced across devices in guest mode</li>
//                 <li>Consider signing in for secure server-side storage</li>
//                 <li>Clear browser data will remove your API key</li>
//               </>
//             )}
//             <li>Never share your API key with others</li>
//             <li>Monitor your usage at OpenRouter dashboard</li>
//             <li>You can revoke and regenerate keys anytime</li>
//           </ul>
//         </div>
//       </div>

//       <div className={styles.usageCard}>
//         <h3 className={styles.usageTitle}>Usage & Billing</h3>
//         <div className={styles.usageGrid}>
//           <div className={styles.usageItem}>
//             <div className={styles.usageValue}>$0.00</div>
//             <div className={styles.usageLabel}>Current Month</div>
//           </div>
//           <div className={styles.usageItem}>
//             <div className={styles.usageValue}>0</div>
//             <div className={styles.usageLabel}>Requests</div>
//           </div>
//           <div className={styles.usageItem}>
//             <div className={styles.usageValue}>0</div>
//             <div className={styles.usageLabel}>Tokens</div>
//           </div>
//           <div className={styles.usageItem}>
//             <div className={styles.usageValue}>Never</div>
//             <div className={styles.usageLabel}>Last Used</div>
//           </div>
//         </div>
//         <p className={styles.usageNote}>
//           Usage statistics will be available once you start using your API key.
//           Monitor detailed usage at the{' '}
//           <a 
//             href="https://openrouter.ai/activity" 
//             target="_blank" 
//             rel="noopener noreferrer"
//             className={styles.link}
//           >
//             OpenRouter dashboard
//           </a>.
//         </p>
//       </div>
//     </div>
//   );
// };