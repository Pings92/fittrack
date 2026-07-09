// ============================================================
// ProfileScreen.tsx — Profil utilisateur
//
// Affiche :
//   - Avatar avec initiales + nom + email + objectif fitness
//   - Poids si renseigné
//   - 4 tuiles de statistiques globales
//   - Activité récente (4 derniers mois)
//   - Date d'inscription + bouton de déconnexion
//
// Données : GET /api/stats/progression (mêmes stats que le Dashboard)
// ============================================================

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../context/AuthContext'
import { Colors } from '../constants/colors'
import { ProgressionStats } from '../types'
import api from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

// Libellés lisibles pour chaque valeur d'objectif en BDD
const GOAL_LABELS: Record<string, string> = {
  lose:     'Perte de poids',
  maintain: 'Maintien du poids',
  gain:     'Prise de masse',
}

// Icône Ionicons associée à chaque objectif
const GOAL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  lose:     'trending-down-outline',
  maintain: 'remove-outline',
  gain:     'trending-up-outline',
}

export default function ProfileScreen() {
  // Récupère user (infos de l'utilisateur) et logout (déconnexion) depuis le Context
  const { user, logout } = useAuth()

  const [stats, setStats]           = useState<ProgressionStats | null>(null)
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStats = async () => {
    try {
      const res = await api.get('/stats/progression')
      setStats(res.data)
    } catch {
      // silencieux — l'UI affiche des 0 si les stats ne chargent pas
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Rechargement automatique à chaque fois que l'onglet Profil devient actif
  useFocusEffect(
    useCallback(() => {
      fetchStats()
    }, [])
  )

  // Boîte de dialogue de confirmation avant de déconnecter
  const confirmLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Es-tu sûr de vouloir te déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        // logout() vient du Context : supprime le token + met user à null → app redirige vers Login
        { text: 'Se déconnecter', style: 'destructive', onPress: logout },
      ]
    )
  }

  // Affiche le spinner tant que les stats ne sont pas chargées
  if (loading) return <LoadingSpinner />

  // Deux premières lettres du nom en majuscule pour l'avatar (ex: "JD" pour "johndoe").
  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : '?'

  // Raccourci vers les statistiques globales (évite de répéter stats?.stats.summary)
  const summary = stats?.stats.summary

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        // "Pull to refresh" pour recharger les stats manuellement
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchStats() }}
          tintColor={Colors.primary}
        />
      }
    >
      {/* ── Carte de profil : avatar + nom + email + objectif ── */}
      <View style={styles.profileCard}>
        {/* Avatar circulaire avec les initiales */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.username}>{user?.username}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        {/* Badge d'objectif avec icône */}
        <View style={styles.goalBadge}>
          <Ionicons
            name={GOAL_ICONS[user?.goal ?? 'maintain']}
            size={14}
            color={Colors.primaryLight}
          />
          <Text style={styles.goalText}>{GOAL_LABELS[user?.goal ?? 'maintain']}</Text>
        </View>
      </View>

      {/* ── Poids (section conditionnelle) ──
          N'affiche cette carte que si l'utilisateur a renseigné son poids */}
      {user?.weight && (
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="fitness-outline" size={16} color={Colors.primaryLight} />
            <Text style={styles.infoLabel}>Poids</Text>
            <Text style={styles.infoValue}>{user.weight} kg</Text>
          </View>
        </View>
      )}

      {/* ── Titre de section ── */}
      <View style={styles.sectionTitle}>
        <Text style={styles.sectionTitleText}>Statistiques globales</Text>
      </View>

      {/* ── 4 tuiles de statistiques ──
          StatTile est un composant local défini plus bas dans ce fichier */}
      <View style={styles.statsGrid}>
        <StatTile
          icon="trophy-outline"
          iconColor={Colors.primaryLight}
          iconBg={Colors.indigoBg}
          label="Séances totales"
          value={String(summary?.total_workouts ?? 0)}
        />
        <StatTile
          icon="time-outline"
          iconColor={Colors.violet}
          iconBg="rgba(139,92,246,0.15)"
          label="Minutes d'entraînement"
          value={String(summary?.total_minutes ?? 0)}
        />
        <StatTile
          icon="pulse-outline"
          iconColor={Colors.emerald}
          iconBg={Colors.emeraldBg}
          label="Durée moyenne"
          value={`${Math.round(summary?.avg_duration ?? 0)} min`}
        />
        <StatTile
          icon="barbell-outline"
          iconColor={Colors.amber}
          iconBg={Colors.amberBg}
          label="Exercices différents"
          value={String(summary?.unique_exercises ?? 0)}
        />
      </View>

      {/* ── Activité récente (4 derniers mois) ──
          L'API renvoie les mois du plus ancien au plus récent.
          On inverse (.reverse()) pour avoir le plus récent en premier,
          puis on prend les 4 premiers (.slice(0, 4)). */}
      {stats?.stats.monthly && stats.stats.monthly.length > 0 && (
        <>
          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>Activité récente</Text>
          </View>
          <View style={styles.infoCard}>
            {[...stats.stats.monthly].reverse().slice(0, 4).map((m) => {
              // Reconstruction d'un objet Date à partir de '2024-03' pour le formater
              const [year, month] = m.month.split('-')
              const date  = new Date(Number(year), Number(month) - 1)
              const label = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
              return (
                <View key={m.month} style={styles.monthRow}>
                  {/* Nom du mois avec majuscule automatique (textTransform dans le style) */}
                  <Text style={styles.monthLabel}>{label}</Text>
                  <View style={styles.monthRight}>
                    {/* Pluriel automatique : "1 séance" vs "3 séances" */}
                    <Text style={styles.monthWorkouts}>
                      {m.workout_count} séance{m.workout_count !== 1 ? 's' : ''}
                    </Text>
                    <Text style={styles.monthMinutes}>{m.total_minutes} min</Text>
                  </View>
                </View>
              )
            })}
          </View>
        </>
      )}

      {/* ── Infos du compte ── */}
      <View style={styles.sectionTitle}>
        <Text style={styles.sectionTitleText}>Compte</Text>
      </View>
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.infoLabel}>Membre depuis</Text>
          <Text style={styles.infoValue}>
            {user?.created_at
              ? new Date(user.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
              : '—' // Tiret cadratin si la date n'est pas disponible
            }
          </Text>
        </View>
      </View>

      {/* ── Bouton de déconnexion ── */}
      <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={18} color={Colors.red} />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

// ── Composant StatTile ──────────────────────────────────────
// Composant local réutilisable pour afficher une tuile de statistique.
// Accepte des props pour personnaliser l'icône, la couleur et les valeurs.
function StatTile({
  icon, iconColor, iconBg, label, value,
}: {
  icon: keyof typeof Ionicons.glyphMap
  iconColor: string
  iconBg: string
  label: string
  value: string
}) {
  return (
    <View style={styles.statTile}>
      {/* Icône dans un cercle coloré */}
      <View style={[styles.statTileIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.statTileValue}>{value}</Text>
      <Text style={styles.statTileLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.dark },
  content: { padding: 16, paddingBottom: 40 },

  // Carte de profil : alignItems: 'center' centre les enfants horizontalement
  profileCard: {
    backgroundColor: Colors.surface, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border,
    padding: 24, alignItems: 'center', marginBottom: 16,
  },
  // Cercle de 72px : borderRadius = moitié de la width/height
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: Colors.white },
  username: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  email: { fontSize: 13, color: Colors.textMuted, marginTop: 2, marginBottom: 12 },
  goalBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.indigoBg, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
  },
  goalText: { fontSize: 13, color: Colors.primaryLight, fontWeight: '500' },

  infoCard: {
    backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
    padding: 16, marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  infoLabel: { fontSize: 14, color: Colors.textSecondary, flex: 1 }, // flex: 1 → pousse la valeur à droite
  infoValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },

  // Titre de section en petites majuscules (textTransform + letterSpacing)
  sectionTitle: { marginBottom: 8, marginTop: 4 },
  sectionTitleText: {
    fontSize: 12, fontWeight: '600', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },

  // Grille de tuiles 2 colonnes (flexWrap + minWidth)
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16,
  },
  statTile: {
    flex: 1, minWidth: '45%', // 2 tuiles par ligne
    backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, padding: 14,
  },
  statTileIcon: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  statTileValue: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  statTileLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  monthRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  monthLabel: { fontSize: 13, color: Colors.textSecondary, textTransform: 'capitalize' },
  monthRight: { alignItems: 'flex-end' }, // Aligne le texte à droite
  monthWorkouts: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  monthMinutes: { fontSize: 11, color: Colors.textMuted },

  // Bouton de déconnexion avec fond rouge semi-transparent
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 8, padding: 14,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.redBg,
    backgroundColor: Colors.redBg,
  },
  logoutText: { fontSize: 14, fontWeight: '600', color: Colors.red },
})