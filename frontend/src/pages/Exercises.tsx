//
//
//
//
//
//
//
//
// =====================

import { useEffect, useState, FormEvent, ChangeEvent } from "react"
import { Plus, Search, Pencil, Trash2, X } from "lucide-react"
import toast from "react-hot-toast"
import api from "../services/api"
import { Exercise } from "../types"

//
//
const CATEGORIES = ['Musculation', 'Cardio', 'Flexibilité'] as const 
type Category = (typeof CATEGORIES)[number] // Type union des valeurs du tableau

//
const CAT_COLORS: Record<Category, string> = {
    Musculation: 'bg-indigo-500/15 text-indigo-300',
    Cardio: 'bg-emerald-500/15 text-amber-300',
    Flexibilité: 'bg-emerald-500/15 text-emerald-300',
}

//
const EMPTY_FORM = {
    name:'',
    category: 'Musculation' as Category,
    muscle_group: '',
    description: '',
}

const inputCls =
    'w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors'

const labelCls = 'block text-sm font-medium text-slate-300 mb-1.5'

export default function Exercises() {
    const [exercises, setExercises] = useState<Exercise[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [catFilter, setCatFilter] = useState<Category | '' >('')

    // Les etats de modal
    const [modalOpen, setModalOpen] = useState(false)
    const [editTarget, setEditTarget] = useState<Exercise| null>(null)
    const [form, setForm] = useState('EMPTY_FORM')
    const [submitting, setSubmitting] = useState(false)

    // delete: id
    const [deletedId, setDeletedId] = useState<number | null> (null)

    //
    //
    //
    const loadExercises = (s = search, c = catFilter) => {
        const params: Record <string, string> = {}
        if (c) params.category = c
        if (s) params.search = s
        api
            .get('/exercises', {params})
            .then((res)=> setExercises(res.data.exercises))
            .catch(() => toast.error('Impossible de charger les exercices'))
            .finally(()=> setLoading(false))
    }

    // Rechargement quand le filtre catégorié change (immédiat)
    useEffect(() => {
        loadExercises()
    }, [catFilter])

    //
    //
    //
    //
    //
    //
    useEffect(() => {
        const t = setTimeout(() => loadExercises(), 350)
        return () => clearTimeout(t)
    }, [search])

    // Ouvre la modal en mode création (réinitialise le formulaire)
    const openCreate = () => {
        setEditTarget(null)
        setForm(EMPTY_FORM)
        setModalOpen(true)
    }

    //ouvre la modal en mode édition (préremplit le formulaire avec les valeurs existantes)
    const openEdit = (ex: Exercise) => {
        setEditTarget(ex)
        setForm({
            name: ex.name,
            category: ex.category,
            muscle_group: ex.muscle_group ?? '',
            description: ex.description ?? '',
        })
        setModalOpen(true)
    }

    // handle change générique
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value})
    }
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            if (editTarget) {
                // mode édition: Put avec l'id de l'exercice ciblé
                const res = await api.put(`/exercises/${editTarget.id}`, form)
                // 
                // sans rechareger toute la liste depuis l'api
                setExercises(exercises.map((ex) => (ex.id === editTarget.id ? res.data.exercise : ex )))
                toast.success('exercice modifié')
            } else {
                //mode création: Post -> on joute le nouvel exercise en tête de liste
                const res = await api.post('/exercises', form)
                setExercises([res.data.exercise, ...exercises])
                toast.success('Exercice crée')
            }
            setModalOpen(false)
        } catch (err: unknown) {
            const msg = 
                err instanceof Error && 'respond' in err
                ? (err as {response?: {data?: {error?: string } } } ). response?.data?.error
                :undefined
            toast.error(msg || 'Erreur')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/exercises/${id}`)
            //Mise à jour optimiste: on filtre l'élément supprimé sans recharger
            setExercises(exercises.filter((ex) => ex.id !==id))
            toast.success('Exercice supprimé')
        } catch (err: unknown){
            const msg =
            err instanceof Error && 'response' in err
            ? (err as { response?: {data?: {error?: string }}}).response?.data?.error
            : undefined
            toast.error(msg || 'Impossible de supprimer')
        } finally{
            setDeletedId(null) // Ferme la modal de confirmation quoi qu'il arrive
        }
    }
}
    return (
    <div>
        <div>
            
        </div>
    </div>
    )