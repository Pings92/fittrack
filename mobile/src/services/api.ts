// ============================================================
// api.ts — Client HTTP centralisé (Axios)
//
// Toutes les requêtes vers le backend passent par cette instance.
// Avantage : on configure le JWT et la gestion d'erreur UNE SEULE FOIS ici,
// et tous les écrans en bénéficient automatiquement.
// ============================================================

import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage' // Stockage clé/valeur persistant (comme localStorage en web)
import { API_URL } from '../config'

// Création d'une instance Axios configurée
// (différent de axios.get/post direct : on centralise baseURL et timeout)
// timeout 10s : évite qu'une requête reste bloquée indéfiniment sur réseau lent
const api = axios.create({
  baseURL: API_URL, // Toutes les URLs seront relatives à cette base (ex: '/exercises' → 'http://192.168.x.x:5000/api/exercises')
  timeout: 10000,   // Abandonne la requête après 10 secondes sans réponse
})

// ── Intercepteur de REQUÊTE ──────────────────────────────────
// Un intercepteur s'exécute automatiquement avant/après chaque requête.
// Ici : on lit le token JWT dans AsyncStorage et on l'ajoute au header HTTP.
// Sans ce mécanisme, il faudrait ajouter le header manuellement à chaque appel API.
// Intercepteur requête : injecte le JWT Bearer à chaque appel
api.interceptors.request.use(async (config) => {
  // AsyncStorage.getItem est asynchrone (accès disque) → on utilise await
  const token = await AsyncStorage.getItem('token')
  if (token) {
    // Format attendu par le backend : "Authorization: Bearer <token>"
    config.headers.Authorization = `Bearer ${token}`
  }
  return config // IMPORTANT : toujours retourner config sinon la requête est bloquée
})

// ── Intercepteur de RÉPONSE ──────────────────────────────────
// S'exécute après chaque réponse du serveur.
// Intercepteur réponse : supprime le token si 401 (expiré ou invalide)
api.interceptors.response.use(
  // Cas nominal : la réponse est transmise telle quelle
  (response) => response,
  // Cas d'erreur : on intercepte pour traiter le 401
  async (error) => {
    if (error.response?.status === 401) {
      // 401 = Non autorisé : le token est expiré ou invalide.
      // On le supprime du stockage → l'utilisateur sera redirigé vers la connexion
      // via le RootNavigator qui surveille l'état user dans AuthContext.
      await AsyncStorage.removeItem('token')
    }
    // On relance l'erreur pour que le catch de chaque écran puisse l'afficher
    return Promise.reject(error)
  }
)

export default api