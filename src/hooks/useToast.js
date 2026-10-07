import { useEffect, useRef, useState } from 'react';

const DEFAULT_DURATION = 2800;

const useToast = () => {
  const [toast, setToast] = useState({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });
  const timerRef = useRef(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const hideToast = () => {
    clearTimer();
    setToast(current =>
      current.visible
        ? {
            ...current,
            visible: false,
          }
        : current,
    );
  };

  const showToast = ({
    type = 'info',
    title = '',
    message = '',
    duration = DEFAULT_DURATION,
  }) => {
    clearTimer();

    setToast({
      visible: true,
      type,
      title,
      message,
    });

    timerRef.current = setTimeout(() => {
      setToast(current =>
        current.visible
          ? {
              ...current,
              visible: false,
            }
          : current,
      );
      timerRef.current = null;
    }, Math.max(1200, duration));
  };

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, []);

  return {
    toast,
    showToast,
    hideToast,
  };
};

export default useToast;
