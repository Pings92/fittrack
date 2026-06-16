// ============================================================
// context/AuthContext.tsx — Contexte d'authentification React
//
// Le Context API de React permet de partager des données entre composants
// sans passer par les props à chaque niveau (prop drilling).
// Ici, il expose l'utilisateur connecté et les fonctions login/register/logout
// à n'importe quel composant de l'arbre, via le hook useAuth.
// ============================================================

import { createContext, useState, useEffect, ReactNode} from 'react'
import api from '.../services/api'
import { User } from '../types'

// ------- Type TypeScript ---------
// Interface décrivant les données que le contexte expose
interface RegisterData {
    username: string
    email: string 
    password: string 
    weight?: number // ? = optionnelon timescript
    goal?: string
}

export interface AuthContextType {
    user: User | null //null = non connecté
    loading: boolean //true pendant la vérification initiale du token
    login: (email: string, password: string) => Promise<void>
    register: (data: RegisterData)=>Promise<void>
    logout: () => void
}

// ---- Création du contexte ----
// createContext(null) : valeur par défaut = null (sans Provider)
// Le type générique <AuthContextType | null> permet à TypeScript de savoir
// ce que contient le contexte (null = en dehors du Provider)
export const AuthContext = createContext<AuthContextType | null>(null)

//===========================================
//
//===========================================
//
//React node : type TypeScript pour n'importe quel contenu React rendable
export function AuthProvider({ children }: {children: ReactNode}) {
    // user: l'utilisateur coonnnecté, null si non authentifié
    const [user, setUser] = useState<User | null>(null)

    //loading: empeche d'afficher une page avant de savoir si l'user est connecté
    // Evite le "flash" de la page login avant la redirection vers le dashboard
    const [loading, setLoading] = useState(true)

    // --------  Vérification d token au démarrage de l'app -------
    // useEffect avec [] en dépendance = s'execute une seule fois au montage
    // si un token est déjà stpck" (sesion précédente), on vérifie sa validité
    useEffect(() => {
        const token = localStorage.getItem('token')
        if (token) {
            // GET /api/auth/me : retourne le profil si le token est valide
            api
                .get('/auth/me')
                .then((res) => setUser(res.data.user))
                // Si le token est expiré, l'intercepteur axios le supprime (voir api.ts)
                .catch(()=> localStorage.removeItem('token'))
                .finally(() => setLoading(false)) // Fin du chargement dans tous les cas
        } else {
            setLoading(false) //Pas de token -> on sait déjà qu'il n'est pas connecté
        }
    }, [])
}

