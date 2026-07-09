// ============================================================
// ExercisesScreen.tsx — Écran de gestion des exercices
//
// Fonctionnalités :
//   - Affiche la liste de tous les exercices (GET /api/exercises)
//   - Recherche en temps réel avec debounce (évite trop d'appels API)
//   - Filtres par catégorie (Musculation, Cardio, Flexibilité)
//   - Création, modification et suppression d'exercices
//   - Le formulaire CRUD s'ouvre dans une Modal (pop-up)
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,           // Conteneur de base (comme une <div> en HTML)
  Text,           // Affiche du texte
  StyleSheet,     // Crée les styles de manière optimisée
  FlatList,       // Liste performante avec scroll (optimisée pour les grandes listes)
  TextInput,      // Champ de saisie texte
  TouchableOpacity, // Bouton avec effet de transparence au clic (plus flexible que Button)
  Modal,          // Fenêtre pop-up qui s'affiche par-dessus l'écran
  ScrollView,     // Zone scrollable (pour le contenu dans la modal)
  ActivityIndicator, // Spinner de chargement
  RefreshControl, // Permet le "pull to refresh" (tirer vers le bas pour recharger)
  Alert,          // Boîte de dialogue native du système (iOS/Android)
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native' // Hook qui se déclenche quand l'écran devient actif
import { Ionicons } from '@expo/vector-icons'            // Bibliothèque d'icônes vectorielles
import Toast from 'react-native-toast-message'           // Notifications toast (messages temporaires)
import api from '../services/api'                        // Notre client HTTP Axios configuré
import { Colors } from '../constants/colors'             // Palette de couleurs centralisée
import { Exercise } from '../types'                      // Type TypeScript pour un exercice

// ── Constantes ─────────────────────────────────────────────

// "as const" indique à TypeScript que ce tableau ne changera jamais :
// il peut alors en déduire le type exact de chaque valeur ('Musculation' | 'Cardio' | 'Flexibilité').
const CATEGORIES = ['Musculation', 'Cardio', 'Flexibilité'] as const

// Type dérivé du tableau : équivaut à écrire 'Musculation' | 'Cardio' | 'Flexibilité'
type Category = (typeof CATEGORIES)[number]

// Associe chaque catégorie à ses couleurs (texte + fond du badge).
// Record<K, V> est un type TypeScript pour un objet dont toutes les clés sont de type K
// et toutes les valeurs de type V.
const CAT_COLOR: Record<Category, { text: string; bg: string }> = {
  Musculation: { text: Colors.primaryLight, bg: Colors.indigoBg },
  Cardio:      { text: Colors.amber,        bg: Colors.amberBg },
  Flexibilité: { text: Colors.emerald,      bg: Colors.emeraldBg },
}

// Formulaire vide — utilisé pour réinitialiser le formulaire avant chaque création.
const EMPTY_FORM = {
  name: '',
  category: 'Musculation' as Category, // valeur par défaut
  muscle_group: '',
  description: '',
}

// ── Composant principal ────────────────────────────────────

