// ============================================================
// LoadingSpinner.tsx — Indicateur de chargement plein écran
//
// Utilisé pendant la récupération initiale des données
// (ex: vérification du token au démarrage, chargement d'un écran).
// ============================================================

import React from 'react'
import {
  View,              // Conteneur de mise en page
  ActivityIndicator, // Spinner natif iOS/Android (s'adapte au style de chaque OS)
  StyleSheet,        // Crée et optimise les styles
} from 'react-native'
import { Colors } from '../constants/colors'

export default function LoadingSpinner() {
  return (
    // flex: 1 → occupe tout l'espace disponible
    // justifyContent + alignItems: 'center' → centrage vertical ET horizontal du spinner
    <View style={styles.container}>
      {/* size="large" : grand spinner (il existe aussi "small" pour les boutons) */}
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  )
}

// StyleSheet.create est préféré aux objets inline : React Native les optimise
// en les sérialisant une seule fois au démarrage (meilleure performance).
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark,
  },
})