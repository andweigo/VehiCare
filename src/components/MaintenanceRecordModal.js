import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import vehicleApi from '../api/vehicleApi';
import { useTheme } from '../theme/ThemeContext';

const toDateInput = value => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const isValidDateInput = value => {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const MaintenanceRecordModal = ({
  visible,
  vehicleId,
  record = null,
  initialStatus = 'pending',
  onClose,
  onSaved,
}) => {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle(record?.title || '');
    setDescription(record?.description || record?.notes || '');
    setDueDate(toDateInput(record?.due_date));
    setStatus(record?.status || initialStatus);
    setError('');
  }, [visible, record, initialStatus]);

  const save = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Enter a task or service name.');
      return;
    }
    if (!isValidDateInput(dueDate)) {
      setError('Enter a valid date using YYYY-MM-DD, or leave it blank.');
      return;
    }
    if (!vehicleId) {
      setError('Select a vehicle before saving maintenance.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        ...(record ? {} : { vehicle_id: Number(vehicleId) }),
        title: cleanTitle,
        description: description.trim() || null,
        service_type: record?.service_type || 'General Inspection',
        status,
        due_date: dueDate ? `${dueDate}T00:00:00.000Z` : null,
        performed_at: status === 'completed'
          ? (record?.performed_at || new Date().toISOString())
          : null,
      };
      const result = record?.id
        ? await vehicleApi.updateMaintenanceRecord(record.id, payload)
        : await vehicleApi.createMaintenanceRecord(payload);
      onSaved?.(result?.data || result);
      onClose?.();
    } catch (saveError) {
      setError(saveError?.response?.data?.message || 'Could not save this maintenance record. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={[styles.sheet, { backgroundColor: theme.surface || '#161616', borderColor: theme.border }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.eyebrow, { color: theme.accent }]}>MAINTENANCE</Text>
              <Text style={[styles.heading, { color: theme.text }]}>
                {record ? 'Edit maintenance' : status === 'pending' ? 'Schedule maintenance' : 'Log completed service'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityLabel="Close maintenance form">
              <Icon name="close" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Text style={[styles.label, { color: theme.text }]}>Task or service</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Oil change"
              placeholderTextColor={theme.placeholder || '#888'}
              style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
              maxLength={255}
              accessibilityLabel="Maintenance task or service name"
            />

            <Text style={[styles.label, { color: theme.text }]}>Status</Text>
            <View style={styles.statusRow}>
              {[
                { value: 'pending', label: 'Scheduled' },
                { value: 'completed', label: 'Completed' },
              ].map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.statusOption, { borderColor: status === option.value ? theme.accent : theme.border, backgroundColor: status === option.value ? theme.accentSoft : theme.background }]}
                  onPress={() => setStatus(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: status === option.value }}
                >
                  <Text style={{ color: status === option.value ? theme.accent : theme.textSecondary, fontWeight: '600' }}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: theme.text }]}>Due date (optional)</Text>
            <TextInput
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.placeholder || '#888'}
              style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              accessibilityLabel="Maintenance due date"
            />

            <Text style={[styles.label, { color: theme.text }]}>Notes (optional)</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Add service details or a reminder note"
              placeholderTextColor={theme.placeholder || '#888'}
              style={[styles.input, styles.notesInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
              multiline
              maxLength={2000}
              accessibilityLabel="Maintenance notes"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.accent }]} onPress={save} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>{record ? 'Save changes' : status === 'pending' ? 'Schedule task' : 'Save service record'}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.64)' },
  sheet: { maxHeight: '92%', borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, overflow: 'hidden' },
  header: { minHeight: 70, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  eyebrow: { fontSize: 10, letterSpacing: 1, fontWeight: '700' },
  heading: { fontSize: 19, fontWeight: '700', marginTop: 3 },
  content: { padding: 20, paddingBottom: 30 },
  label: { marginBottom: 7, marginTop: 12, fontSize: 13, fontWeight: '600' },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 14 },
  notesInput: { minHeight: 84, paddingTop: 12, textAlignVertical: 'top' },
  statusRow: { flexDirection: 'row', gap: 10 },
  statusOption: { minHeight: 42, borderWidth: 1, borderRadius: 11, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#EF4444', fontSize: 13, marginTop: 12 },
  saveButton: { minHeight: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  saveText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});

export default MaintenanceRecordModal;
