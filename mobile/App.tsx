import 'react-native-url-polyfill/auto'
import React from 'react'
import { registerRootComponent } from 'expo'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'

import { AuthProvider, useAuth } from './src/context/AuthContext'
import LoadingSpinner from './src/components/LoadingSpinner'
import { Colors } from './src/constants/colors'
import { RootStackParamList, TabParamList } from './src/types'

// Écrans Auth
import LoginScreen from './src/screens/LoginScreen'
import RegisterScreen from './src/screens/RegisterScreen'

// Écrans principaux
import DashboardScreen from './src/screens/DashboardScreen'
import ExercisesScreen from './src/screens/ExercisesScreen'
import WorkoutsScreen from './src/screens/WorkoutsScreen'
import WorkoutDetailScreen from './src/screens/WorkoutDetailScreen'
import ProfileScreen from './src/screens/ProfileScreen'

const Stack = createNativeStackNavigator<RootStackParamList>()
const Tab = createBottomTabNavigator<TabParamList>()

// Lookup centralisé pour éviter un switch dans screenOptions — chaque onglet a
// une icône "filled" (focus) et "outline" (inactif) correspondante dans Ionicons.
const TAB_ICONS: Record<
  string,
  { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }
> = {
  Dashboard: { active: 'home', inactive: 'home-outline' },
  Exercises: { active: 'barbell', inactive: 'barbell-outline' },
  Workouts:  { active: 'calendar', inactive: 'calendar-outline' },
  Profile:   { active: 'person', inactive: 'person-outline' },
}

// Navigation à onglets du bas — accessible uniquement quand l'utilisateur est connecté.
function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name]
          const iconName = focused ? icons.active : icons.inactive
          return <Ionicons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500', paddingBottom: 2 },
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.textPrimary,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard', tabBarLabel: 'Accueil' }} />
      <Tab.Screen name="Exercises" component={ExercisesScreen} options={{ title: 'Exercices', tabBarLabel: 'Exercices' }} />
      <Tab.Screen name="Workouts"  component={WorkoutsScreen}  options={{ title: 'Séances',   tabBarLabel: 'Séances' }} />
      <Tab.Screen name="Profile"   component={ProfileScreen}   options={{ title: 'Profil',    tabBarLabel: 'Profil' }} />
    </Tab.Navigator>
  )
}

// Portail de navigation : affiche les écrans auth ou l'app selon l'état du token.
// Le spinner pendant le chargement initial évite un flash de l'écran de login
// quand le token AsyncStorage est encore en cours de lecture.
function RootNavigator() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingSpinner />

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="AppTabs" component={AppTabs} />
            {/* WorkoutDetail sort des onglets → header natif avec bouton retour */}
            <Stack.Screen
              name="WorkoutDetail"
              component={WorkoutDetailScreen}
              options={({ route }) => ({
                headerShown: true,
                title: route.params?.title ?? 'Séance',
                headerStyle: { backgroundColor: Colors.surface },
                headerTintColor: Colors.textPrimary,
                headerShadowVisible: false,
                headerTitleStyle: { fontWeight: '700' },
              })}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login"    component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
      {/* Toast global — rendu après le Stack pour passer par-dessus tout */}
      <Toast topOffset={52} />
    </NavigationContainer>
  )
}

function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </AuthProvider>
  )
}

// package.json a "main": "App.tsx" (pas le bootstrap expo/AppEntry.js par
// défaut) — sans cet appel, AppRegistry n'a jamais de composant "main"
// enregistré et le lancement échoue avec "main has not been registered".
registerRootComponent(App)