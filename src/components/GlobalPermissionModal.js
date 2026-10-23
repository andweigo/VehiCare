import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter, Linking } from 'react-native';
import ConfirmActionModal from './ConfirmActionModal';
import {
  HIDE_PERMISSION_MODAL_EVENT,
  SHOW_PERMISSION_MODAL_EVENT,
} from '../services/permissionService';

const GlobalPermissionModal = () => {
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    badgeLabel: 'PERMISSION NEEDED',
    icon: 'security',
    title: '',
    message: '',
    primaryLabel: 'Open Settings',
    secondaryLabel: 'Cancel',
    onConfirm: null,
    onCancel: null,
  });

  useEffect(() => {
    const showSub = DeviceEventEmitter.addListener(
      SHOW_PERMISSION_MODAL_EVENT,
      payload => {
        if (!payload) return;
        setModalConfig({
          visible: true,
          badgeLabel: payload.badgeLabel || 'PERMISSION NEEDED',
          icon: payload.icon || 'security',
          title: payload.title || 'Permission Required',
          message: payload.message || '',
          primaryLabel: payload.primaryLabel || 'Open Settings',
          secondaryLabel: payload.secondaryLabel || 'Cancel',
          onConfirm: payload.onConfirm || (() => Linking.openSettings()),
          onCancel: payload.onCancel || null,
        });
      },
    );

    const hideSub = DeviceEventEmitter.addListener(
      HIDE_PERMISSION_MODAL_EVENT,
      () => {
        setModalConfig(prev => ({ ...prev, visible: false }));
      },
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleConfirm = () => {
    const confirmAction = modalConfig.onConfirm;
    setModalConfig(prev => ({ ...prev, visible: false }));
    if (typeof confirmAction === 'function') {
      confirmAction();
    } else {
      Linking.openSettings();
    }
  };

  const handleCancel = () => {
    const cancelAction = modalConfig.onCancel;
    setModalConfig(prev => ({ ...prev, visible: false }));
    if (typeof cancelAction === 'function') {
      cancelAction();
    }
  };

  return (
    <ConfirmActionModal
      visible={modalConfig.visible}
      badgeLabel={modalConfig.badgeLabel}
      icon={modalConfig.icon}
      title={modalConfig.title}
      message={modalConfig.message}
      primaryLabel={modalConfig.primaryLabel}
      secondaryLabel={modalConfig.secondaryLabel}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      destructive={false}
    />
  );
};

export default GlobalPermissionModal;
