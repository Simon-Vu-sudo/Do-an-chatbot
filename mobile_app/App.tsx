import React, { useState, useEffect } from 'react';
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  Modal,
  Text,
} from 'react-native';
import {
  NavigationContainer,
  useNavigation,
  NavigatorScreenParams,
  useRoute,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { navigationRef } from './src/navigation/navigationRef';

// Context Providers
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { ChatProvider } from './src/context/ChatContext';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import CartScreen from './src/screens/CartScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import ChatPopUp from './src/component/chatPopUp';

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  ProductDetail: { productId: string };
  Category: { categoryId: string; categoryName: string };
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type HomeStackParamList = {
  HomeNested: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Cart: undefined;
  Profile: undefined;
};

// Create navigation stacks
const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeNavStack = createNativeStackNavigator<HomeStackParamList>();

// Home Stack Navigator (cho tab Home)
const HomeStackNavigator = () => {
  return (
    <HomeNavStack.Navigator>
      <HomeNavStack.Screen
        name='HomeNested'
        component={HomeScreen}
        options={{ headerShown: false }}
      />
    </HomeNavStack.Navigator>
  );
};

// Auth Navigator
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name='Login' component={LoginScreen} />
      <AuthStack.Screen name='Register' component={RegisterScreen} />
    </AuthStack.Navigator>
  );
};

// Main Tab Navigator
const MainNavigator = () => {
  const { isUserLoggedIn } = useAuth();
  const navigation = useNavigation();
  const [activeTabName, setActiveTabName] = useState<string>('Home');

  useEffect(() => {
    if (!isUserLoggedIn()) {
      navigation.navigate('Auth' as never);
    }
  }, [isUserLoggedIn, navigation]);

  return (
    <>
      <Tab.Navigator
        screenListeners={{
          state: (e) => {
            if (
              e.data.state &&
              e.data.state.routes &&
              typeof e.data.state.index === 'number'
            ) {
              const currentTab = e.data.state.routes[e.data.state.index].name;
              setActiveTabName(currentTab);
            }
          },
        }}
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: string = '';

            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Search') {
              iconName = focused ? 'search' : 'search-outline';
            } else if (route.name === 'Cart') {
              iconName = focused ? 'cart' : 'cart-outline';
            } else if (route.name === 'Profile') {
              iconName = focused ? 'person' : 'person-outline';
            }
            return (
              <Ionicons name={iconName as any} size={size} color={color} />
            );
          },
          tabBarActiveTintColor: '#007bff',
          tabBarInactiveTintColor: 'gray',
        })}
      >
        <Tab.Screen
          name='Home'
          component={HomeStackNavigator}
          options={{ headerShown: false }}
        />
        <Tab.Screen name='Search' component={SearchScreen} />
        <Tab.Screen name='Cart' component={CartScreen} />
        <Tab.Screen name='Profile' component={ProfileScreen} />
      </Tab.Navigator>
      {activeTabName !== 'Cart' && activeTabName !== 'Profile' && <ChatPopUp />}
    </>
  );
};

// Root App Component
export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ChatProvider>
          <SafeAreaProvider>
            <NavigationContainer ref={navigationRef}>
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name='Auth' component={AuthNavigator} />
                <Stack.Screen name='Main' component={MainNavigator} />
                <Stack.Screen
                  name='ProductDetail'
                  component={ProductDetailScreen}
                  options={{
                    headerShown: true,
                    title: 'Chi tiết Sản phẩm',
                  }}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </SafeAreaProvider>
        </ChatProvider>
      </CartProvider>
    </AuthProvider>
  );
}
