// 
// 
// 
// 
// 
// 
// 
// 
// 
// 

import { useEffect, useState, ChangeEvent } from "react";
// useparam lit les segment dynamique de l'url (/workout/:id -> param id)
// useNavigate: redirection programatique
import { useParams, useNavigate, Link } from "react-router-dom";
import {
        ArrowLeft,Calendar, Clock, FileText, Dumbbell,
        Plus, Pencil, Trash2, Check, X, Loader2
} from 'lucide-react'
import toast from "react-hot-toast"
import api from "../services/api";
import { Workout, Exercise, WorkoutExercise } from "../types";
import LoadingSpinner from "../components/LoadingSpinner";

const CAT_COLORS: Record<string, string> = {
    Musculation : 'bg-indigo-500/15 text-indigo-300',
    Cardio      : 'bg-amber-500/15 text-amber-300',
    Flexibilité : 'bg-emerald-500/15 text-emerald-300',
}
const CAT_TEXT: Record<string, string> = {
    Musculation : 'text-indigo-400',
    Cardio      : 'text-amber-400',
    Flexibilité : 'text-emerald-400',
}

function formatDate(d: string) {
    const [y, mo, day] = d.slice(0,10).split('-').map(Number)
    return new Date(y, mo -1, day).toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
}

//
function formatDuration(secs: number){
    const m = Math.floor(secs / 60), s = secs % 60
    return m > 0 ? `${m} min${s > 0 ? ` ${s}s` : ''}` : `${s}s`
}

//
type EditState = { sets: string; reps: string; weight_used: string; duration: string}

const miniInput = 
'w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500'

