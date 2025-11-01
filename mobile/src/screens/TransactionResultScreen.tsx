import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ClassificationResponse } from '../services/api';

interface RouteParams {
  result: ClassificationResponse;
  originalData: {
    amount: number;
    merchantCategory: string;
    location: string;
  };
}

export default function TransactionResultScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { result, originalData } = route.params as RouteParams;

  const isFraud = result.classification === 1;
  const fraudScore = result.fraud_score * 100;

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return '#f44336';
      case 'high':
        return '#ff9800';
      case 'medium':
        return '#ffc107';
      default:
        return '#4caf50';
    }
  };

  const getConfidenceText = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Média';
      default:
        return 'Baixa';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Badge de Classificação */}
        <View style={styles.badgeContainer}>
          <View
            style={[
              styles.badge,
              isFraud ? styles.badgeFraud : styles.badgeLegitimate,
            ]}
          >
            <Text style={styles.badgeText}>
              {isFraud ? 'FRAUDE' : 'NÃO FRAUDE'}
            </Text>
            <Text style={styles.badgeScore}>{fraudScore.toFixed(1)}%</Text>
          </View>
        </View>

        {/* Score de Fraude */}
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Score de Fraude</Text>
          <View style={styles.scoreBarContainer}>
            <View
              style={[
                styles.scoreBar,
                {
                  width: `${fraudScore}%`,
                  backgroundColor: getRiskColor(result.details.risk_level),
                },
              ]}
            />
          </View>
          <Text style={styles.scoreValue}>{fraudScore.toFixed(1)}%</Text>
        </View>

        {/* Informações de Risco */}
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Nível de Risco</Text>
          <Text
            style={[
              styles.infoValue,
              { color: getRiskColor(result.details.risk_level) },
            ]}
          >
            {result.details.risk_level.toUpperCase()}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Confiança</Text>
          <Text style={styles.infoValue}>{getConfidenceText(result.confidence)}</Text>
        </View>

        {/* Detalhes da Transação */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Detalhes da Transação</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Valor:</Text>
            <Text style={styles.detailValue}>R$ {originalData.amount.toFixed(2)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Categoria:</Text>
            <Text style={styles.detailValue}>{originalData.merchantCategory}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Localização:</Text>
            <Text style={styles.detailValue}>{originalData.location}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>ID da Transação:</Text>
            <Text style={styles.detailValue}>{result.transaction_id}</Text>
          </View>
        </View>

        {/* Probabilidades */}
        <View style={styles.probabilityCard}>
          <Text style={styles.probabilityTitle}>Probabilidades</Text>
          <View style={styles.probabilityRow}>
            <Text style={styles.probabilityLabel}>Legítima:</Text>
            <Text style={styles.probabilityValue}>
              {(result.details.legitimate_probability * 100).toFixed(2)}%
            </Text>
          </View>
          <View style={styles.probabilityRow}>
            <Text style={styles.probabilityLabel}>Fraude:</Text>
            <Text style={[styles.probabilityValue, { color: '#f44336' }]}>
              {(result.details.fraud_probability * 100).toFixed(2)}%
            </Text>
          </View>
        </View>

        {/* Botão Nova Transação */}
        <TouchableOpacity
          style={styles.newTransactionButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.newTransactionButtonText}>Nova Transação</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  badgeContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  badge: {
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    minWidth: 200,
  },
  badgeFraud: {
    backgroundColor: '#f44336',
  },
  badgeLegitimate: {
    backgroundColor: '#4caf50',
  },
  badgeText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  badgeScore: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  scoreContainer: {
    marginBottom: 20,
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  scoreBarContainer: {
    height: 30,
    backgroundColor: '#e0e0e0',
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 5,
  },
  scoreBar: {
    height: '100%',
    borderRadius: 15,
  },
  scoreValue: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  probabilityCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  probabilityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  probabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  probabilityLabel: {
    fontSize: 14,
    color: '#666',
  },
  probabilityValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  newTransactionButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  newTransactionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

