import { useState } from 'react';

const useNeedHelpSignInModal = () => {
  const [visible, setVisible] = useState(false);

  const openNeedHelpSignInModal = () => setVisible(true);
  const closeNeedHelpSignInModal = () => setVisible(false);

  return {
    visible,
    openNeedHelpSignInModal,
    closeNeedHelpSignInModal,
  };
};

export default useNeedHelpSignInModal;
