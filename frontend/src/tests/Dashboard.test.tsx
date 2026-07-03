//
//
//
//
//
//
//
//
//

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from '../pages/Dashboard'
import { AuthContext, AuthContextType } from '../context/AuthContext'
import { ProgressionStats, User } from '../types'
import api from '../services/api'

//
vi.mock('../services/api' () => ({
    default: {get: vi.fn()},
}))

//
//
//
//
vi.mock('recharts', () => ({
    BarChart: ({ children}: {children: React.ReactNode }) => (
        <div data-testid="bar-chart">{children}</div>
    ),
    Bar: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    ResponsiveContainer: ({ children}:{children:React.ReactNode }) => (
        <div data-testid="bar-chart">{children}</div>
    ),
    CartesianGrid: () => null,
}))

const mockGet = vi.mocked(api.get)

const mockUser: User = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    weight: 75,
    goal: 'maintain',
    created_at: '2024-01-01T00:00:00.000Z',
}

//
const mockStats: ProgressionStats = {
    user: { username: 'testuser', weight: 75, goal: 'maintain', member_since:'2024-01-01'},
    stats: {
        summary:{
            total_workouts:12,
            total_minutes: 720,
            avg_duration: 45,
            unique_exercises: 9,
        },
         monthly: [
            { month: '2024-01', workout_count: 4, total_minutes: 240},
            { month: '2024-02', workout_count: 8, total_minutes: 480},
         ] ,
        byCategory: [
            {category: 'Musculation', exercise_count: 8, total_reps: 320},
        ],
        recent: [
            {id:1, title: 'Séance du lundi', date:'2024-01-15', duration:90,},
        ],
    },
}

const makeAuthContext = ( overrides: Partial<AuthContextType> = {}) : AuthContextType => ({
    user: mockUser,
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    ...overrides,
})

const renderDashboard = (ctx = makeAuthContext()) =>
    render(
        <AuthContext.Provider value={ctx}>
            {/*  */}
            <MemoryRouter>
                <Dashboard/>
            </MemoryRouter>
        </AuthContext.Provider>
    )

    describe('Dashboard', () => {
        beforeEach(() =>{
            vi.clearAllMocks()
        })

        it('affiche le spinner pendant le chargement', () => {
            //
            mockGet.mockReturnValue(new Promise(()=> {}))
            renderDashboard()

            // le spinner
            const spinner = document.querySelector('.animate-spin')
            expect(spinner).toBeInTheDocument()
        })

            it("affiche le message de bienvenue avec le nom d'utilisateur", async () => {
            mockGet.mockResolvedValue({data: mockStats})
            renderDashboard()

            //waitfor
            await waitFor(() => {
                //
                expect(screen.getByText(/bonjour, testuser/i)).toBeInTheDocument()
            })
        })

            it('affiche les 4 cards de statistiques avec les bonnes valeurs', async () => {
                mockGet.mockResolvedValue({ data: mockStats })
                renderDashboard()

                // On attend que le premier élément soit visible avant de vérifier les valeurs
                await waitFor(() => {
                    expect(screen.getByText('Séances totales')).toBeInTheDocument()
                    expect(screen.getByText("Minutes d'entraînement")).toBeInTheDocument()
                    expect(screen.getByText('Durée moyenne')).toBeInTheDocument()
                    expect(screen.getByText('Exercices différents')).toBeInTheDocument()
                })

                // 
                expect(screen.getByText('12')).toBeInTheDocument()  
                expect(screen.getByText('720')).toBeInTheDocument() 
                expect(screen.getByText('45 min')).toBeInTheDocument() 
                expect(screen.getByText('9')).toBeInTheDocument()  
            })

            it('affiche les dernières séances', async () =>{
                mockGet.mockResolvedValue({data:mockStats })
                renderDashboard()

                await waitFor() => {
                    //
                    expect(screen.getByText('Séance du lundi')).toBeInTheDocument()
                })
            })
            
            it("affiche 0 pour les stats quand il n'y a pas de données", async () => {
                //
                const emptyStats: ProgressionStats = {
                    ...mockStats, 
                    stats: {
                        ...mockStats.stats,
                        summary: { total_workouts: 0, total_minutes: 0, avg_duration: 0, unique_exercises: 0},
                        recent: [],
                        byCategory: [],
                    },
                }
                mockGet.mockResolvedValue({ data: emptyStats })
                renderDashboard()

                await waitFor(() => {
                    //
                    expect(screen.getByText('Aucune séance.')).toBeInTheDocument()
                })
            })

            it("affiche l'objectif de l'utilisateur", async () => {
                mockGet.mockResolvedValue({data: MockStats})
                renderDashboard()

                await waitFor(() => {
                    //
                    expect(screen.getByText(/Maintien du poids)).toBeInTheDocument()
                })
            })
        })
