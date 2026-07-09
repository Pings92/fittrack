// ============================================================
// WorkoutDetailScreen.tsx — Détail d'une séance d'entraînement
//
// Fonctionnalités :
//   - Affiche les informations de la séance (date, durée, notes)
//   - Liste les exercices de la séance avec leurs statistiques
//   - Ajout / modification / suppression d'exercices dans la séance
//   - Formulaire adaptatif : Cardio → durée (secondes), autres → séries/reps/poids
//   - Double modal : formulaire d'exercice + sélecteur d'exercice imbriqué
//
// Cet écran est accessible depuis WorkoutsScreen ET DashboardScreen.
// Il reçoit le workoutId via les paramètres de navigation.
// ============================================================

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native'
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import api from '../services/api'
import { Colors } from '../constants/colors'
import { Workout, Exercise, WorkoutExercise, RootStackParamList } from '../types'

// RouteProp type : permet à TypeScript de connaître les paramètres de cet écran
// (workoutId: number, title?: string)
type RouteParams = RouteProp<RootStackParamList, 'WorkoutDetail'>

// Couleur associée à chaque catégorie d'exercice
const CAT_COLORS: Record<string, string> = {
  Musculation: Colors.primaryLight,
  Cardio:      Colors.amber,
  Flexibilité: Colors.emerald,
}

