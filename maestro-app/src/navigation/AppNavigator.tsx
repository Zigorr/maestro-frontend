import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { HomeScreen } from '../screens/HomeScreen';
import { CalibrateScreen } from '../screens/CalibrateScreen';
import { MusicScreen } from '../screens/MusicScreen';

export type RootStackParamList = {
  Home: undefined;
  Calibrate: { mode: 'csv' | 'manual' };
  Music: { mode: 'csv' | 'manual'; csvUri?: string; demo?: boolean; initialMood?: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Calibrate" component={CalibrateScreen} />
        <Stack.Screen name="Music" component={MusicScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
