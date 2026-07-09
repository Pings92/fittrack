// ============================================================
// LoginScreen.tsx — Écran de connexion
//
// Formulaire email + mot de passe.
// Après connexion réussie, AuthContext met user à jour et le
// RootNavigator bascule automatiquement vers les onglets.
// ============================================================

import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,          // Champ de saisie texte
  TouchableOpacity,   // Bouton avec retour visuel (opacité réduite au toucher)
  StyleSheet,
  KeyboardAvoidingView, // Remonte le contenu quand le clavier apparaît
  Platform,             // Détecte l'OS (iOS ou Android) pour adapter le comportement
  ScrollView,
  ActivityIndicator,    // Spinner pendant le chargement
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { useAuth } from '../context/AuthContext'
import { Colors } from '../constants/colors'
import { RootStackParamList } from '../types'

// Type de la prop "navigation" — généré par React Navigation pour typer navigate()
type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>
}

export default function LoginScreen({ navigation }: Props) {
  // On récupère la fonction login depuis le Context (elle fait l'appel API + sauvegarde du token)
  const { login } = useAuth()

  // Un state par champ du formulaire + un state pour l'état de chargement
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false) // true pendant l'appel API

  const handleSubmit = async () => {
    // Validation basique avant l'appel API
    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Champs requis', text2: 'Remplis l\'email et le mot de passe' })
      return // "return" arrête la fonction ici → pas d'appel API si validation échoue
    }
    setLoading(true)
    try {
      await login(email, password)
      // La navigation est gérée automatiquement par le RootNavigator (user passe de null → objet)
      // Pas besoin de navigation.navigate() ici !
    } catch (err: unknown) {
      // Extraction du message d'erreur de la réponse API (format : { error: "..." })
      // avec fallback sur un message générique si la réponse n'a pas ce format.
      const msg =
        err instanceof Error && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined
      Toast.show({ type: 'error', text1: msg || 'Email ou mot de passe incorrect' })
    } finally {
      setLoading(false) // Réactive le bouton dans tous les cas
    }
  }

  return (
    // KeyboardAvoidingView évite que le clavier masque les champs de saisie.
    // 'padding' sur iOS remonte le contenu ; 'height' sur Android réduit la zone visible.
    // Ces deux comportements sont les seuls qui fonctionnent de manière cohérente sur chaque OS.
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ScrollView permet de scroller si le contenu dépasse l'écran (petit téléphone + grand clavier).
          keyboardShouldPersistTaps="handled" : les boutons restent cliquables sans fermer le clavier. */}
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Logo ── */}
        <View style={styles.logoWrapper}>
          <View style={styles.logoIcon}>
            <Ionicons name="barbell" size={28} color={Colors.white} />
          </View>
          <Text style={styles.logoTitle}>FitTrack</Text>
          <Text style={styles.logoSub}>Connecte-toi à ton espace</Text>
        </View>

        {/* ── Carte formulaire ── */}
        <View style={styles.card}>

          {/* Champ Email */}
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="ton@email.com"
              placeholderTextColor={Colors.textMuted}
              value={email}             // Valeur contrôlée par le state
              onChangeText={setEmail}   // Met à jour le state à chaque frappe
              keyboardType="email-address" // Affiche le clavier adapté (avec @)
              autoCapitalize="none"     // Pas de majuscule automatique pour les emails
              autoComplete="email"      // Suggestion du gestionnaire de mots de passe
            />
          </View>

          {/* Champ Mot de passe */}
          <View style={styles.field}>
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry // Masque les caractères (mode mot de passe)
            />
          </View>

          {/* Bouton de connexion
              disabled={loading} : désactivé pendant l'appel API (évite les double-soumissions) */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {/* Affichage conditionnel : spinner OU texte */}
            {loading ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.btnText}>Se connecter</Text>
            )}
          </TouchableOpacity>

          {/* Lien vers l'inscription */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Pas de compte ? </Text>
            {/* navigation.navigate() change d'écran dans la stack de navigation */}
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>S'inscrire</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  // flexGrow: 1 + justifyContent: 'center' → centre le contenu verticalement dans le ScrollView
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoWrapper: {
    alignItems: 'center', // Centre horizontalement les enfants
    marginBottom: 32,
  },
  logoIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoTitle: {
    fontSize: 24,
    fontWeight: '700', // 700 = gras (équivalent de font-weight: bold en CSS)
    color: Colors.textPrimary,
  },
  logoSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    backgroundColor: '#3730a3', // Indigo foncé pour indiquer l'état désactivé
  },
  btnText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 15,
  },
  footer: {
    flexDirection: 'row', // Texte et lien sur la même ligne
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  footerLink: {
    color: Colors.primaryLight,
    fontSize: 13,
    fontWeight: '500',
  },
})