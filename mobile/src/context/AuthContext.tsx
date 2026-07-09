// ============================================================
// AuthContext.tsx — Gestion globale de l'authentification
//
// Le "Context" React est un mécanisme pour partager des données
// entre composants sans passer des props à chaque niveau.
// Ici, n'importe quel écran peut accéder à user/login/logout
// grâce au hook useAuth(), sans prop drilling.
//
// Persiste le JWT dans AsyncStorage pour survivre aux redémarrages de l'app.
// Expose : user (null si déconnecté), loading (hydratation initiale), login/register/logout.
// ============================================================

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import api from '../services/api'
import { User } from '../types'

// ── Types TypeScript ─────────────────────────────────────────

// Ce que le Context expose à tous les composants enfants
interface AuthContextType {
  user: User | null               // Utilisateur connecté, ou null si déconnecté
  loading: boolean                // true pendant la vérification initiale du token
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
}

// Données envoyées à l'API pour créer un compte
interface RegisterData {
  username: string
  email: string
  password: string
  goal: 'lose' | 'maintain' | 'gain'
  weight?: number // Le "?" rend le champ optionnel en TypeScript
}

// ── Création du Context ─────────────────────────────────────
// createContext crée un "canal" de communication entre composants.
// La valeur initiale null sera remplacée dès que AuthProvider se monte.
const AuthContext = createContext<AuthContextType | null>(null)

// ── Provider ─────────────────────────────────────────────────
// AuthProvider enveloppe toute l'app (dans App.tsx).
// Il maintient l'état d'auth et rend les fonctions disponibles via le Context.
// { children }: ReactNode — children représente tout ce qui est entre les balises <AuthProvider>...</AuthProvider>
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [loading, setLoading] = useState(true) // true au démarrage : on n'a pas encore vérifié le token

  // ── Vérification du token au démarrage ─────────────────────
  // useEffect avec [] en dépendances = s'exécute UNE SEULE FOIS au montage du composant.
  // C'est l'équivalent de componentDidMount dans les class components.
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 1. Lit le token sauvegardé lors de la dernière connexion
        const token = await AsyncStorage.getItem('token')
        if (token) {
          // 2. Vérifie que le token est encore valide en demandant le profil
          //    L'intercepteur dans api.ts ajoute automatiquement le token au header
          const res = await api.get('/auth/me')
          setUser(res.data.user) // Token valide → on restaure la session
        }
        // Si pas de token → user reste null → l'app affiche l'écran de connexion
      } catch {
        // Token expiré ou invalide → on le supprime proprement
        await AsyncStorage.removeItem('token')
      } finally {
        setLoading(false) // Dans tous les cas, le chargement initial est terminé
      }
    }
    initAuth()
  }, []) // [] = aucune dépendance → ne se relance jamais après le montage

  // ── Fonctions d'authentification ───────────────────────────

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password })
    // Sauvegarde le token pour les prochains démarrages de l'app
    await AsyncStorage.setItem('token', res.data.token)
    setUser(res.data.user) // Mise à jour → RootNavigator bascule vers les onglets
  }

  const register = async (data: RegisterData) => {
    const res = await api.post('/auth/register', data)
    await AsyncStorage.setItem('token', res.data.token)
    setUser(res.data.user)
  }

  const logout = async () => {
    await AsyncStorage.removeItem('token') // Supprime le token du stockage
    setUser(null) // Mise à jour → RootNavigator revient à l'écran de connexion
  }

  // ── Rendu du Provider ───────────────────────────────────────
  // AuthContext.Provider rend les valeurs accessibles à tous les enfants
  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook personnalisé ───────────────────────────────────────
// useAuth() est un "custom hook" : il encapsule useContext pour simplifier
// l'usage (pas besoin d'importer AuthContext dans chaque écran).
// Hook qui force une erreur claire si appelé hors du Provider,
// évitant un null silencieux difficile à déboguer.
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  // Vérification de sécurité : si useAuth est appelé hors de AuthProvider, erreur explicite
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider')
  return ctx
}