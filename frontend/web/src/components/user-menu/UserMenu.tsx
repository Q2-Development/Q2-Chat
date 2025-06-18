// import { useState, useEffect } from 'react';
// import { IoClose, IoPerson, IoKey, IoSettings, IoLogOut, IoLogIn } from 'react-icons/io5';
// import { useUserStore } from '@/store/userStore';
// import { AuthSection } from './auth-section';
// import { ProfileSection } from './profile-section';
// import { ApiKeySection } from './api-key-section';
// import { PreferencesSection } from './preferences-section';
// import styles from './UserMenu.module.css';

// type ActiveSection = 'profile' | 'auth' | 'apikey' | 'preferences';

// export const UserMenu = () => {
//   const { 
//     isUserMenuOpen, 
//     setUserMenuOpen, 
//     isAuthenticated, 
//     user, 
//     userName,
//     avatarUrl,
//     logout,
//     isLoading 
//   } = useUserStore();
  
//   const [activeSection, setActiveSection] = useState<ActiveSection>('profile');

//   useEffect(() => {
//     if (isUserMenuOpen) {
//       setActiveSection(isAuthenticated ? 'profile' : 'auth');
//       document.body.style.overflow = 'hidden';
//     } else {
//       document.body.style.overflow = 'unset';
//     }

//     return () => {
//       document.body.style.overflow = 'unset';
//     };
//   }, [isUserMenuOpen, isAuthenticated]);

//   useEffect(() => {
//     const handleEscape = (e: KeyboardEvent) => {
//       if (e.key === 'Escape' && isUserMenuOpen) {
//         setUserMenuOpen(false);
//       }
//     };

//     document.addEventListener('keydown', handleEscape);
//     return () => document.removeEventListener('keydown', handleEscape);
//   }, [isUserMenuOpen, setUserMenuOpen]);

//   if (!isUserMenuOpen) return null;

//   const handleBackdropClick = (e: React.MouseEvent) => {
//     if (e.target === e.currentTarget) {
//       setUserMenuOpen(false);
//     }
//   };

//   const handleLogout = async () => {
//     await logout();
//     setUserMenuOpen(false);
//   };

//   const sectionItems = [
//     {
//       id: 'profile' as ActiveSection,
//       label: isAuthenticated ? 'Profile' : 'Account',
//       icon: <IoPerson size={20} />,
//       available: true,
//     },
//     {
//       id: 'apikey' as ActiveSection,
//       label: 'API Keys',
//       icon: <IoKey size={20} />,
//       available: true,
//     },
//     {
//       id: 'preferences' as ActiveSection,
//       label: 'Preferences',
//       icon: <IoSettings size={20} />,
//       available: true,
//     },
//   ];

//   if (!isAuthenticated) {
//     sectionItems[0] = {
//       id: 'auth' as ActiveSection,
//       label: 'Sign In',
//       icon: <IoLogIn size={20} />,
//       available: true,
//     };
//   }

//   const renderActiveSection = () => {
//     switch (activeSection) {
//       case 'auth':
//         return <AuthSection />;
//       case 'profile':
//         return <ProfileSection />;
//       case 'apikey':
//         return <ApiKeySection />;
//       case 'preferences':
//         return <PreferencesSection />;
//       default:
//         return <ProfileSection />;
//     }
//   };

//   const getDisplayName = () => {
//     if (isAuthenticated) {
//       return userName || user?.email?.split('@')[0] || '';
//     }
//     return 'Guest User';
//   };

//   return (
//     <div className={styles.overlay} onClick={handleBackdropClick}>
//       <div className={styles.modal}>
//         <div className={styles.header}>
//           <div className={styles.userInfo}>
//             <div className={styles.userAvatar}>
//               {avatarUrl ? (
//                 <img src={avatarUrl} alt="Avatar" className={styles.avatarImage} />
//               ) : (
//                 <IoPerson size={24} />
//               )}
//             </div>
//             <div className={styles.userDetails}>
//               <h2 className={styles.userName}>{getDisplayName()}</h2>
//               <span className={styles.userStatus}>
//                 {isAuthenticated ? (
//                   <>
//                     <span className={styles.statusDot}></span>
//                     {user?.email}
//                   </>
//                 ) : (
//                   <>
//                     <span className={styles.statusDotGuest}></span>
//                     Guest Mode
//                   </>
//                 )}
//               </span>
//             </div>
//           </div>
          
//           <div className={styles.headerActions}>
//             {isAuthenticated && (
//               <button
//                 onClick={handleLogout}
//                 className={styles.logoutButton}
//                 disabled={isLoading}
//                 title="Sign out"
//               >
//                 <IoLogOut size={20} />
//               </button>
//             )}
//             <button
//               onClick={() => setUserMenuOpen(false)}
//               className={styles.closeButton}
//               title="Close"
//             >
//               <IoClose size={24} />
//             </button>
//           </div>
//         </div>

//         <div className={styles.content}>
//           <nav className={styles.sidebar}>
//             <ul className={styles.sectionList}>
//               {sectionItems.map((item) => (
//                 <li key={item.id}>
//                   <button
//                     onClick={() => setActiveSection(item.id)}
//                     className={`${styles.sectionButton} ${
//                       activeSection === item.id ? styles.sectionButtonActive : ''
//                     }`}
//                     disabled={!item.available}
//                   >
//                     <span className={styles.sectionIcon}>{item.icon}</span>
//                     <span className={styles.sectionLabel}>{item.label}</span>
//                   </button>
//                 </li>
//               ))}
//             </ul>
//           </nav>

//           <main className={styles.mainContent}>
//             <div className={styles.sectionContainer}>
//               {renderActiveSection()}
//             </div>
//           </main>
//         </div>
//       </div>
//     </div>
//   );
// };