// Formate '2024-03-15' en "vendredi 15 mars 2024"
function formatDate(d: string) {
  const [y, mo, day] = d.slice(0, 10).split('-').map(Number)
  return new Date(y, mo - 1, day).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function WorkoutDetailScreen() {
  // useRoute() récupère les paramètres de navigation passés par l'écran précédent
  const route      = useRoute<RouteParams>()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { workoutId } = route.params // Extrait workoutId des params

  // ── États ─────────────────────────────────────────────────

  const [workout, setWorkout]       = useState<Workout | null>(null)
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Liste complète des exercices disponibles (pour le sélecteur dans la modal)
  const [allExercises, setAllExercises] = useState<Exercise[]>([])

  // ── États de la modal ajout/édition d'exercice ──
  const [exModalOpen, setExModalOpen]     = useState(false)
  const [editExTarget, setEditExTarget]   = useState<WorkoutExercise | null>(null) // null = ajout
  const [selectedExId, setSelectedExId]   = useState<number | null>(null) // ID de l'exercice choisi
  // Valeurs du formulaire de performance (tout en string car TextInput)
  const [exForm, setExForm]               = useState({ sets: '', reps: '', weight_used: '', duration: '' })
  const [submittingEx, setSubmittingEx]   = useState(false)

  // État du second modal (sélecteur d'exercice imbriqué dans le premier modal)
  const [exPickerOpen, setExPickerOpen]   = useState(false)

  // ── Chargement des données ─────────────────────────────────

  // Charge la séance et la liste complète des exercices en parallèle pour
  // réduire le temps d'attente — les deux requêtes sont indépendantes.
  // Promise.all([p1, p2]) attend que les deux promesses soient résolues.
  const loadWorkout = async () => {
    try {
      const [wRes, exRes] = await Promise.all([
        api.get(`/workouts/${workoutId}`), // Détail de la séance + ses exercices
        api.get('/exercises'),             // Tous les exercices dispo (pour le sélecteur)
      ])
      setWorkout(wRes.data.workout)
      setAllExercises(exRes.data.exercises)
    } catch {
      Toast.show({ type: 'error', text1: 'Impossible de charger la séance' })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // useEffect avec [workoutId] : se lance au montage ET si workoutId change
  useEffect(() => {
    loadWorkout()
  }, [workoutId])

  // ── Gestion des modals ────────────────────────────────────

  // Ouvre la modal pour AJOUTER un exercice
  const openAddEx = () => {
    setEditExTarget(null) // Mode ajout
    const firstEx = allExercises[0]
    setSelectedExId(firstEx?.id ?? null) // Pré-sélectionne le premier exercice
    setExForm({ sets: '', reps: '', weight_used: '', duration: '' })
    setExModalOpen(true)
  }

  // Ouvre la modal pour MODIFIER un exercice existant (pré-remplit le formulaire)
  const openEditEx = (we: WorkoutExercise) => {
    setEditExTarget(we)
    setSelectedExId(we.exercise_id)
    setExForm({
      // != null (au lieu de !== undefined) : capture aussi null
      // String() convertit le nombre en texte pour TextInput
      sets:        we.sets        != null ? String(we.sets)        : '',
      reps:        we.reps        != null ? String(we.reps)        : '',
      weight_used: we.weight_used != null ? String(we.weight_used) : '',
      duration:    we.duration    != null ? String(we.duration)    : '',
    })
    setExModalOpen(true)
  }

  // ── Suppression d'un exercice de la séance ─────────────────

  const confirmDeleteEx = (we: WorkoutExercise) => {
    Alert.alert(
      'Retirer l\'exercice',
      `Retirer "${we.exercise_name}" de cette séance ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Retirer', style: 'destructive', onPress: () => handleDeleteEx(we.id) },
      ]
    )
  }

  const handleDeleteEx = async (weId: number) => {
    try {
      await api.delete(`/workouts/${workoutId}/exercises/${weId}`)
      // Mise à jour locale : filtre le tableau exercises sans recharger depuis l'API
      // prev => représente l'état courant de workout
      setWorkout((prev) =>
        prev ? { ...prev, exercises: prev.exercises?.filter((e) => e.id !== weId) } : prev
      )
      Toast.show({ type: 'success', text1: 'Exercice retiré' })
    } catch {
      Toast.show({ type: 'error', text1: 'Impossible de retirer l\'exercice' })
    }
  }

  // ── Ajout / Modification d'un exercice ────────────────────

  const handleSubmitEx = async () => {
    if (!selectedExId) {
      Toast.show({ type: 'error', text1: 'Sélectionne un exercice' })
      return
    }
    setSubmittingEx(true)
    try {
      // Convertit les strings en nombres, envoie undefined si le champ est vide
      const payload = {
        exercise_id: selectedExId,
        sets:        exForm.sets        ? Number(exForm.sets)        : undefined,
        reps:        exForm.reps        ? Number(exForm.reps)        : undefined,
        weight_used: exForm.weight_used ? Number(exForm.weight_used) : undefined,
        duration:    exForm.duration    ? Number(exForm.duration)    : undefined,
      }

      if (editExTarget) {
        // PATCH : mise à jour partielle (seulement les stats de performance)
        await api.patch(`/workouts/${workoutId}/exercises/${editExTarget.id}`, payload)
        Toast.show({ type: 'success', text1: 'Exercice modifié' })
      } else {
        // POST : ajoute un nouvel exercice à la séance
        await api.post(`/workouts/${workoutId}/exercises`, payload)
        Toast.show({ type: 'success', text1: 'Exercice ajouté' })
      }
      setExModalOpen(false)
      loadWorkout() // Recharge la séance pour afficher les données fraîches
    } catch (err: unknown) {
      const msg =
        err instanceof Error && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined
      Toast.show({ type: 'error', text1: msg || 'Erreur' })
    } finally {
      setSubmittingEx(false)
    }
  }

  // ── Logique du formulaire adaptatif ────────────────────────

  // Trouve l'exercice actuellement sélectionné dans la liste complète
  const selectedExercise = allExercises.find((e) => e.id === selectedExId)
  // Le formulaire de stats change selon la catégorie : Cardio → durée (secondes),
  // Musculation/Flexibilité → séries + reps + poids.
  const isCardio = selectedExercise?.category === 'Cardio'

  // ── Gestion des états de chargement et d'erreur ──────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    )
  }

  // Si la séance n'a pas été trouvée (ID invalide ou supprimée)
  if (!workout) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Séance introuvable</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          <Text style={{ color: Colors.primaryLight }}>Retour</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // ── Rendu principal ────────────────────────────────────────

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadWorkout() }}
            tintColor={Colors.primary}
          />
        }
      >
        {/* ── En-tête de la séance : date, durée, notes ── */}
        <View style={styles.header}>
          <View style={styles.headerMeta}>
            <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.headerDate}>{formatDate(workout.date)}</Text>
          </View>
          {workout.duration ? (
            <View style={styles.headerMeta}>
              <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.headerDate}>{workout.duration} min</Text>
            </View>
          ) : null}
          {workout.notes ? (
            <Text style={styles.notes}>{workout.notes}</Text>
          ) : null}
        </View>

        {/* ── Section exercices ── */}
        <View style={styles.section}>
          {/* En-tête section : titre + bouton "Ajouter" */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Exercices {workout.exercises?.length ? `(${workout.exercises.length})` : ''}
            </Text>
            {allExercises.length > 0 && (
              <TouchableOpacity onPress={openAddEx} style={styles.addBtn} activeOpacity={0.8}>
                <Ionicons name="add" size={14} color={Colors.primaryLight} />
                <Text style={styles.addBtnText}>Ajouter</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Liste des exercices OU état vide */}
          {workout.exercises && workout.exercises.length > 0 ? (
            workout.exercises.map((we) => {
              const catColor = CAT_COLORS[we.category ?? ''] ?? Colors.textSecondary
              return (
                <View key={we.id} style={styles.exCard}>
                  {/* Nom + boutons modifier/supprimer */}
                  <View style={styles.exHeader}>
                    <Text style={styles.exName}>{we.exercise_name}</Text>
                    <View style={styles.exActions}>
                      <TouchableOpacity onPress={() => openEditEx(we)} hitSlop={8}>
                        <Ionicons name="pencil-outline" size={14} color={Colors.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => confirmDeleteEx(we)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={14} color={Colors.red} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Catégorie + groupe musculaire */}
                  {we.category && (
                    <Text style={[styles.exCat, { color: catColor }]}>
                      {we.category}{we.muscle_group ? ` · ${we.muscle_group}` : ''}
                    </Text>
                  )}

                  {/* Chips de stats (séries, reps, poids, durée)
                      Chaque chip n'est affiché que si la valeur n'est pas null */}
                  <View style={styles.exStats}>
                    {we.sets     != null && (
                      <View style={styles.statChip}>
                        <Text style={styles.statChipValue}>{we.sets}</Text>
                        <Text style={styles.statChipLabel}>séries</Text>
                      </View>
                    )}
                    {we.reps     != null && (
                      <View style={styles.statChip}>
                        <Text style={styles.statChipValue}>{we.reps}</Text>
                        <Text style={styles.statChipLabel}>reps</Text>
                      </View>
                    )}
                    {we.weight_used != null && (
                      <View style={styles.statChip}>
                        <Text style={styles.statChipValue}>{we.weight_used}</Text>
                        <Text style={styles.statChipLabel}>kg</Text>
                      </View>
                    )}
                    {we.duration != null && (
                      <View style={styles.statChip}>
                        <Text style={styles.statChipValue}>{we.duration}</Text>
                        <Text style={styles.statChipLabel}>sec</Text>
                      </View>
                    )}
                  </View>
                </View>
              )
            })
          ) : (
            /* Zone cliquable quand aucun exercice n'est encore ajouté */
            <TouchableOpacity style={styles.emptyExCard} onPress={openAddEx} activeOpacity={0.8}>
              <Ionicons name="add-circle-outline" size={24} color={Colors.textMuted} />
              <Text style={styles.emptyExText}>Ajouter un exercice à cette séance</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* ── Modal 1 : formulaire ajout/édition d'un exercice ── */}
      <Modal
        visible={exModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setExModalOpen(false)}
      >
        <View style={styles.modal}>
          {/* En-tête de la modal */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editExTarget ? 'Modifier l\'exercice' : 'Ajouter un exercice'}
            </Text>
            <TouchableOpacity onPress={() => setExModalOpen(false)}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">

            {/* Bouton pour ouvrir le sélecteur d'exercice (Modal 2) */}
            <Text style={styles.label}>Exercice *</Text>
            <TouchableOpacity
              style={styles.exPicker}
              onPress={() => setExPickerOpen(true)} // Ouvre le second modal
              activeOpacity={0.8}
            >
              <Text style={styles.exPickerText}>
                {selectedExercise ? selectedExercise.name : 'Sélectionner...'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
            </TouchableOpacity>

            {/* Affiche la catégorie + groupe de l'exercice sélectionné */}
            {selectedExercise && (
              <Text style={[styles.exCatLabel, { color: CAT_COLORS[selectedExercise.category] ?? Colors.textSecondary }]}>
                {selectedExercise.category}
                {selectedExercise.muscle_group ? ` · ${selectedExercise.muscle_group}` : ''}
              </Text>
            )}

            {/* Formulaire adaptatif selon la catégorie de l'exercice sélectionné */}
            {isCardio ? (
              /* Cardio → un seul champ : durée en secondes */
              <>
                <Text style={[styles.label, { marginTop: 16 }]}>Durée (secondes)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1800"
                  placeholderTextColor={Colors.textMuted}
                  value={exForm.duration}
                  onChangeText={(v) => setExForm({ ...exForm, duration: v })}
                  keyboardType="numeric"
                />
              </>
            ) : (
              /* Musculation / Flexibilité → 3 champs côte à côte */
              <View style={styles.statsRow}>
                <View style={styles.statField}>
                  <Text style={styles.label}>Séries</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="4"
                    placeholderTextColor={Colors.textMuted}
                    value={exForm.sets}
                    onChangeText={(v) => setExForm({ ...exForm, sets: v })}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.statField}>
                  <Text style={styles.label}>Reps</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="8"
                    placeholderTextColor={Colors.textMuted}
                    value={exForm.reps}
                    onChangeText={(v) => setExForm({ ...exForm, reps: v })}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.statField}>
                  <Text style={styles.label}>Poids (kg)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="80"
                    placeholderTextColor={Colors.textMuted}
                    value={exForm.weight_used}
                    onChangeText={(v) => setExForm({ ...exForm, weight_used: v })}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            )}

            {/* Boutons Annuler / Ajouter|Enregistrer */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setExModalOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, submittingEx && styles.submitBtnDisabled]}
                onPress={handleSubmitEx}
                disabled={submittingEx}
                activeOpacity={0.8}
              >
                {submittingEx ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>{editExTarget ? 'Enregistrer' : 'Ajouter'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* ── Modal 2 : sélecteur d'exercice (imbriqué dans Modal 1) ──
            React Native autorise ce pattern de Modal dans Modal.
            Le sélecteur se superpose au formulaire sans quitter l'écran. */}
        <Modal
          visible={exPickerOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setExPickerOpen(false)}
        >
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir un exercice</Text>
              <TouchableOpacity onPress={() => setExPickerOpen(false)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Liste scrollable de tous les exercices */}
            <ScrollView>
              {allExercises.map((ex) => (
                <TouchableOpacity
                  key={ex.id}
                  style={[styles.pickerItem, selectedExId === ex.id && styles.pickerItemActive]}
                  onPress={() => {
                    setSelectedExId(ex.id)
                    // Remet le formulaire à zéro car les champs changent selon la catégorie
                    setExForm({ sets: '', reps: '', weight_used: '', duration: '' })
                    setExPickerOpen(false) // Ferme ce modal, retourne au formulaire
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerItemText, selectedExId === ex.id && styles.pickerItemTextActive]}>
                    {ex.name}
                  </Text>
                  <Text style={[styles.pickerItemCat, { color: CAT_COLORS[ex.category] ?? Colors.textSecondary }]}>
                    {ex.category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.dark },
  // justifyContent + alignItems: 'center' → centrage parfait (spinner / message d'erreur)
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.dark },
  errorText: { color: Colors.textMuted, fontSize: 14 },
  content: { padding: 16, paddingBottom: 40 },

  header: {
    backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
    padding: 16, marginBottom: 16,
  },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  headerDate: { fontSize: 13, color: Colors.textSecondary },
  notes: { fontSize: 13, color: Colors.textMuted, marginTop: 8, lineHeight: 18 },

  section: {
    backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, padding: 16,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBtnText: { fontSize: 13, color: Colors.primaryLight },

  exCard: {
    backgroundColor: Colors.surfaceRaised, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    padding: 12, marginBottom: 10,
  },
  exHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  exName: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  exActions: { flexDirection: 'row', gap: 12 },
  exCat: { fontSize: 11, fontWeight: '500', marginBottom: 8 },
  exStats: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statChip: {
    backgroundColor: 'rgba(99,102,241,0.1)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    alignItems: 'center',
  },
  statChipValue: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  statChipLabel: { fontSize: 10, color: Colors.textMuted },

  // borderStyle: 'dashed' → contour pointillé pour l'état vide (invite à l'action)
  emptyExCard: {
    borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed',
    borderRadius: 12, padding: 24,
    alignItems: 'center', gap: 8,
  },
  emptyExText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },

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
  exPicker: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  exPickerText: { fontSize: 14, color: Colors.textPrimary, flex: 1 },
  exCatLabel: { fontSize: 11, fontWeight: '500', marginTop: 6 },
  // 3 champs côte à côte grâce à flexDirection: 'row' + flex: 1 sur chaque champ
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  statField: { flex: 1 },
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

  // Items de la liste du sélecteur d'exercice
  pickerItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  pickerItemActive: { backgroundColor: Colors.indigoBg }, // Fond coloré pour l'item sélectionné
  pickerItemText: { fontSize: 14, color: Colors.textPrimary, flex: 1 },
  pickerItemTextActive: { color: Colors.primaryLight, fontWeight: '600' },
  pickerItemCat: { fontSize: 11, fontWeight: '500' },
})