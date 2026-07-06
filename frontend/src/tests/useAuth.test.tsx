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

import { describe, it, expect, vi } from "vitest"
//
import { renderHook } from "@testing-library/react"
import React from "react"
import { useAuth } from "../hooks/useAuth"
import { AuthContext, AuthContextType } from "../context/AuthContext"
import { User } from "../types"

const mockUser: User = {
    id:1,
    username:'testuser',
    email:'test@example.com',
    weight: 75,
    goal:'maintain',
    created_at: '2024-01-01T00:00:00.000Z'
}

const makeAuthContext = (overrides: Partial<AuthContextType>={}): AuthContextType => ({
    user: mockUser,
    loading:false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    ...overrides,
})

describe('useAuth', () => {

    it('lève une erreur szi utilisé en dehors de AuthProvider', () => {
        //
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        //
        expect(() => renderHook(()=> useAuth())).toThrow(
            'useAuth must be used within AuthProvider'
        )

        consoleSpy.mockRestore() //
    })

    it('retourne les valeurs du contexte depuis AuthProvider', () => {
        const ctx = makeAuthContext()

        //
        const wrapper = ({ children }: {children: React.ReactNode }) => (
            <AuthContext.Provider value={ctx}>{ children }</AuthContext.Provider>
        )

        // 
        const { result } =renderHook(() => useAuth(), {wrapper})

        //
        expect(result.current.user).toEqual(mockUser)
        expect(result.current.loading).toBe(false)
        //
        expect(typeof result.current.login).toBe('function')
        expect(typeof result.current.logout).toBe('function')
        expect(typeof result.current.register).toBe('function')
    })

    it('retourne user null si non connecté', () => {
        const ctx = makeAuthContext({ user: null })
        const wrapper = ({ children }: {children: React.ReactNode }) => (
            <AuthContext.Provider value={ctx}>{ children }</AuthContext.Provider>
        )

        const { result } =renderHook(() => useAuth(), {wrapper})

        expect(result.current.user).toBeNull()
    })

    it('retourne loading:true pendant le chargement', () => {
        const ctx = makeAuthContext({ loading : true })
        const wrapper = ({ children }: {children: React.ReactNode }) => (
            <AuthContext.Provider value={ctx}>{ children }</AuthContext.Provider>
        )

        const { result } =renderHook(() => useAuth(), {wrapper})

        expect(result.current.loading).toBe(true)
    })

        it('expose les fonctions login, logut, register', ()=> {
            //
            const login= vi.fn()
            const logout= vi.fn()
            const register= vi.fn()
            const ctx = makeAuthContext({ login, logout, register })
            const wrapper = ({ children }: {children: React.ReactNode }) => (
                <AuthContext.Provider value={ctx}>{ children }</AuthContext.Provider>
            )

        const { result } =renderHook(() => useAuth(), {wrapper})

        //
        expect(result.current.login).toBe(login)
        expect(result.current.logout).toBe(logout)
        expect(result.current.register).toBe(register)
        })
})
