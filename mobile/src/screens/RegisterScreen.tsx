// ============================================================
// RegisterScreen.tsx — Écran d'inscription
//
// Formulaire complet : nom d'utilisateur, email, mot de passe,
// objectif fitness (boutons radio custom) et poids optionnel.
// Après inscription réussie, le token est sauvegardé et l'app
// bascule vers les onglets exactement comme après une connexion.
// ============================================================

import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { useAuth } from '../context/AuthContext'
import { Colors } from '../constants/colors'
import { RootStackParamList } from '../types'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Register'>
}

// Correspondance entre les valeurs BDD et les labels affichés — doit rester
// synchronisé avec le ENUM goal de la table User.
// "as const" rend les types exacts ('lose' au lieu de string)
const GOALS = [
  { value: 'lose'     as const, label: 'Perte de poids' },
  { value: 'maintain' as const, label: 'Maintien' },
  { value: 'gain'     as const, label: 'Prise de masse' },
]

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth()

  // Un state par champ — pattern standard pour les formulaires contrôlés en React
  const [username, setUsername] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [goal, setGoal]         = useState<'lose' | 'maintain' | 'gain'>('maintain') // Valeur par défaut
  const [weight, setWeight]     = useState('')  // Stocké en string car TextInput travaille en texte
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async () => {
    // Validation des champs obligatoires avant l'envoi
    if (!username || !email || !password) {
      Toast.show({ type: 'error', text1: 'Champs requis', text2: 'Nom, email et mot de passe sont obligatoires' })
      return
    }
    setLoading(true)
    try {
      await register({
        username,
        email,
        password,
        goal,
        // parseFloat convertit la string '75.5' en nombre 75.5
        // Si le champ est vide, on envoie undefined (le backend l'accepte comme optionnel)
        weight: weight ? parseFloat(weight) : undefined, // champ optionnel — omis si vide
      })
      // Pas besoin de navigate() — AuthContext met user à jour, RootNavigator redirige automatiquement
    } catch (err: unknown) {
      const msg =
        err instanceof Error && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined
      Toast.show({ type: 'error', text1: msg || 'Erreur lors de l\'inscription' })
    } finally {
      setLoading(false)
    }
  }

  return (
    // KeyboardAvoidingView : remonte l'écran quand le clavier virtuel apparaît
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
          <Text style={styles.logoSub}>Crée ton compte</Text>
        </View>

        <View style={styles.card}>

          {/* ── Nom d'utilisateur ── */}
          <View style={styles.field}>
            <Text style={styles.label}>Nom d'utilisateur *</Text>
            <TextInput
              style={styles.input}
              placeholder="johndoe"
              placeholderTextColor={Colors.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none" // Empêche la mise en majuscule de la première lettre
            />
          </View>

          {/* ── Email ── */}
          <View style={styles.field}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="ton@email.com"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* ── Mot de passe ── */}
          <View style={styles.field}>
            <Text style={styles.label}>Mot de passe *</Text>
            <TextInput
              style={styles.input}
              placeholder="8 caractères minimum"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry // Masque la saisie (points ou astérisques)
            />
          </View>

          {/* ── Objectif (boutons radio personnalisés) ──
              React Native n'a pas de RadioButton natif — on reproduit le comportement
              avec des TouchableOpacity dont le style change selon la valeur sélectionnée. */}
          <View style={styles.field}>
            <Text style={styles.label}>Objectif *</Text>
            <View style={styles.goalRow}>
              {GOALS.map((g) => (
                <TouchableOpacity
                  key={g.value}
                  // Style conditionnel : si ce bouton est l'objectif sélectionné → style actif
                  style={[styles.goalBtn, goal === g.value && styles.goalBtnActive]}
                  onPress={() => setGoal(g.value)} // Sélectionne cet objectif
                  activeOpacity={0.8}
                >
                  <Text style={[styles.goalBtnText, goal === g.value && styles.goalBtnTextActive]}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Poids (optionnel) ── */}
          <View style={styles.field}>
            <Text style={styles.label}>Poids (kg)</Text>
            <TextInput
              style={styles.input}
              placeholder="75"
              placeholderTextColor={Colors.textMuted}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad" // Clavier numérique avec virgule décimale
            />
          </View>

          {/* ── Bouton de soumission ── */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.btnText}>Créer mon compte</Text>
            )}
          </TouchableOpacity>

          {/* ── Lien retour connexion ── */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Déjà un compte ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.dark },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoWrapper: { alignItems: 'center', marginBottom: 32 },
  logoIcon: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  logoTitle: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },
  logoSub: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.border, padding: 24,
  },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 14, color: Colors.textPrimary,
  },
  // flexDirection: 'row' + gap → les 3 boutons objectif côte à côte avec espacement
  goalRow: { flexDirection: 'row', gap: 8 },
  goalBtn: {
    flex: 1,             // flex: 1 → chaque bouton prend 1/3 de la largeur disponible
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: 'rgba(15,23,42,0.4)',
    alignItems: 'center',
  },
  goalBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  goalBtnText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500', textAlign: 'center' },
  goalBtnTextActive: { color: Colors.white },
  btn: {
    backgroundColor: Colors.primary, borderRadius: 10,
    paddingVertical: 13, alignItems: 'center', marginTop: 8,
  },
  btnDisabled: { backgroundColor: '#3730a3' },
  btnText: { color: Colors.white, fontWeight: '600', fontSize: 15 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: Colors.textMuted, fontSize: 13 },
  footerLink: { color: Colors.primaryLight, fontSize: 13, fontWeight: '500' },
})