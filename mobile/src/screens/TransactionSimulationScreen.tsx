import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { apiService, ClassificationRequest } from '../services/api';

const MERCHANT_CATEGORIES = [
  { label: 'Online Retail', value: 'online_retail' },
  { label: 'Físico', value: 'physical_store' },
  { label: 'ATM', value: 'atm' },
  { label: 'Gasolina', value: 'gas_station' },
  { label: 'Supermercado', value: 'grocery' },
  { label: 'Restaurante', value: 'restaurant' },
];

const LOCATIONS = [
  { city: 'São Paulo', state: 'SP', country: 'BR' },
  { city: 'Rio de Janeiro', state: 'RJ', country: 'BR' },
  { city: 'Belo Horizonte', state: 'MG', country: 'BR' },
  { city: 'Brasília', state: 'DF', country: 'BR' },
  { city: 'Curitiba', state: 'PR', country: 'BR' },
];

export default function TransactionSimulationScreen() {
  const navigation = useNavigation();
  const [amount, setAmount] = useState('');
  const [merchantCategory, setMerchantCategory] = useState('online_retail');
  const [hour, setHour] = useState(new Date().getHours().toString());
  const [dayOfWeek, setDayOfWeek] = useState(new Date().getDay().toString());
  const [locationIndex, setLocationIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const amountValue = parseFloat(amount);
    if (!amount || isNaN(amountValue) || amountValue <= 0) {
      newErrors.amount = 'Valor deve ser maior que zero';
    }
    if (amountValue > 100000) {
      newErrors.amount = 'Valor muito alto (máximo: R$ 100.000)';
    }

    const hourValue = parseInt(hour);
    if (isNaN(hourValue) || hourValue < 0 || hourValue > 23) {
      newErrors.hour = 'Hora deve estar entre 0 e 23';
    }

    const dayValue = parseInt(dayOfWeek);
    if (isNaN(dayValue) || dayValue < 0 || dayValue > 6) {
      newErrors.dayOfWeek = 'Dia da semana inválido (0-6)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Alert.alert('Erro', 'Por favor, corrija os erros no formulário');
      return;
    }

    setIsLoading(true);

    try {
      const location = LOCATIONS[locationIndex];
      const requestData: ClassificationRequest = {
        amount: parseFloat(amount),
        hour: parseInt(hour),
        day_of_week: parseInt(dayOfWeek),
        merchant_category: merchantCategory,
        location: {
          country: location.country,
          state: location.state,
          city: location.city,
        },
        device_info: {
          device_type: 'mobile',
        },
        user_id: 'user_123',
        previous_transactions_count: 15,
      };

      const result = await apiService.classifyTransaction(requestData);

      // Navegar para tela de resultado
      navigation.navigate('TransactionResult', {
        result,
        originalData: {
          amount: parseFloat(amount),
          merchantCategory,
          location: location.city + ', ' + location.state,
        },
      });
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao classificar transação');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setAmount('');
    setMerchantCategory('online_retail');
    setHour(new Date().getHours().toString());
    setDayOfWeek(new Date().getDay().toString());
    setLocationIndex(0);
    setErrors({});
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          <Text style={styles.label}>Valor da Transação (R$)</Text>
          <TextInput
            style={[styles.input, errors.amount && styles.inputError]}
            value={amount}
            onChangeText={(text) => {
              setAmount(text);
              if (errors.amount) {
                setErrors({ ...errors, amount: '' });
              }
            }}
            placeholder="Ex: 1500.50"
            keyboardType="numeric"
          />
          {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}

          <Text style={styles.label}>Categoria do Comerciante</Text>
          <View style={styles.pickerContainer}>
            {MERCHANT_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryButton,
                  merchantCategory === cat.value && styles.categoryButtonSelected,
                ]}
                onPress={() => setMerchantCategory(cat.value)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    merchantCategory === cat.value && styles.categoryButtonTextSelected,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Hora do Dia (0-23)</Text>
          <TextInput
            style={[styles.input, errors.hour && styles.inputError]}
            value={hour}
            onChangeText={(text) => {
              setHour(text);
              if (errors.hour) {
                setErrors({ ...errors, hour: '' });
              }
            }}
            placeholder="Ex: 14"
            keyboardType="numeric"
          />
          {errors.hour && <Text style={styles.errorText}>{errors.hour}</Text>}

          <Text style={styles.label}>Dia da Semana (0=Segunda, 6=Domingo)</Text>
          <TextInput
            style={[styles.input, errors.dayOfWeek && styles.inputError]}
            value={dayOfWeek}
            onChangeText={(text) => {
              setDayOfWeek(text);
              if (errors.dayOfWeek) {
                setErrors({ ...errors, dayOfWeek: '' });
              }
            }}
            placeholder="Ex: 1"
            keyboardType="numeric"
          />
          {errors.dayOfWeek && <Text style={styles.errorText}>{errors.dayOfWeek}</Text>}

          <Text style={styles.label}>Localização</Text>
          <View style={styles.pickerContainer}>
            {LOCATIONS.map((loc, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.categoryButton,
                  locationIndex === index && styles.categoryButtonSelected,
                ]}
                onPress={() => setLocationIndex(index)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    locationIndex === index && styles.categoryButtonTextSelected,
                  ]}
                >
                  {loc.city}, {loc.state}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Classificar Transação</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <Text style={styles.clearButtonText}>Limpar Campos</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#f44336',
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  categoryButton: {
    padding: 10,
    margin: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
  },
  categoryButtonSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#333',
  },
  categoryButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  clearButtonText: {
    color: '#666',
    fontSize: 16,
  },
});

