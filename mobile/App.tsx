import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { TransactionProvider } from './src/context/TransactionContext';
import TransactionSimulationScreen from './src/screens/TransactionSimulationScreen';
import TransactionResultScreen from './src/screens/TransactionResultScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <TransactionProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator
          initialRouteName="TransactionSimulation"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#2196F3',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen
            name="TransactionSimulation"
            component={TransactionSimulationScreen}
            options={{ title: 'Classificar Transação' }}
          />
          <Stack.Screen
            name="TransactionResult"
            component={TransactionResultScreen}
            options={{ title: 'Resultado da Análise' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </TransactionProvider>
  );
}

