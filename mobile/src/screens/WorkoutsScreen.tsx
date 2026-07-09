// ============================================================
// WorkoutsScreen.tsx — Liste et gestion des séances
//
// Fonctionnalités :
//   - Affiche la liste de toutes les séances de l'utilisateur
//   - Création d'une séance (modal) → redirige vers WorkoutDetail
//   - Modification du titre/date/durée/notes d'une séance
//   - Suppression avec confirmation Alert
//   - Tap sur une séance → WorkoutDetail pour gérer les exercices
// ============================================================

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import api from '../services/api'
import { Colors } from '../constants/colors'
import { Workout, RootStackParamList } from '../types'

// Calculé une seule fois au chargement du module (pas à chaque render).
// toISOString() retourne '2024-03-15T10:30:00.000Z', slice(0,10) garde '2024-03-15'
const today = new Date().toISOString().slice(0, 10)

// Formulaire vide — valeurs par défaut pour la création d'une nouvelle séance
const EMPTY_FORM = {
  title:    '',
  date:     today,  // Pré-remplit avec la date du jour
  duration: '',     // Stocké en string car TextInput fonctionne avec du texte
  notes:    '',
}

// Formate une date ISO '2024-03-15' en "ven. 15 mars" (format français court)
function formatDate(d: string) {
  const [y, mo, day] = d.slice(0, 10).split('-').map(Number)
  return new Date(y, mo - 1, day).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'long',
  })
}