export default function ExercisesScreen() {

  // ── États (useState) ──────────────────────────────────────
  // useState<T>(valeur_initiale) retourne [valeur, fonction_pour_la_modifier]
  // Chaque fois qu'un state change, React re-rend le composant automatiquement.

  const [exercises, setExercises] = useState<Exercise[]>([])  // Liste des exercices affichés
  const [loading, setLoading]     = useState(true)            // Chargement initial (spinner plein écran)
  const [refreshing, setRefreshing] = useState(false)         // "Pull to refresh" en cours
  const [search, setSearch]       = useState('')              // Texte de recherche
  const [catFilter, setCatFilter] = useState<Category | ''>('') // Filtre catégorie actif ('' = tous)

  // États liés à la modal de création/édition
  const [modalOpen, setModalOpen]     = useState(false)        // La modal est-elle visible ?
  const [editTarget, setEditTarget]   = useState<Exercise | null>(null) // null = mode création, objet = mode édition
  const [form, setForm]               = useState(EMPTY_FORM)   // Valeurs actuelles du formulaire
  const [submitting, setSubmitting]   = useState(false)        // Envoi du formulaire en cours

  // useRef stocke une valeur persistante entre les renders SANS provoquer un re-render.
  // Ici, on l'utilise pour stocker l'identifiant du timer setTimeout du debounce.
  // useRef plutôt qu'un state pour le timer de debounce : une ref ne provoque
  // pas de re-render quand elle change, ce qui évite des boucles de rendu.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Chargement des données ─────────────────────────────────

  // useCallback mémorise la fonction pour éviter de la recréer à chaque render.
  // Les paramètres s et c ont les valeurs des states comme défaut — cela permet
  // d'appeler loadExercises() sans arguments (utilise l'état actuel).
  const loadExercises = useCallback(async (s = search, c = catFilter) => {
    try {
      // Construction des paramètres de requête (query string)
      const params: Record<string, string> = {}
      if (c) params.category = c   // ?category=Musculation
      if (s) params.search = s     // ?search=squat

      const res = await api.get('/exercises', { params })
      setExercises(res.data.exercises) // Met à jour la liste affichée
    } catch {
      Toast.show({ type: 'error', text1: 'Impossible de charger les exercices' })
    } finally {
      // "finally" s'exécute toujours, que la requête ait réussi ou échoué
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // useFocusEffect : se déclenche chaque fois que cet écran devient visible
  // (ex: quand on revient depuis un autre onglet ou écran).
  // DIFFÉRENCE avec useEffect : useEffect ne se déclenche qu'au montage initial,
  // useFocusEffect se redéclenche à chaque retour sur l'écran.
  // Recharge au focus de l'écran (retour depuis un autre écran).
  useFocusEffect(
    useCallback(() => {
      loadExercises()
    }, [catFilter]) // Se re-déclenche si catFilter change
  )

  // Debounce 350ms sur la saisie — évite un appel API à chaque frappe.
  // Sans debounce, taper "squat" ferait 5 requêtes (s, sq, squ, squa, squat).
  // Avec debounce, on attend 350ms d'inactivité avant de lancer la requête.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current) // Annule le timer précédent
    debounceRef.current = setTimeout(() => loadExercises(), 350)
    // Nettoyage : React appelle cette fonction quand le composant se démonte
    // ou avant que l'effet se relance — annule le timer en cours.
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search]) // Se relance à chaque frappe dans la barre de recherche

  // Changement de filtre catégorie : rechargement immédiat (pas de debounce nécessaire).
  useEffect(() => {
    setLoading(true)
    loadExercises(search, catFilter)
  }, [catFilter])

  // ── Gestion de la modal ────────────────────────────────────

  // Ouvre la modal en mode CRÉATION (réinitialise le formulaire)
  const openCreate = () => {
    setEditTarget(null)    // null = pas de cible d'édition = mode création
    setForm(EMPTY_FORM)    // Vide le formulaire
    setModalOpen(true)     // Affiche la modal
  }

  // Ouvre la modal en mode ÉDITION (pré-remplit le formulaire avec les données existantes)
  const openEdit = (ex: Exercise) => {
    setEditTarget(ex)      // Mémorise l'exercice qu'on modifie
    setForm({
      name:         ex.name,
      category:     ex.category,
      muscle_group: ex.muscle_group ?? '', // ?? '' : si null/undefined, utilise ''
      description:  ex.description ?? '',
    })
    setModalOpen(true)
  }

  // Affiche une boîte de dialogue de confirmation avant la suppression.
  // Alert.alert est une alerte native iOS/Android (pas un composant React).
  const confirmDelete = (ex: Exercise) => {
    Alert.alert(
      'Supprimer l\'exercice',                              // Titre
      `Supprimer "${ex.name}" ? Cette action est irréversible.`, // Message
      [
        { text: 'Annuler',    style: 'cancel' },           // Bouton annuler (gris)
        { text: 'Supprimer', style: 'destructive', onPress: () => handleDelete(ex.id) }, // Rouge + action
      ]
    )
  }

  // ── Opérations CRUD ───────────────────────────────────────

  // SUPPRESSION : appel DELETE puis mise à jour de l'état local
  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/exercises/${id}`)
      // Mise à jour optimiste : on retire l'élément de la liste locale
      // sans recharger toute la liste depuis le serveur.
      // prev => représente l'état précédent du tableau d'exercices.
      setExercises((prev) => prev.filter((ex) => ex.id !== id))
      Toast.show({ type: 'success', text1: 'Exercice supprimé' })
    } catch (err: unknown) {
      // Extraction du message d'erreur de la réponse API (format : { error: "..." })
      const msg =
        err instanceof Error && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined
      Toast.show({ type: 'error', text1: msg || 'Impossible de supprimer' })
    }
  }

  // CRÉATION ou MODIFICATION selon editTarget
  const handleSubmit = async () => {
    // Validation côté client — évite un aller-retour serveur inutile
    if (!form.name) {
      Toast.show({ type: 'error', text1: 'Le nom est requis' })
      return
    }
    setSubmitting(true) // Désactive le bouton + affiche le spinner
    try {
      if (editTarget) {
        // Mode ÉDITION → PUT (remplace la ressource existante)
        const res = await api.put(`/exercises/${editTarget.id}`, form)
        // Mise à jour locale : on remplace seulement l'exercice modifié dans le tableau
        setExercises((prev) => prev.map((ex) => ex.id === editTarget.id ? res.data.exercise : ex))
        Toast.show({ type: 'success', text1: 'Exercice modifié' })
      } else {
        // Mode CRÉATION → POST (crée une nouvelle ressource)
        const res = await api.post('/exercises', form)
        // Ajoute le nouvel exercice en TÊTE de liste (plus récent en premier)
        setExercises((prev) => [res.data.exercise, ...prev])
        Toast.show({ type: 'success', text1: 'Exercice créé' })
      }
      setModalOpen(false) // Ferme la modal après succès
    } catch (err: unknown) {
      const msg =
        err instanceof Error && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined
      Toast.show({ type: 'error', text1: msg || 'Erreur' })
    } finally {
      setSubmitting(false) // Réactive le bouton dans tous les cas
    }
  }

  // ── Rendu d'un item de la liste ────────────────────────────

  // renderItem est la fonction que FlatList appelle pour chaque élément du tableau.
  // Elle reçoit { item } (l'exercice) et doit retourner un composant JSX.
  const renderItem = ({ item }: { item: Exercise }) => {
    // Récupère les couleurs de la catégorie, avec un fallback par défaut
    const colors = CAT_COLOR[item.category] ?? { text: Colors.textSecondary, bg: Colors.surface }
    return (
      <View style={styles.card}>
        {/* En-tête : nom + badge catégorie */}
        <View style={styles.cardHeader}>
          {/* numberOfLines={2} : tronque le texte après 2 lignes avec "..." */}
          <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>

          {/* Badge coloré selon la catégorie
              style={[...]} accepte un tableau de styles — ils fusionnent de gauche à droite */}
          <View style={[styles.badge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.badgeText, { color: colors.text }]}>{item.category}</Text>
          </View>
        </View>

        {/* Affichage conditionnel : si la valeur est falsy (null, '', undefined), rien n'est rendu */}
        {item.muscle_group ? (
          <Text style={styles.muscleGroup}>{item.muscle_group}</Text>
        ) : null}
        {item.description ? (
          <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        ) : null}

        {/* Boutons Modifier / Supprimer */}
        <View style={styles.cardActions}>
          {/* activeOpacity={0.7} : réduit l'opacité à 70% au clic (feedback visuel) */}
          <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)} activeOpacity={0.7}>
            <Ionicons name="pencil-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.actionBtnText}>Modifier</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnRight]} onPress={() => confirmDelete(item)} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={14} color={Colors.red} />
            <Text style={[styles.actionBtnText, { color: Colors.red }]}>Supprimer</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ── Rendu principal ────────────────────────────────────────

  return (
    // View est le conteneur de base — flex: 1 lui dit d'occuper tout l'espace disponible
    <View style={styles.root}>

      {/* ── Barre de recherche ── */}
      <View style={styles.topBar}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={15} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher..."
            placeholderTextColor={Colors.textMuted}
            value={search}               // Valeur contrôlée par le state
            onChangeText={setSearch}     // Mise à jour du state à chaque frappe
          />
          {/* Bouton "effacer" — n'apparaît que si la barre contient du texte */}
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Filtres par catégorie ──
          ScrollView horizontal : les boutons défilent horizontalement s'ils dépassent l'écran */}
      <View style={styles.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {/* On préfixe le tableau avec '' pour avoir le bouton "Tous" en premier */}
          {(['', ...CATEGORIES] as const).map((cat) => (
            <TouchableOpacity
              key={cat} // key obligatoire dans les listes — aide React à identifier chaque élément
              style={[
                styles.filterBtn,
                catFilter === cat && styles.filterBtnActive, // Style actif si ce filtre est sélectionné
              ]}
              onPress={() => setCatFilter(cat)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterBtnText, catFilter === cat && styles.filterBtnTextActive]}>
                {cat === '' ? 'Tous' : cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Liste d'exercices ──
          Affiche un spinner pendant le chargement, sinon la FlatList */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        // FlatList est préférable à ScrollView + map pour les longues listes :
        // elle ne monte en mémoire que les éléments visibles à l'écran (virtualisation).
        <FlatList
          data={exercises}                             // Le tableau d'exercices à afficher
          keyExtractor={(item) => String(item.id)}     // Clé unique pour chaque item (obligatoire)
          renderItem={renderItem}                      // Fonction qui retourne le JSX de chaque item
          contentContainerStyle={styles.list}
          refreshControl={
            // RefreshControl : gère l'animation "pull to refresh" (tirer vers le bas)
            <RefreshControl
              refreshing={refreshing}                  // Est-ce que le refresh est en cours ?
              onRefresh={() => { setRefreshing(true); loadExercises() }} // Action au pull
              tintColor={Colors.primary}               // Couleur du spinner de refresh
            />
          }
          // Composant affiché quand la liste est vide (data = [])
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun exercice trouvé</Text>
              <TouchableOpacity onPress={openCreate}>
                <Text style={styles.emptyLink}>Créer un exercice →</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* ── FAB (Floating Action Button) ──
          Bouton flottant "+" pour créer un exercice.
          position: 'absolute' le place par-dessus le reste du contenu. */}
      <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.8}>
        <Ionicons name="add" size={24} color={Colors.white} />
      </TouchableOpacity>

      {/* ── Modal de création / édition ──
          visible={modalOpen} : la modal n'est rendue que si modalOpen est true.
          animationType="slide" : entre par le bas (style natif iOS/Android).
          onRequestClose : appelé sur Android quand on appuie sur le bouton retour physique. */}
      <Modal
        visible={modalOpen}
        animationType="slide"
        presentationStyle="pageSheet" // Demi-page sur iOS (avec le fond visible derrière)
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modal}>

          {/* En-tête de la modal : titre + bouton fermer */}
          <View style={styles.modalHeader}>
            {/* Titre dynamique : change selon le mode (création ou édition) */}
            <Text style={styles.modalTitle}>{editTarget ? 'Modifier l\'exercice' : 'Nouvel exercice'}</Text>
            <TouchableOpacity onPress={() => setModalOpen(false)}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* keyboardShouldPersistTaps="handled" : permet de cliquer sur les boutons
              sans fermer le clavier en premier (comportement plus naturel) */}
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">

            {/* ── Champ Nom ── */}
            <Text style={styles.label}>Nom *</Text>
            <TextInput
              style={styles.input}
              placeholder="Développé couché"
              placeholderTextColor={Colors.textMuted}
              value={form.name}
              // Spread operator : copie tous les champs du form, puis écrase uniquement "name"
              // C'est la façon idiomatique de mettre à jour un objet dans un state React.
              onChangeText={(v) => setForm({ ...form, name: v })}
            />

            {/* ── Sélecteur de catégorie (boutons radio personnalisés) ── */}
            <Text style={[styles.label, { marginTop: 16 }]}>Catégorie *</Text>
            <View style={styles.catBtns}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  // Fusion de styles : style de base + style actif si la catégorie est sélectionnée
                  style={[styles.catBtn, form.category === c && styles.catBtnActive]}
                  onPress={() => setForm({ ...form, category: c })}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.catBtnText, form.category === c && styles.catBtnTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Champ Groupe musculaire (optionnel) ── */}
            <Text style={[styles.label, { marginTop: 16 }]}>Groupe musculaire</Text>
            <TextInput
              style={styles.input}
              placeholder="Pectoraux, Triceps..."
              placeholderTextColor={Colors.textMuted}
              value={form.muscle_group}
              onChangeText={(v) => setForm({ ...form, muscle_group: v })}
            />

            {/* ── Champ Description (optionnel, multi-lignes) ── */}
            <Text style={[styles.label, { marginTop: 16 }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Description de l'exercice..."
              placeholderTextColor={Colors.textMuted}
              value={form.description}
              onChangeText={(v) => setForm({ ...form, description: v })}
              multiline          // Autorise le retour à la ligne
              numberOfLines={3}  // Hauteur initiale : 3 lignes
            />

            {/* ── Boutons Annuler / Valider ── */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>

              {/* disabled={submitting} empêche les double-clics pendant l'envoi */}
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {/* Spinner pendant l'envoi, texte sinon */}
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

// ── Styles ─────────────────────────────────────────────────
// StyleSheet.create() optimise les styles (validation + mise en cache au démarrage).
// En React Native, pas de CSS : on utilise des propriétés JS qui ressemblent au CSS.
// Les dimensions sont en "density-independent pixels" (dp), pas en px.
const styles = StyleSheet.create({
  // flex: 1 → occupe tout l'espace disponible dans le parent
  root: { flex: 1, backgroundColor: Colors.dark },

  topBar: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },

  // flexDirection: 'row' → les enfants s'alignent horizontalement (par défaut: 'column')
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchIcon: { marginRight: 8 },
  // flex: 1 sur le TextInput → il prend tout l'espace restant dans la row
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },

  filtersWrapper: { paddingBottom: 8 },
  filters: { paddingHorizontal: 16, gap: 8 }, // gap: espacement entre les boutons

  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterBtnText: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
  filterBtnTextActive: { color: Colors.white },

  // paddingBottom: 100 → espace en bas pour que le dernier item ne soit pas caché par le FAB
  list: { padding: 16, gap: 12, paddingBottom: 100 },

  card: {
    backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Espace les enfants aux deux extrémités
    alignItems: 'flex-start',        // Aligne au bord supérieur
    gap: 8, marginBottom: 6,
  },
  cardName: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary, lineHeight: 20 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '500' },
  muscleGroup: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  description: { fontSize: 11, color: Colors.border, lineHeight: 16 },
  cardActions: {
    flexDirection: 'row', marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  // marginLeft: 'auto' → pousse cet élément à droite (équivalent CSS margin-left: auto)
  actionBtnRight: { marginLeft: 'auto' },
  actionBtnText: { fontSize: 12, color: Colors.textMuted },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 14, color: Colors.textMuted },
  emptyLink: { fontSize: 14, color: Colors.primaryLight, marginTop: 8 },

  // FAB : position absolute le sort du flux normal et le place par-dessus tout
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 52, height: 52, borderRadius: 26, // borderRadius = moitié de la largeur → cercle parfait
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    // Ombre portée (iOS: shadowX, Android: elevation)
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
    backgroundColor: 'rgba(15,23,42,0.6)', // Couleur semi-transparente
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: Colors.textPrimary,
  },
  // textAlignVertical: 'top' → le curseur commence en haut (utile pour les textarea)
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  catBtns: { flexDirection: 'row', gap: 8 },
  catBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: 'rgba(15,23,42,0.4)', alignItems: 'center',
  },
  catBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catBtnText: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },
  catBtnTextActive: { color: Colors.white },
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
  submitBtnDisabled: { opacity: 0.6 }, // Apparence désactivée pendant l'envoi
  submitBtnText: { color: Colors.white, fontWeight: '600' },
})