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
//
//

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
// 
import { MemoryRouter } from 'react-router-dom'
import Login from '../pages/Login'
import { AuthContext, AuthContextType } from '../context/AuthContext'

//
//
//
//
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

//
//
vi.mock('react-hot-toast', () => ({
    default: {error:vi.fn(), success:vi.fn() },
}))

//
const mockLogin = vi.fn()

// 
// 
const makeAuthContext = (overrides: Partial<AuthContextType> = {}): AuthContextType => ({
  user: null,
  loading: false,
  login: mockLogin,
  register: vi.fn(),
  logout: vi.fn(),
  ...overrides,
})

// 
// 
const renderLogin = (ctx = makeAuthContext()) =>
  render(
    <AuthContext.Provider value={ctx}>
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </AuthContext.Provider>
  )

describe('Login', () => {
  // 
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 
  it('affiche le formulaire avec les champs email et mot de passe', () => {
    renderLogin()

    // 
    // 
    expect(screen.getByPlaceholderText('ton@email.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('******')).toBeInTheDocument()
    // 
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument()
    // 
  })

  it("affiche un lien vers la page d'inscription", () => {
    renderLogin()

    expect(screen.getByRole('link', { name: /s'inscrire/i })).toBeInTheDocument()
  })

  //  
  it('appelle login avec les bons identifiants à la soumission', async () => {
    // 
    const user = userEvent.setup()
    mockLogin.mockResolvedValue(undefined) // 

    renderLogin()

    // 
    await user.type(screen.getByPlaceholderText('ton@email.com'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('******'), 'password123')
    await user.click(screen.getByRole('button', { name: /se connecter/i }))

    // 
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })

  it('redirige vers /dashboard après connexion réussie', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValue(undefined)
    renderLogin()

    await user.type(screen.getByPlaceholderText('ton@email.com'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('******'), 'password123')
    await user.click(screen.getByRole('button', { name: /se connecter/i }))

    await waitFor(() => {
      // 
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it("affiche une erreur toast en cas d'échec de connexion", async () => {
    // 
    const toast = (await import('react-hot-toast')).default
    const user = userEvent.setup()
    // 
    mockLogin.mockRejectedValue({ response: { data: { error: 'Invalid credentials.' } } })
    renderLogin()

    await user.type(screen.getByPlaceholderText('ton@email.com'), 'bad@example.com')
    await user.type(screen.getByPlaceholderText('******'), 'wrongpass')
    await user.click(screen.getByRole('button', { name: /se connecter/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })
  })

  it('désactive le bouton pendant le chargement', async () => {
    const user = userEvent.setup()
    // 
    mockLogin.mockImplementation(() => new Promise(() => {}))
    renderLogin()

    await user.type(screen.getByPlaceholderText('ton@email.com'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('******'), 'password123')
    await user.click(screen.getByRole('button', { name: /se connecter/i }))

    await waitFor(() => {
      //
      expect(screen.getByRole('button', { name: /connexion\.\.\./i })).toBeDisabled()
    })
  })
})