export default function WorkoutsScreen() {
  // useNavigation() : accès à la navigation sans avoir besoin de la prop
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()

  const [workouts, setWorkouts]     = useState<Workout[]>([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // États de la modal de création/édition
  const [modalOpen, setModalOpen]   = useState(false)
  const [editTarget, setEditTarget] = useState<Workout | null>(null) // null = création
  const [form, setForm]             = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  // ── Chargement des données ─────────────────────────────────

  const loadWorkouts = async () => {
    try {
      const res = await api.get('/workouts')
      setWorkouts(res.data.workouts)
    } catch {
      Toast.show({ type: 'error', text1: 'Impossible de charger les séances' })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Rechargement automatique à chaque fois que l'écran redevient actif
  // (ex: après avoir supprimé un exercice dans WorkoutDetail)
  useFocusEffect(
    useCallback(() => {
      loadWorkouts()
    }, [])
  )

  // ── Gestion de la modal ────────────────────────────────────

  const openCreate = () => {
    setEditTarget(null)   // Mode création : pas de cible
    setForm(EMPTY_FORM)   // Formulaire vide avec date du jour
    setModalOpen(true)
  }

  const openEdit = (w: Workout) => {
    setEditTarget(w)
    setForm({
      title:    w.title,
      date:     w.date.slice(0, 10),         // Garde seulement 'YYYY-MM-DD'
      duration: w.duration ? String(w.duration) : '', // Convertit number → string pour TextInput
      notes:    w.notes ?? '',               // ?? '' : si null/undefined → chaîne vide
    })
    setModalOpen(true)
  }

  // ── Suppression ───────────────────────────────────────────

  const confirmDelete = (w: Workout) => {
    // Alert.alert ouvre une boîte de dialogue native du téléphone
    Alert.alert(
      'Supprimer la séance',
      `Supprimer "${w.title}" ? Cette action est irréversible.`,
      [
        { text: 'Annuler',    style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => handleDelete(w.id) },
      ]
    )
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/workouts/${id}`)
      // Mise à jour immédiate de la liste locale (sans recharger depuis le serveur)
      // filter() crée un nouveau tableau sans l'élément supprimé
      setWorkouts((prev) => prev.filter((w) => w.id !== id))
      Toast.show({ type: 'success', text1: 'Séance supprimée' })
    } catch {
      Toast.show({ type: 'error', text1: 'Impossible de supprimer' })
    }
  }

  // ── Création / Modification ────────────────────────────────

  const handleSubmit = async () => {
    if (!form.title || !form.date) {
      Toast.show({ type: 'error', text1: 'Le titre et la date sont requis' })
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        title:    form.title,
        date:     form.date,
        // Number() convertit la string '60' en nombre 60
        // Si le champ est vide (''), on envoie undefined (optionnel)
        duration: form.duration ? Number(form.duration) : undefined,
        notes:    form.notes || undefined, // || undefined : chaîne vide → undefined
      }

      if (editTarget) {
        // ÉDITION : PUT remplace la ressource
        const res = await api.put(`/workouts/${editTarget.id}`, payload)
        // L'API PUT ne renvoie pas exercise_count → on le conserve depuis l'état local
        // pour ne pas afficher "0 exercices" après modification du titre/date.
        setWorkouts((prev) =>
          prev.map((w) => w.id === editTarget.id
            ? { ...res.data.workout, exercise_count: editTarget.exercise_count }
            : w
          )
        )
        Toast.show({ type: 'success', text1: 'Séance modifiée' })
      } else {
        // CRÉATION : POST crée une nouvelle ressource
        const res = await api.post('/workouts', payload)
        const newWorkout = { ...res.data.workout, exercise_count: 0 }
        setWorkouts((prev) => [newWorkout, ...prev]) // Ajoute en tête de liste
        Toast.show({ type: 'success', text1: 'Séance créée' })
        setModalOpen(false)
        // Redirige immédiatement vers le détail pour permettre d'ajouter des exercices.
        // On navigue avant de mettre à jour l'état pour une UX plus fluide.
        navigation.navigate('WorkoutDetail', {
          workoutId: res.data.workout.id,
          title:     res.data.workout.title,
        })
        return // "return" ici pour ne pas appeler setModalOpen(false) une 2e fois
      }
      setModalOpen(false)
    } catch (err: unknown) {
      const msg =
        err instanceof Error && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined
      Toast.show({ type: 'error', text1: msg || 'Erreur' })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Rendu d'une séance dans la liste ──────────────────────

  const renderItem = ({ item }: { item: Workout }) => (
    // Toute la carte est cliquable → navigue vers le détail
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('WorkoutDetail', { workoutId: item.id, title: item.title })}
      activeOpacity={0.8}
    >
      {/* Partie gauche : titre + métadonnées */}
      <View style={styles.cardLeft}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        {/* Ligne de métadonnées : date, durée, nb exercices */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={11} color={Colors.textMuted} />
            <Text style={styles.metaText}>{formatDate(item.date)}</Text>
          </View>
          {/* Affichage conditionnel : n'affiche que si la donnée existe */}
          {item.duration ? (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={11} color={Colors.textMuted} />
              <Text style={styles.metaText}>{item.duration} min</Text>
            </View>
          ) : null}
          {(item.exercise_count ?? 0) > 0 ? (
            <View style={styles.metaItem}>
              <Ionicons name="barbell-outline" size={11} color={Colors.textMuted} />
              <Text style={styles.metaText}>{item.exercise_count} ex.</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Partie droite : boutons modifier/supprimer + flèche */}
      <View style={styles.cardActions}>
        {/* hitSlop augmente la zone de clic sans agrandir visuellement le bouton */}
        <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn} hitSlop={8}>
          <Ionicons name="pencil-outline" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.iconBtn} hitSlop={8}>
          <Ionicons name="trash-outline" size={16} color={Colors.red} />
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  )

  // ── Rendu principal ────────────────────────────────────────

  return (
    <View style={styles.root}>
      {/* Spinner pendant le chargement initial, FlatList ensuite */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadWorkouts() }}
              tintColor={Colors.primary}
            />
          }
          // Affiché si le tableau data est vide
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucune séance pour le moment.</Text>
              <TouchableOpacity onPress={openCreate}>
                <Text style={styles.emptyLink}>Créer ta première séance →</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* ── FAB (bouton flottant "+") ── */}
      <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.8}>
        <Ionicons name="add" size={24} color={Colors.white} />
      </TouchableOpacity>

      {/* ── Modal création/édition ── */}
      <Modal
        visible={modalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalOpen(false)} // Bouton retour Android
      >
        <View style={styles.modal}>
          {/* En-tête */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editTarget ? 'Modifier la séance' : 'Nouvelle séance'}
            </Text>
            <TouchableOpacity onPress={() => setModalOpen(false)}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Formulaire scrollable (le clavier peut couvrir une partie) */}
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">

            <Text style={styles.label}>Titre *</Text>
            <TextInput
              style={styles.input}
              placeholder="Séance force haut corps"
              placeholderTextColor={Colors.textMuted}
              value={form.title}
              onChangeText={(v) => setForm({ ...form, title: v })}
            />

            {/* La date est saisie manuellement au format YYYY-MM-DD
                (pas de date picker pour rester simple) */}
            <Text style={[styles.label, { marginTop: 16 }]}>Date * (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="2024-01-15"
              placeholderTextColor={Colors.textMuted}
              value={form.date}
              onChangeText={(v) => setForm({ ...form, date: v })}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Durée (min)</Text>
            <TextInput
              style={styles.input}
              placeholder="60"
              placeholderTextColor={Colors.textMuted}
              value={form.duration}
              onChangeText={(v) => setForm({ ...form, duration: v })}
              keyboardType="numeric" // Clavier numérique uniquement
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Notes</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Super séance !"
              placeholderTextColor={Colors.textMuted}
              value={form.notes}
              onChangeText={(v) => setForm({ ...form, notes: v })}
              multiline
              numberOfLines={3}
            />

            {/* Texte d'aide uniquement en mode création */}
            {!editTarget && (
              <Text style={styles.hint}>
                Après création, tu pourras ajouter des exercices depuis le détail de la séance.
              </Text>
            )}

            {/* Boutons Annuler / Créer|Enregistrer */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>{editTarget ? 'Enregistrer' : 'Créer'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.dark },
  // paddingBottom: 100 → espace pour que le dernier item ne soit pas caché par le FAB
  list: { padding: 16, gap: 12, paddingBottom: 100 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
    padding: 16, flexDirection: 'row', alignItems: 'center',
  },
  cardLeft: { flex: 1 }, // Prend tout l'espace disponible, laisse la place aux boutons à droite
  cardTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: Colors.textMuted },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 8 },
  iconBtn: { padding: 4 }, // Zone de clic légèrement agrandie
  emptyContainer: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 14, color: Colors.textMuted },
  emptyLink: { fontSize: 14, color: Colors.primaryLight, marginTop: 8 },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  modal: { flex: 1, backgroundColor: Colors.dark },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  modalBody: { padding: 20 },
  label: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: Colors.textPrimary,
  },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  hint: { fontSize: 12, color: Colors.textMuted, marginTop: 12, lineHeight: 18 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 40 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, paddingVertical: 13, alignItems: 'center',
  },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: '500' },
  submitBtn: {
    flex: 1, backgroundColor: Colors.primary,
    borderRadius: 10, paddingVertical: 13, alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: Colors.white, fontWeight: '600' },
})