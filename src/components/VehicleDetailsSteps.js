import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../theme/ThemeContext';

import VehicleValidationBadge from './VehicleValidationBadge';

const VehicleDetailsSteps = ({ vehicleDetails, handlers }) => {
  const { theme } = useTheme();
  const {
    step,
    vehicleTypes,
    loadingVehicleTypes,
    vehicleTypesError,
    vehicleTypeId,
    brandId,
    brandSearch,
    modelSearch,
    modelId,
    yearSearch,
    yearId,
    modelNumber,
    filteredBrands,
    filteredModels,
    filteredYears,
    loadingBrands,
    loadingModels,
    loadingYears,
    brandsError,
    modelsError,
    yearsError,
    activeDropdown,
    isCustomVehicle,
    saveError,
    validationResult,
    loadingValidation,
  } = vehicleDetails;

  const {
    handleVehicleTypeSelect,
    handleBrandChange,
    handleBrandSelect,
    handleModelChange,
    handleModelSelect,
    handleYearChange,
    handleYearSelect,
    openDropdown,
    toggleDropdown,
    setModelNumber,
    openCustomVehicleModal,
  } = handlers;

  return (
    <>
      <View style={styles.header}>
        <Text style={[styles.step, { color: theme.accent }]}>STEP {step} OF 2</Text>

        <Text style={[styles.title, { color: theme.text }]}>
          {step === 1
            ? 'What type of vehicle do you have?'
            : 'Tell us about your vehicle'}
        </Text>

        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {step === 1
            ? 'Select your vehicle type to personalize your VehiCare experience.'
            : 'Enter your vehicle details so VehiCare can provide more accurate assistance.'}
        </Text>
      </View>

      {step === 1 && (
        <View style={styles.options}>
          {loadingVehicleTypes ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.accent} />

              <Text style={[styles.loadingText, { color: theme.textSecondary }]}> 
                Loading vehicle types...
              </Text>
            </View>
          ) : vehicleTypesError ? (
            <View style={[styles.errorContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.errorText, { color: theme.statusBadgeText }]}>{vehicleTypesError}</Text>
            </View>
          ) : vehicleTypes.length === 0 ? (
            <View style={[styles.errorContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.errorText, { color: theme.textSecondary }]}>No vehicle types available.</Text>
            </View>
          ) : (
            vehicleTypes.map(item => {
              const name = item.name?.toLowerCase();

              let description =
                'Sedan, SUV, Hatchback, Coupe, MPV';

              if (name === 'motorcycle') {
                description =
                  'Scooter, Standard, Sport Bike, Cruiser, Underbone';
              }

              if (name === 'bicycle') {
                description =
                  'Mountain Bike, Road Bike, BMX, Hybrid, Folding Bike';
              }

              return (
                <VehicleTypeCard
                  key={item.id}
                  title={item.name}
                  description={description}
                  iconName={name}
                  selected={vehicleTypeId === item.id}
                  onPress={() => handleVehicleTypeSelect(item)}
                />
              );
            })
          )}
        </View>
      )}

      {step === 2 && (
        <View style={styles.form}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Vehicle Brand</Text>

          <View style={styles.dropdownContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceAlt, color: theme.text, borderColor: theme.border }]}
                placeholder={
                  loadingBrands
                    ? 'Loading brands...'
                    : 'Search or select brand'
                }
                placeholderTextColor={theme.placeholder}
                value={brandSearch}
                editable={!loadingBrands}
                onFocus={() => openDropdown('brand')}
                onChangeText={handleBrandChange}
              />

              <TouchableOpacity
                style={styles.dropdownArrow}
                onPress={() => toggleDropdown('brand')}
                disabled={loadingBrands}>
                {loadingBrands ? (
                  <ActivityIndicator size="small" color="#888888" />
                ) : (
                  <MaterialCommunityIcons
                    name={
                      activeDropdown === 'brand'
                        ? 'chevron-up'
                        : 'chevron-down'
                    }
                    size={24}
                    color={theme.accent}
                  />
                )}
              </TouchableOpacity>
            </View>

            {activeDropdown === 'brand' && (
              <View style={styles.dropdown}>
                {loadingBrands ? (
                  <DropdownLoading text="Loading brands..." />
                ) : brandsError ? (
                  <Text style={[styles.noResults, { color: theme.textSecondary }]}>{brandsError}</Text>
                ) : filteredBrands.length > 0 ? (
                  filteredBrands.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.dropdownItem, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}
                      onPress={() => handleBrandSelect(item)}>
                      <Text style={[styles.dropdownText, { color: theme.text }]}>{item.name}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={[styles.noResults, { color: theme.textSecondary }]}>
                    No matching brand
                  </Text>
                )}
              </View>
            )}
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>Vehicle Model</Text>

          <View style={styles.dropdownContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[
                  styles.input,
                  !brandId && !isCustomVehicle && styles.inputDisabled,
                  { backgroundColor: theme.surfaceAlt, color: theme.text },
                ]}
                placeholder={
                  !brandId && !isCustomVehicle
                    ? 'Select a brand first'
                    : loadingModels
                    ? 'Loading models...'
                    : 'Search, select, or enter model'
                }
                placeholderTextColor={theme.placeholder}
                value={modelSearch}
                editable={
                  (Boolean(brandId) || isCustomVehicle) &&
                  !loadingModels
                }
                onChangeText={handleModelChange}
              />

              {brandId && (
                <TouchableOpacity
                  style={styles.dropdownArrow}
                  onPress={() => toggleDropdown('model')}
                  disabled={loadingModels}>
                  {loadingModels ? (
                    <ActivityIndicator size="small" color="#888888" />
                  ) : (
                    <MaterialCommunityIcons
                      name={
                        activeDropdown === 'model'
                          ? 'chevron-up'
                          : 'chevron-down'
                      }
                      size={24}
                      color={theme.accent}
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>

            {activeDropdown === 'model' && brandId && (
              <View style={styles.dropdown}>
                {loadingModels ? (
                  <DropdownLoading text="Loading models..." />
                ) : modelsError ? (
                  <Text style={[styles.noResults, { color: theme.textSecondary }]}>{modelsError}</Text>
                ) : filteredModels.length > 0 ? (
                  filteredModels.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.dropdownItem, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}
                      onPress={() => handleModelSelect(item)}>
                      <Text style={[styles.dropdownText, { color: theme.text }]}>{item.name}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={[styles.noResults, { color: theme.textSecondary }]}>
                    No matching model
                  </Text>
                )}
              </View>
            )}
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>Vehicle Year</Text>

          <View style={styles.dropdownContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[
                  styles.input,
                  !modelId && !isCustomVehicle && styles.inputDisabled,
                  { backgroundColor: theme.surfaceAlt, color: theme.text },
                ]}
                placeholder={
                  !modelId && !isCustomVehicle
                    ? 'Select a model first'
                    : loadingYears
                    ? 'Loading years...'
                    : 'Enter or select year'
                }
                placeholderTextColor={theme.placeholder}
                keyboardType="numeric"
                value={yearSearch}
                editable={
                  (Boolean(modelId) || isCustomVehicle) &&
                  !loadingYears
                }
                onChangeText={handleYearChange}
                maxLength={4}
              />

              {modelId && (
                <TouchableOpacity
                  style={styles.dropdownArrow}
                  onPress={() => toggleDropdown('year')}
                  disabled={loadingYears}>
                  {loadingYears ? (
                    <ActivityIndicator size="small" color="#888888" />
                  ) : (
                    <MaterialCommunityIcons
                      name={
                        activeDropdown === 'year'
                          ? 'chevron-up'
                          : 'chevron-down'
                      }
                      size={24}
                      color={theme.accent}
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>

            {activeDropdown === 'year' && modelId && (
              <View style={styles.dropdown}>
                {loadingYears ? (
                  <DropdownLoading text="Loading years..." />
                ) : yearsError ? (
                  <Text style={[styles.noResults, { color: theme.textSecondary }]}>{yearsError}</Text>
                ) : filteredYears.length > 0 ? (
                  filteredYears.slice(0, 10).map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.dropdownItem, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}
                      onPress={() => handleYearSelect(item)}>
                      <Text style={[styles.dropdownText, { color: theme.text }]}>{item.year}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={[styles.noResults, { color: theme.textSecondary }]}>
                    No matching year
                  </Text>
                )}
              </View>
            )}
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Vehicle Model Number
            <Text style={[styles.optional, { color: theme.placeholder }]}>{'  '}(Optional)</Text>
          </Text>

          <TextInput
            style={[styles.input, { backgroundColor: theme.surfaceAlt, color: theme.text, borderColor: theme.border }]}
            placeholder="Enter model number"
            placeholderTextColor={theme.placeholder}
            value={modelNumber}
            onChangeText={setModelNumber}
            autoCapitalize="characters"
          />

          <VehicleValidationBadge
            validationResult={validationResult}
            loadingValidation={loadingValidation}
          />

          <Pressable
            style={[styles.otherButton, { backgroundColor: theme.surface, borderColor: theme.accent }]}
            onPress={openCustomVehicleModal}
            android_ripple={{ color: theme.border }}>
            <Text style={[styles.otherButtonText, { color: theme.text }]}> 
              My vehicle is not listed
            </Text>
          </Pressable>

          {isCustomVehicle && (
            <Text style={[styles.helperText, { color: theme.textSecondary }]}>
              You can now type your brand, model, and year directly above.
            </Text>
          )}

          <Text style={[styles.helperText, { color: theme.textSecondary }]}>
            You can usually find this on your vehicle documents or identification plate.
          </Text>

          {saveError && (!validationResult || (validationResult.is_valid && validationResult.year_valid !== false)) ? (
            <View style={[styles.saveErrorContainer, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
              <Text style={[styles.saveErrorText, { color: theme.accent }]}>{saveError}</Text>
            </View>
          ) : null}
        </View>
      )}
    </>
  );
};

const VehicleTypeCard = ({ title, description, iconName, selected, onPress }) => {
  const getIconName = name => {
    switch (name) {
      case 'car':
        return 'car';
      case 'motorcycle':
        return 'motorbike';
      case 'bicycle':
        return 'bike';
      default:
        return 'car';
    }
  };

  const { theme } = useTheme();
  const iconColor = selected ? '#FFFFFF' : theme.text;

  return (
    <TouchableOpacity
      style={[
        styles.vehicleCard,
        { backgroundColor: theme.surface, borderColor: theme.border },
        selected && { borderColor: theme.accent, backgroundColor: theme.accentSoft },
      ]}
      onPress={onPress}
      activeOpacity={0.8}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: theme.surfaceAlt },
          selected && { backgroundColor: theme.accent },
        ]}>
        <MaterialCommunityIcons
          name={getIconName(iconName)}
          size={36}
          color={iconColor}
        />
      </View>

      <View style={styles.vehicleText}>
        <Text style={[styles.vehicleName, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.vehicleDescription, { color: theme.textSecondary }]}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
};

const DropdownLoading = ({ text }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.dropdownLoading}>
      <ActivityIndicator size="small" color={theme.accent} />
      <Text style={[styles.dropdownLoadingText, { color: theme.textSecondary }]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: 40,
  },
  step: {
    fontFamily: 'Inter-SemiBold',
    color: '#F63B05',
    fontSize: 12,
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Outfit-ExtraBold',
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 39,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    color: '#A1A1A1',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
  },
  options: {
    marginTop: 32,
    gap: 14,
  },
  vehicleCard: {
    minHeight: 108,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#292929',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleCardSelected: {
    borderColor: '#F63B05',
    backgroundColor: '#1A100D',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#202020',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  iconContainerSelected: {
    backgroundColor: '#F63B05',
  },
  vehicleText: {
    flex: 1,
  },
  vehicleName: {
    fontFamily: 'Outfit-SemiBold',
    color: '#FFFFFF',
    fontSize: 18,
  },
  vehicleDescription: {
    fontFamily: 'Inter-Regular',
    color: '#777777',
    fontSize: 12,
    marginTop: 4,
  },
  form: {
    marginTop: 28,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 8,
    marginTop: 18,
  },
  optional: {
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 10,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    height: 54,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#292929',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingRight: 48,
    color: '#FFFFFF',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  dropdownArrow: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 48,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdown: {
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#292929',
    borderRadius: 14,
    marginTop: 6,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
  },
  dropdownText: {
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    fontSize: 14,
  },
  noResults: {
    fontFamily: 'Inter-Regular',
    color: '#666666',
    padding: 16,
    fontSize: 14,
  },
  dropdownLoading: {
    minHeight: 55,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  dropdownLoadingText: {
    fontFamily: 'Inter-Regular',
    color: '#888888',
    fontSize: 13,
  },
  loadingContainer: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    color: '#777777',
    fontSize: 13,
    marginTop: 12,
  },
  errorContainer: {
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#292929',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    color: '#888888',
    fontSize: 13,
    textAlign: 'center',
  },
  helperText: {
    fontFamily: 'Inter-Regular',
    color: '#666666',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 8,
  },
  otherButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F63B05',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherButtonText: {
    fontFamily: 'Inter-Medium',
    color: '#F63B05',
    fontSize: 15,
  },

  saveErrorContainer: {
    backgroundColor: '#25110D',
    borderWidth: 1,
    borderColor: '#5A2114',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },

  saveErrorText: {
    fontFamily: 'Inter-Regular',
    color: '#F63B05',
    fontSize: 13,
    textAlign: 'center',
  },
});

export default VehicleDetailsSteps;
