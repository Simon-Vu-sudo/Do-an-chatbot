import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ChatScreen from '../screens/ChatScreen';

declare global {
  namespace ReactNavigation {
    interface RootParamList {
      Chat: undefined;
    }
  }
}

const Stack = createStackNavigator();

const AppNavigator = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="Chat" 
      component={ChatScreen} 
      options={{ title: 'AI Support Chat' }}
    />
  </Stack.Navigator>
);

export default AppNavigator;
