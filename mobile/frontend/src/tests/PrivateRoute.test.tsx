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

import { describe, it , expect, vi } from "vitest";
import {render, screen } from '@testing-library/react'
//
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PrivateRoute from "../components/PrivateRoute";
import { AuthContext, AuthContextType } from "../context/AuthContext";
import { User } from "../types";

const mockUser: User = {
    id:1,
    username:'testuser',
    email:'test@example.com',
    weight: null,
    goal:'maintain',
    created_at: '2024-01-01T00:00:00.000Z'
}

const makeAuthContext = (overrides: Partial<AuthContextType>={}) : AuthContextType =>({
    user:null,
    loading:false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    ...overrides,
})

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
const renderWithRoutes = (ctx: AuthContextType, initialPath = '/dashboard') =>
    render(
        <AuthContext.Provider value={ctx}>
            <MemoryRouter initialEntries={[initialPath]}>
                <Routes>
                    {/*  */}
                    <Route element={<PrivateRoute />}>
                        <Route path="/dashboard" element={<div>Contenu Dashboard</div>} />
                    </Route>
                    <Route path="/login" element={<div>Page Login</div>}/>
                </Routes>
            </MemoryRouter>
        </AuthContext.Provider>
    )
    
    describe('PrivateRoute', () => {
        it('affiche le spinner pendant le chargement initial', () => {
            //
            renderWithRoutes(makeAuthContext({loading:true}))

            //
            const spinner = document.querySelector('.animate-spin')
            expect(spinner).toBeInTheDocument()
        })

        it('redirige vers /login si non connecté', () => {
            //
            renderWithRoutes(makeAuthContext({user:null, loading:false}))
        
            //
            expect(screen.getByText('Page Login')).toBeInTheDocument()
            //
            expect(screen.queryByText('Contenu Dashboard')).not.toBeInTheDocument()
        })

        it('affiche le contenu protégé si connecté', () => {
            //
            renderWithRoutes(makeAuthContext({user:mockUser, loading:false}))
        
            expect(screen.getByText('Contenu Dashboard')).toBeInTheDocument()
            expect(screen.queryByText('Page Login')).not.toBeInTheDocument()
        })

        it('n"affiche pas le contenu pendant le chargement', () => {
            //
            renderWithRoutes(makeAuthContext({loading:true, user:mockUser}))
        
            expect(screen.queryByText('Contenu Dashboard')).not.toBeInTheDocument()
        })
    })