import { useState } from 'react';

const useCustomVehicleModal = ({ brand, model, year, onSave }) => {
  const [visible, setVisible] = useState(false);
  const [customBrand, setCustomBrand] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [customYear, setCustomYear] = useState('');
  const [error, setError] = useState('');

  const openCustomVehicleModal = () => {
    setCustomBrand(brand);
    setCustomModel(model);
    setCustomYear(year);
    setError('');
    setVisible(true);
  };

  const closeCustomVehicleModal = () => {
    setVisible(false);
    setError('');
  };

  const handleSaveCustomVehicleProfile = async () => {
    if (!customBrand.trim() || !customModel.trim() || !customYear.trim()) {
      setError('Please enter brand, model, and year.');
      return;
    }

    try {
      const result = await onSave(customBrand, customModel, customYear);

      if (result === false) {
        return;
      }

      setVisible(false);
    } catch (saveError) {
      setError(
        saveError?.message ||
          String(saveError) ||
          'Unable to save vehicle. Please try again.',
      );
    }
  };

  return {
    visible,
    customBrand,
    customModel,
    customYear,
    error,
    setCustomBrand,
    setCustomModel,
    setCustomYear,
    openCustomVehicleModal,
    closeCustomVehicleModal,
    handleSaveCustomVehicleProfile,
  };
};

export default useCustomVehicleModal;
