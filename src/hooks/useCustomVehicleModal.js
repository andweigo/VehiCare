import { useState } from 'react';

const useCustomVehicleModal = ({ brand, model, year, onSave }) => {
  const [visible, setVisible] = useState(false);
  const [customBrand, setCustomBrand] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [customYear, setCustomYear] = useState('');
  const [error, setError] = useState('');

  const openCustomVehicleModal = (prefill = {}) => {
    const nextBrand = typeof prefill?.brand === 'string' ? prefill.brand : brand;
    const nextModel = typeof prefill?.model === 'string' ? prefill.model : model;
    const nextYear = typeof prefill?.year === 'string' ? prefill.year : year;
    setCustomBrand(nextBrand || '');
    setCustomModel(nextModel || '');
    setCustomYear(nextYear || '');
    setError('');
    setVisible(true);
  };

  const closeCustomVehicleModal = () => {
    setVisible(false);
    setError('');
  };

  const handleSaveCustomVehicleProfile = async () => {
    const cleanBrand = customBrand.trim();
    const cleanModel = customModel.trim();
    const cleanYear = customYear.trim();

    if (!cleanBrand || !cleanModel || !cleanYear) {
      setError('Please enter brand, model, and year.');
      return;
    }

    const numericYear = Number(cleanYear);
    const maxYear = new Date().getFullYear() + 1;
    if (!/^\d{4}$/.test(cleanYear) || numericYear < 1900 || numericYear > maxYear) {
      setError(`Please enter a valid 4-digit year between 1900 and ${maxYear}.`);
      return;
    }

    try {
      const result = await onSave(cleanBrand, cleanModel, cleanYear);

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