export default function WorkoutDetail(){
    // use param extrait l'id de l'url : /workout/42 -> id = "42"
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

    const [ workout, setWorkout] = useState<Workout | null> (null)
    const [ allExercises, setAllExercises] = useState<Exercise[]>([])
    const [ loading, setLoading] = useState(true)

    //
    // 
    // 
    // 
    const [editing, setEditing] = useState<Record<number, EditState>>({})
    const [saving, setSaving] = useState<Record<number, boolean>>({})
    const [deleting, setDeleting] = useState<number | null>(null)

    // etat du panel d'ajout d'exercice
    const [addOpen, setAddOpen] = useState(false)
    const [addForm, setAddForm] = useState({exercise_id: 0, sets: '', reps: '', weight_used: '', duration: ''})
    const [addSaving, setAddSaving] = useState(false)

    //
    // promise. all attend que les 2 requete soient terminé avantde maj l'état
    useEffect(()=>{
        if (!id) return
        Promise.all([
            api.get(`/workouts/${id}`),
            api.get('/exercises'),
        ])
            .then(([wRes, eRes]) => {
                setWorkout(wRes.data.workout)
                setAllExercises(eRes.data.exercises)
                //Préselect le 1er exo dispo dans le formulaire d'ajout
                setAddForm((f) => ({ ...f, exercise_id: eRes.data.exercises[0]?.id ?? 0 }))
            })
            .catch(()=> {toast.error('Séance introuvable'); navigate('/workouts')})
            .finally (()=> setLoading(false))
    },  [id, navigate]) // se redéclenche si id change (navigation entre séance)

    // gestion de l'édition in line ---

    // passe un exo en mode edition (remplit l'état editing  [ex.id])
    const startEdit = (ex: WorkoutExercise) => {
        setEditing((prev) => ({
            ...prev, 
            [ex.id]: {
                sets:               ex.sets             != null ? String(ex.sets)               : '',
                reps:               ex.reps             != null ? String(ex.reps)               : '',
                weight_used:        ex.weight_used      != null ? String(ex.weight_used)        : '',
                duration:           ex.duration         != null ? String(ex.duration)           : '',
            },
        }))
    }

    // annule l'édition en supprimant l'entrée de editing
    const cancelEdit = (weId: number) => {
        setEditing((prev) => {
            const n = { ...prev }
            delete n[weId] // sup la clé -> l'exo repasse en mode lecture
            return n
        })
    }

    //maj un champ de l'étatd 'édition d'un exo spécifique
     const changeEdit = (weId:number, field: keyof EditState, value: string) =>{
        setEditing((prev) => ({ ...prev, [weId]: { ...prev[weId], [field]: value } } ))
     }

     //Save les modiifs d'un exo (patch /workouts/:id/exercise/:weId)
     const saveEdit = async (weId: number) => {
        if (!id) return
        setSaving((prev) => ({ ...prev, [weId]: true }))
        try {
            const f = editing[weId]
            const res = await api.patch(`/workouts/${id}/exercises/${weId}`, {
                sets:               f.sets           ? Number(f.sets)               : null,
                reps:               f.reps           ? Number(f.reps)               : null,
                weight_used:        f.weight_used    ? Number(f.weight_used)        : null,
                duration:           f.duration       ? Number(f.duration)           : null,
            })
            setWorkout(res.data.workout) //met a jour l'affichage avec les nouvelles valeurs
            cancelEdit(weId) // repasse en mode lecture
            toast.success('Exercice mis à jour')
        } catch {
            toast.error('Erreur lors de la miseà jour')
        } finally {
            setSaving((prev) => ({ ...prev, [weId]: false }))
        }
     }

     // ---- Suppresion d'un exo de la séance
     const confirmDelete = async (weId: number) => {
        if (!id) return
        setDeleting(weId)//Affiche le spinner sur cet exercise
        try {
            const res = await api.delete(`/workouts/${id}/exercises/${weId}`)
            setWorkout(res.data.workout) // l'api retourne al séance maj
            toast.success('Exercice retiré')
        } catch {
            toast.error("Impossible de retirer l'exercice")
        } finally {
            setDeleting(null)
        }
     }

     // ajout d'un exo à la séance
     const selectedEx = allExercises.find((e) => e.id === addForm.exercise_id)
     const isCardioAdd = selectedEx?.category === 'Cardio'

     const handleAddChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        // exercise_id est un nombre (id) les autres cjaù^s sont des strings
        const val = e.target.name === 'exercise_id' ? Number(e.target.value) : e.target.value
        setAddForm((f) => ({ ...f, [e.target.name]: val }))
     }

     const submitAdd = async () => {
        if (!id || !addForm.exercise_id) return
        setAddSaving(true)
        try {
            const res = await api.post(`/workouts/${id}/exercises`, {
                exercise_id:   addForm.exercise_id,
                sets:               addForm.sets           ? Number(addForm.sets)               : null,
                reps:               addForm.reps           ? Number(addForm.reps)               : null,
                weight_used:        addForm.weight_used    ? Number(addForm.weight_used)        : null,
                duration:           addForm.duration       ? Number(addForm.duration)           : null,
            })
            setWorkout(res.data.workout)
            // On réinitialise les champs mais on garde le sélecteur d'exercices
            setAddForm((f) => ({ ...f, sets: '', reps: '', weight_used: '', duration: ''}))
            setAddOpen(false)
            toast.success('Exercice ajouté')
        } catch {
            toast.error("Impossible d'ajouter l'exercice")
        } finally {
            setAddSaving(false)
        }
    }

    if (loading) return <LoadingSpinner />
    if (!workout) return null // Cas improbable mais typescript l'exige

    const exercises = workout.exercises ?? []

    return (
        <div className="space-y-5 max-w-2xl">
            {/*  lien retour */}
            <Link to="/workouts" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors">
                <ArrowLeft size={15}/>
            </Link>

            {/* en tete de la sénace */}
            <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-6 space-y-4">
                <h1 className="text-xl font-bold text-slate-100">{workout.title}</h1>
                <div className="flex flex-wrap gap-4">
                    <span className="flex items-center gap-2 text-sm text-slate-400"><Calendar size={14}  className="text-slate-500"/>{formatDate(workout.date)}</span>
                    {workout.duration && <span className="flex items-center gap-2 text-sm text-slate-400"><Clock size={14} className="text-slate-500"/>{workout.duration} minutes</span>}
                </div>
                {workout.notes && (
                    <div className="flex items-start gap-2 pt-3 border-t border-slate-700/50">
                        <FileText size={14} className="text-slate-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-slate-400"> {workout.notes}</p>
                    </div>
                )}
            </div>
            
            {/* section exo */}
            <div className="bg-[#1E293B] border border-slate-700 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Dumbbell size={16} className="text-slate-500"/>
                        <h2 className="text-sm font-semibold text-slate-200">
                            Exercices
                            {exercises.length > 0 && <span className="ml-2 text-xs font-normal text-slate-500">({exercises.length})</span> }
                        </h2>
                    </div>
                    {/*  Toggle du panel d'ajout */}
                    <button onClick={() => { setAddOpen((v) => !v) }} className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                        <Plus size={13} />
                        Ajouter
                    </button>
                </div>

                {/* panel d'ajout d'un exo */}
                {addOpen && (
                    <div className="mb-4 bg-slate-900/50 border border-slate-700 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-medium text-slate-300">Nouvel exercice</p>
                        <select name="exercise_id" value={addForm.exercise_id} onChange={handleAddChange} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                            {allExercises.map((ex) => (<option key={ex.id} value={ex.id}>{ex.name} — {ex.category} </option>))}
                        </select>
                        {selectedEx && <p className={`text-xs font-medium ${CAT_TEXT[selectedEx.category] ?? 'text-slate-400'}`}>{selectedEx.category}{selectedEx.muscle_group ? ` . ${selectedEx.muscle_group}` :''}</p>}

                        {/* champs adapaté selon la catégorei */}
                        {isCardioAdd ? (
                            <div>
                                <label className="text-xs text-slate-500">Durée (seconde)</label>
                                <input type="number" name="duration" value={addForm.duration} onChange={handleAddChange} placeholder="1800" className={`mt-1 ${miniInput}`}/>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                {[{ name: 'sets', label : 'Séries', ph:'4' } , { name: 'reps', label : 'Reps', ph:'8' }, { name: 'weight_used', label : 'Poids (kg)', ph:'80' }].map(({name, label, ph })=> (
                                    <div key={name}>
                                        <label className="text-xs text-slate-500">{label}</label>
                                        <input type="number" name={name} value={(addForm as Record<string, string | number>)[name] as string} onChange={handleAddChange} placeholder={ph} className={`mt-1 ${miniInput}`} />
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-2 pt-1">
                            <button onClick={() => setAddOpen(false)} className="flex-1 py-1.5 border border-slate-600 rounded-lg text-xs text-slate-400 hover:bg-slate-700/40 transition-colors"> Annuler </button>
                            <button onClick={submitAdd} disabled={addSaving || !addForm.exercise_id} className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-lg text-xs text-white font-medium transition-colors flex items-center justify-center gap-1">
                                {addSaving ? <Loader2 size={12} className="animate-spin"/> : <Check size={12} /> }
                                Ajouter
                            </button>
                        </div>
                    </div>
                )}

                {/* liste des exo */}
                {exercises.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">Acune exercice — clique sur "Ajouter" pour en ajouter un.</p>
                ) : (
                    <div>
                        {exercises.map((ex) => {
                            const isEditing = ex.id in editing // L'exercice est il en mode edition
                            const isSaving = saving[ex.id] // Sauvegarde en cours pour cet exo
                            const isDeleting = deleting === ex.id //suppressiion en cours
                            const isCardio = ex.category === 'Cardio '

                            return (
                                <div key={ex.id} className="py-4 first:pt-0 last:pb-0">
                                    {/* en tzete de l'exo : ,om + badge catégorie + bouton */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-medium text-sm text-slate-200 flex-1">{ex.name}</span>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${CAT_COLORS[ex.category] ?? 'bg-slate-700 text-slate-300'}`}>{ex.category}</span>
                                        {/* Boutons édition/suppression masqués pendant l'édition */}
                                        {!isEditing && (
                                            <>
                                                <button onClick={() => startEdit(ex)} className="p-1 text-slate-600 hover:text-indigo-400 transition-colors" title="Modifier"><Pencil size={13} /></button>
                                                <button onClick={() => confirmDelete(ex.id)} disabled={isDeleting} className="p-1 text-slate-600 hover:text-red-600 transition-colors disabled:opacity-40" title="Retirer">
                                                    {/* Icone de chargement pdt la suppresion */}
                                                    {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {ex.muscle_group && !isEditing && <p className="text-xs text-slate-500 mb-2">{ex.muscle_group} </p> }

                                    {/* mode lecture: affichage des badges séries/reps/poids */}
                                    {!isEditing && (
                                        <div>
                                            {ex.sets && <span className="text-xs bg-slate-800 border border-slate-700 text-slate-400 px-2.5 py-1 rounded-md"> {ex.sets} séries </span> }
                                            {ex.reps && <span className="text-xs bg-slate-800 border border-slate-700 text-slate-400 px-2.5 py-1 rounded-md"> {ex.reps} reps </span> }
                                            {ex.weight_used && <span className="text-xs bg-slate-800 border border-slate-700 text-slate-400 px-2.5 py-1 rounded-md"> {ex.weight_used} kg </span> }
                                            {ex.duration && <span className="text-xs bg-slate-800 border border-slate-700 text-slate-400 px-2.5 py-1 rounded-md"> {formatDuration(ex.duration)}</span> }
                                            {!ex.sets && !ex.reps && !ex.weight_used && !ex.duration && <span className="text-xs text-slate-600 italic"> Aucune donnée</span> }
                                        </div>
                                    )}

                                    {/* mode edition inline */}
                                    {isEditing && (
                                        <div className="space-y-2 mt-1">
                                            {isCardio ? (
                                                <div>
                                                    <label className="text-xs text-slate-500">Durée</label>
                                                    <input type="number" value={editing[ex.id].duration} onChange={(e) => changeEdit(ex.id, 'duration', e.target.value)} placeholder="1800" className={`mt-1 ${miniInput}`} />
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-3 gap-2">
                                                    {([
                                                        { field: 'sets', label: 'Séries', ph: '4' },
                                                        { field: 'reps', label: 'Reps', ph: '8'},
                                                        { field: 'weight_used', label: 'Poids (kg)', ph: '80'},
                                                    ] as const).map(({ field, label, ph }) => (
                                                        <div>
                                                            <label className="text-xs text-slate-500"> {label}</label>
                                                            <input type="number" value={editing[ex.id][field]} onChange={(e) => changeEdit(ex.id, field, e.target.value)} placeholder={ph} className={`mt-1 ${miniInput}`} />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
{/* reprendre là */}
                                            <div className="flex gap- pt-">
                                                <button onClick={() => cancelEdit(ex.id)} className="flex items-center gap-3 px-3 py-1.5 border border-slate-600 rounded-lg text-xs text-slate-400 hover:bg-slate-700/40 transition-colors"><X size={11}/>Annuler</button>
                                                <button onClick={() => saveEdit(ex.id)} disabled={isSaving} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled: opacity-60 rounded-lg text-xs text-white font-medium transition-colors">
                                                    {isSaving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                                                    Enregistrer
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}