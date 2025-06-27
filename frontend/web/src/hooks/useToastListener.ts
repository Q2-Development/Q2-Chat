import { useEffect } from 'react';
import toast from 'react-hot-toast';

export const useToastListener = () => {
  useEffect(() => {
    const handleUserToast = (event: CustomEvent) => {
      const { message, type } = event.detail;
      
      if (type === 'error') {
        toast.error(message);
      } else {
        toast.success(message);
      }
    };

    window.addEventListener('user-toast', handleUserToast as EventListener);
    
    return () => {
      window.removeEventListener('user-toast', handleUserToast as EventListener);
    };
  }, []);
};