import { useCallback, useState } from 'react';

const defaultState = {
  visible: false,
  title: '',
  message: '',
  type: 'info',
  icon: null,
  iconColor: null,
  primaryLabel: 'OK',
  secondaryLabel: null,
  onConfirm: null,
  onCancel: null,
  destructive: false,
};

export const useCustomModal = () => {
  const [modalState, setModalState] = useState(defaultState);

  const hideModal = useCallback(() => {
    setModalState(prev => ({ ...prev, visible: false }));
  }, []);

  const showModal = useCallback(
    ({
      title = '',
      message = '',
      type = 'info',
      icon = null,
      iconColor = null,
      primaryLabel = 'OK',
      secondaryLabel = null,
      onConfirm = null,
      onCancel = null,
      destructive = false,
    }) => {
      setModalState({
        visible: true,
        title,
        message,
        type,
        icon,
        iconColor,
        primaryLabel,
        secondaryLabel,
        onConfirm: () => {
          hideModal();
          if (typeof onConfirm === 'function') {
            onConfirm();
          }
        },
        onCancel: () => {
          hideModal();
          if (typeof onCancel === 'function') {
            onCancel();
          }
        },
        destructive,
      });
    },
    [hideModal],
  );

  return {
    modalState,
    showModal,
    hideModal,
  };
};

export default useCustomModal;
