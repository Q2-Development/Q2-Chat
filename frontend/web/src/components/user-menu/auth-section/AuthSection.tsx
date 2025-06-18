// import { useState } from 'react';
// import { IoMail, IoLockClosed, IoEye, IoEyeOff, IoLogIn, IoPersonAdd, IoAlert } from 'react-icons/io5';
// import { useUserStore } from '@/store/userStore';
// import styles from './AuthSection.module.css';

// export const AuthSection = () => {
//   const { login, signup, isLoading, authError, clearAuthError } = useUserStore();
//   const [isSignUp, setIsSignUp] = useState(false);
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [confirmPassword, setConfirmPassword] = useState('');
//   const [showPassword, setShowPassword] = useState(false);
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     clearAuthError();

//     if (!email.trim() || !password.trim()) {
//       return;
//     }

//     if (isSignUp) {
//       if (password !== confirmPassword) {
//         return;
//       }
//       if (password.length < 6) {
//         return;
//       }
//       await signup(email.trim(), password);
//     } else {
//       await login(email.trim(), password);
//     }
//   };

//   const handleModeSwitch = () => {
//     setIsSignUp(!isSignUp);
//     setPassword('');
//     setConfirmPassword('');
//     setShowPassword(false);
//     setShowConfirmPassword(false);
//     clearAuthError();
//   };

//   const isFormValid = () => {
//     if (!email.trim() || !password.trim()) return false;
//     if (isSignUp) {
//       return password === confirmPassword && password.length >= 6;
//     }
//     return true;
//   };

//   return (
//     <div className={styles.container}>
//       <div className={styles.header}>
//         <h2 className={styles.title}>
//           {isSignUp ? 'Create Account' : 'Welcome Back'}
//         </h2>
//         <p className={styles.subtitle}>
//           {isSignUp 
//             ? 'Join Q2 Chat to sync your conversations across devices'
//             : 'Sign in to access your chats and preferences'
//           }
//         </p>
//       </div>

//       {authError && (
//         <div className={styles.errorAlert}>
//           <IoAlert size={18} />
//           <span>{authError}</span>
//         </div>
//       )}

//       <form onSubmit={handleSubmit} className={styles.form}>
//         <div className={styles.inputGroup}>
//           <label htmlFor="email" className={styles.label}>Email</label>
//           <div className={styles.inputWrapper}>
//             <IoMail className={styles.inputIcon} />
//             <input
//               id="email"
//               type="email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               placeholder="Enter your email"
//               className={styles.input}
//               required
//               autoComplete="email"
//             />
//           </div>
//         </div>

//         <div className={styles.inputGroup}>
//           <label htmlFor="password" className={styles.label}>Password</label>
//           <div className={styles.inputWrapper}>
//             <IoLockClosed className={styles.inputIcon} />
//             <input
//               id="password"
//               type={showPassword ? 'text' : 'password'}
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               placeholder="Enter your password"
//               className={styles.input}
//               required
//               autoComplete={isSignUp ? 'new-password' : 'current-password'}
//               minLength={isSignUp ? 6 : undefined}
//             />
//             <button
//               type="button"
//               onClick={() => setShowPassword(!showPassword)}
//               className={styles.eyeButton}
//               tabIndex={-1}
//             >
//               {showPassword ? <IoEyeOff size={16} /> : <IoEye size={16} />}
//             </button>
//           </div>
//           {isSignUp && (
//             <div className={styles.passwordHint}>
//               Password must be at least 6 characters long
//             </div>
//           )}
//         </div>

//         {isSignUp && (
//           <div className={styles.inputGroup}>
//             <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
//             <div className={styles.inputWrapper}>
//               <IoLockClosed className={styles.inputIcon} />
//               <input
//                 id="confirmPassword"
//                 type={showConfirmPassword ? 'text' : 'password'}
//                 value={confirmPassword}
//                 onChange={(e) => setConfirmPassword(e.target.value)}
//                 placeholder="Confirm your password"
//                 className={`${styles.input} ${
//                   confirmPassword && password !== confirmPassword ? styles.inputError : ''
//                 }`}
//                 required
//                 autoComplete="new-password"
//               />
//               <button
//                 type="button"
//                 onClick={() => setShowConfirmPassword(!showConfirmPassword)}
//                 className={styles.eyeButton}
//                 tabIndex={-1}
//               >
//                 {showConfirmPassword ? <IoEyeOff size={16} /> : <IoEye size={16} />}
//               </button>
//             </div>
//             {confirmPassword && password !== confirmPassword && (
//               <div className={styles.errorHint}>
//                 Passwords do not match
//               </div>
//             )}
//           </div>
//         )}

//         <button
//           type="submit"
//           disabled={!isFormValid() || isLoading}
//           className={styles.submitButton}
//         >
//           {isLoading ? (
//             <div className={styles.spinner} />
//           ) : (
//             <>
//               {isSignUp ? <IoPersonAdd size={18} /> : <IoLogIn size={18} />}
//               <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
//             </>
//           )}
//         </button>
//       </form>

//       <div className={styles.footer}>
//         <p className={styles.switchText}>
//           {isSignUp ? 'Already have an account?' : "Don't have an account?"}
//         </p>
//         <button
//           type="button"
//           onClick={handleModeSwitch}
//           className={styles.switchButton}
//           disabled={isLoading}
//         >
//           {isSignUp ? 'Sign In' : 'Create Account'}
//         </button>
//       </div>

//       <div className={styles.guestNote}>
//         <p>
//           <strong>Guest Mode:</strong> You can continue using Q2 Chat without signing in, 
//           but your conversations won't be saved or synced across devices.
//         </p>
//       </div>
//     </div>
//   );
// };