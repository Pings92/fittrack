//
//
//
//
//
//
//

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from "react-router-dom"
import Register from "../pages/Register"
import { AuthContext, AuthContextType } from "../context/AuthContext"

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
    return {...actual, useNavigate: () => mockNavigate}
})

vi.mock('react-hot-toast', () => ({
    default: { error: vi.fn(), success: vi.fn() },
}))

const mockRegister = vi.fn()

const makeAuthContext = (overrides: Partial<AuthContextType>={}): AuthContextType => ({
    user:null,
    loading:false,
    login: vi.fn(),
    register: mockRegister,
    logout: vi.fn(),
    ...overrides,
})

const renderRegister = (ctx= makeAuthContext()) =>
    render(
        <AuthContext.Provider value={ctx}>
            <MemoryRouter>
                <Register />
            </MemoryRouter>
        </AuthContext.Provider>
    )

    describe('Register', () => {
        beforeEach(() => {
            vi.clearAllMocks()
        })

        it('affiche tous les champs du formulaire', () => {
            renderRegister()
            
            //
            expect(screen.getByPlaceholderText('johndoe')).toBeInTheDocument()
            expect(screen.getByPlaceholderText('ton@email.com')).toBeInTheDocument()
            expect(screen.getByPlaceholderText('6 caractères minimum')).toBeInTheDocument()
            expect(screen.getByRole('button', {name: /créer mon compte/i})).toBeInTheDocument()
        })

        it("affiche le sélecteur d'objectif avalac la valeur par défaut", () => {
            renderRegister()

            //
            //
            expect(screen.getByDisplayValue('Maintenir')).toBeInTheDocument()
        })

        it("Contient les 3 options d'objectifs", () => {
            renderRegister()
            
            //
            expect(screen.getByRole('option', {name: 'Perdre'})).toBeInTheDocument()
            expect(screen.getByRole('option', {name: 'Maintenir'})).toBeInTheDocument()
            expect(screen.getByRole('option', {name: 'Prendre'})).toBeInTheDocument()
        })

        it("Appele register avec les données correctes", async () => {
            const user = userEvent.setup()
            mockRegister.mockResolvedValue(undefined)
            renderRegister()
            
            await user.type(screen.getByPlaceholderText('johndoe'), 'testuser')
            await user.type(screen.getByPlaceholderText('ton@email.com'), 'test@example.com')
            await user.type(screen.getByPlaceholderText('6 caractères minimum'), 'password123')
            await user.click(screen.getByRole('button', {name: /créer mon compte/i}))

            await waitFor(()=> {
                //
                //
                expect(mockRegister).toHaveBeenCalledWith(
                    expect.objectContaining({
                        username: 'testuser',
                        email: 'test@example.com',
                        password: 'password123',
                        goal: 'maintain',
                    })
                )
            })
        })

        it("redirige vers /dashboard après inscription réussie", async () => {
            const user = userEvent.setup()
            mockRegister.mockResolvedValue(undefined)
            renderRegister()
            
            await user.type(screen.getByPlaceholderText('johndoe'), 'testuser')
            await user.type(screen.getByPlaceholderText('ton@email.com'), 'test@example.com')
            await user.type(screen.getByPlaceholderText('6 caractères minimum'), 'password123')
            await user.click(screen.getByRole('button', {name: /créer mon compte/i}))

            await waitFor(()=> {
                expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
            })
        })
        
        it('affiche un lien vers la page de connexion', () => {
            renderRegister()

            expect(screen.getByRole('link', { name: /se connecter/i })).toBeInTheDocument()
        })
        
        it("affiche une erreur toast en cas d'échec d'inscription", async () => {
            const toast = (await import('react-hot-toast')).default
            const user = userEvent.setup()
            //
            mockRegister.mockRejectedValue({ response: {data: {error: 'Email already in use'} } })
            renderRegister()
        
            await user.type(screen.getByPlaceholderText('johndoe'), 'testuser')
            await user.type(screen.getByPlaceholderText('ton@email.com'), 'test@example.com')
            await user.type(screen.getByPlaceholderText('6 caractères minimum'), 'password123')
            await user.click(screen.getByRole('button', {name: /créer mon compte/i}))

            await waitFor(()=> {
                expect(toast.error).toHaveBeenCalled()
            })
        })
})