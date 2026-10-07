import { useState } from 'react';

const useConfirmSignOutModal = () => {
  const [visible, setVisible] = useState(false);

  const openConfirmSignOutModal = () => setVisible(true);
  const closeConfirmSignOutModal = () => setVisible(false);

  return {
    visible,
    openConfirmSignOutModal,
    closeConfirmSignOutModal,
  };
};

export default useConfirmSignOutModal;
