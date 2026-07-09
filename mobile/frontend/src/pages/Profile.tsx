//
//
//
//
//
//
//

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import {User, Target, Scale, Calendar, Activity} from 'lucide-react'
import { useAuth } from "../hooks/useAuth";
import { useFetch } from "../hooks/useFetch";
import { ProgressionStats } from "../types";
import LoadingSpinner from "../components/LoadingSpinner";

const GOAL_LABELS: Record<string, string> = {
    lose: 'Perte de poids',
    maintain: 'Maintien du poids',
    gain: 'Prise de masse',
}

// couleur tailwind de l'objectif pour le mettre en valeur visuellement
const GOAL_COLORS: Record<string, string> = {
    lose: 'text-amber-400',
    maintain: 'text-emerald-400',
    gain: 'text-violet-400',
}

const MONTH_LABELS: Record<string, string> = {
    '01':'Jan', '02':'Fev', '03':'Mar', '04':'Avr',
    '05':'Mai', '06':'Juin', '07':'Juillet', '08':'Août',
    '09':'Sept', '10':'Oct', '11':'Nov', "12": 'Déc', 
}

function formatMonth(m: string){
    const [, month] = m.split('-')
    return MONTH_LABELS[month] ?? month
}

function formatDate(d: string) {
  const [y, mo, day] = d.slice(0, 10).split('-').map(Number)
  return new Date(y, mo - 1, day).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

const tooltipStyle = {
    backgroundColor: '#1E293B',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#F1F5F9'
}

export default function Profile() {
    const { user } = useAuth()
    const { data, loading} = useFetch<ProgressionStats>('/stats/progression')

    if (loading) return <LoadingSpinner />

    const stats = data?.stats

    // [...stats.monthly]reverse(): copie + inversion pour ordre chronologique
    const chartData = stats
        ? [...stats.monthly].reverse().map((m) => ({
            name: formatMonth(m.month),
            Séance: m.workout_count,
        }))
    : []

    //
    //
    const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : 'FT'

 return (
<div className="space-y-6 max-w-2xl">
    <h1 className="text-2xl font-bold text-slate-100">Mon profil</h1>

    {/* Caret Utilisateur */}
    <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-6">
        <div className="flex items-center gap-5">
            {/* Avatar avec initiale, pas d'img = pas de requete externe */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-2xl font-bold text-white shrink-0">
                {initials}
            </div>
            <div>
                <h2 className="text-lg font-bold text-slate-100"> {user?.username}</h2>
                <p className="text-sm text-slate-400">{user?.email}</p>
                {/* Rendu conditionnel: s'affiche uniquement si member_sinec est défini  */}
                {data?.user.member_since && (
                    <p className="text-xs text-slate-500 mt-1">
                        Membre depuis {formatDate(data.user.member_since)}
                    </p>
                )}
            </div>
        </div>

        {/*  3 infos en grille: poids, objectid, nbr de séance */}
        <div className="grid grid-col-3 gap-4 mt-6 pt-5 border-t border-slate-700/50">
            <InfoItem
            icon={<Scale size={15} className="text-slate-500"/>}
            label="Poids"
            value={user?.weight ? `${user.weight} kg` : '-'}
            />
            <InfoItem
                icon={<Target size={15} className="text-slate-500"/>}
                label="Objectif"
                // value peut etre du jsx (react.reactNode) pour mettre la couleur
                value={
                    <span className={GOAL_COLORS[user?.goal ?? 'maintain']}>
                        {GOAL_LABELS[user?.goal ?? 'maintain']}
                    </span>
                }
            />
            <InfoItem
                icon={<Activity size={15} className="text-slate-500"/>}
                label="Séances"
                value={stats?.summary.total_workouts ?? 0}
            />
        </div>
    </div>

    {/* Deux cards côte à côte: minutes totales et exercices maitrisé */}
    <div className="grid grid-col-2 gap-4">
        <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1">
                <Calendar size={14} className="text-indigo-400" />
                <span className="text-xs text-slate-500"> Minutes totales</span>
            </div>
            <p className="text-2xl font-bold text-slate-100">{stats?.summary.total_minutes ?? 0}</p>
            <p className="text-xs text-slate-500 mt-1">d'entraînement</p>
        </div>
        <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1">
                <User size={14} className="text-violet-400"/>
                <span></span>
            </div>
            <p className="text-2xl font-bold text-slate-100">{stats?.summary.unique_exercises ?? 0}</p>
            <p className="text-xs text-slate-500 mt-1">exercices differents</p>
        </div>
    </div>

    {/* Graphique d'activité mensuelle */}
    <div>
        <h3></h3>
        {chartData.length > 0? (
            <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} barSize={22}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false}/>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8'}} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94A3B8'}} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(139, 92, 246, 0.08'}} />
                    <Bar dataKey="Séances" fill="#8B5CF6" radius={[4,4,0,0]}/>
                </BarChart>
            </ResponsiveContainer>
        ) : (
            <p className="text-slate-500 text-sm text-center py-10">Aucune donnée d'activité</p>
        )}
    </div>

    {/* Répartition par catégorie - section optionnelle */}
    {stats?.byCategory && stats?.byCategory.length > 0 && (
        <div className="bg[#1E293B] border border-slate-700/50 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4"> Répartition par type</h3>
            <div className="space-y-3">
                {stats.byCategory.map((cat) => {
                    const total = stats.byCategory.reduce((a, c) => a + c.exercise_count, 0)
                    const pct = total > 0 ? Math.round((cat.exercise_count / total) * 100) : 0
                    const colors: Record<string, string> = {
                        Musculation: '#6366F1', Cardio: '#F59E0B', Flexibilité: '#10B981',
                     } 
                    const color = colors[cat.category] ?? '#94A3B8'
                    return (
                        <div key={cat.category} className="flex items-center gap-3">
                            <div className="w-24 shrink-0">
                                <span className="text-xs text-slate-400">{cat.category}</span>
                            </div>
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                {/*  LArgeur dynamique via style inline impossible avec Tailwind seul*/}
                                <div className="h-full rounded-full" style={{width:`${pct}%`, backgroundColor: color }} />
                            </div>
                            <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
                        </div>
                    )
                })}
            </div>
        </div>
    )}
</div>
 )   
}

//
//
//
//
function InfoItem({ icon, label, value}: {icon: React.ReactNode; label: string; value: React.ReactNode}){
    return (
        <div>
            <div  className="flex items-center gap-1.5 mb-1">{icon}<span className="text-xs text-slate-500"> {label}</span></div>
            <p className="text-sm font-semibold text-slate-200">{value}</p>
        </div>
    )
}