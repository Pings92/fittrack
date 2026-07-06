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

import { describe, it, expect, vi, beforeEach } from "vitest";
//
import { renderHook, waitFor } from "@testing-library/react";
import { useFetch } from "../hooks/useFetch";
import api from "../services/api";

//
//
vi.mock('../services/api', () => ({
    default: {
        get: vi.fn(),
    },
}))

//
const mockGet = vi.mocked(api.get)

describe('useFetch', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

        it('démarre en état de chargement (loading: true, data: null, error: null)', ()=> {
            //
            //
            mockGet.mockReturnValue(new Promise (()=> {}))

            const { result} = renderHook(() => useFetch<{items: number[]}>('/test'))

            //
            expect(result.current.loading).toBe(true)
            expect(result.current.data).toBeNull()
            expect(result.current.error).toBeNull()
            })

        it('retourne les données après un appel API réussi', async ()=> {
            const responseData = {items: [1, 2, 3] }
            //
            mockGet.mockResolvedValue({data: responseData})

            const { result} = renderHook(() => useFetch<{items: number[]}>('/test'))

            //
            //
            await waitFor(() => {
                expect(result.current.loading).toBe(false)
            })

            expect(result.current.data).toEqual(responseData)
            expect(result.current.error).toBeNull()
            //
            expect(mockGet).toHaveBeenCalledWith('/test')
        })

        it("retourne une erreur en cas d'échec de l'appel API", async ()=> {
            //
            mockGet.mockRejectedValue(new Error('Network error'))

            const { result} = renderHook(() => useFetch<unknown>('/test'))

            await waitFor(() => {
                expect(result.current.loading).toBe(false)
            })

            //
            expect(result.current.error).toBe('Impossible de charger les données')
            expect(result.current.data).toBeNull()    
        })

        it('refetch déclenche un nouvel appel API', async () => {
            mockGet.mockResolvedValue({data: { count: 1 }})

            const { result} = renderHook(() => useFetch<{count: number}>('/test'))

            await waitFor(() => {
                expect(result.current.loading).toBe(false)
            })
            
            //
            expect(mockGet).toHaveBeenCalledTimes(1)

            //
            result.current.refetch()

            //
            await waitFor(() => {
                expect(mockGet).toHaveBeenCalledTimes(2)
            })
        })

        it('remet loading a true lors du refetch', async () => {
            mockGet.mockResolvedValue({data: { count: 1 }})

            const { result} = renderHook(() => useFetch<{count: number}>('/test'))

            await waitFor(() => expect(result.current.loading).toBe(false))
        
            //
            mockGet.mockReturnValue(new Promise (() =>{}))

            result.current.refetch()

            //
            await waitFor(() => expect(result.current.loading).toBe(true) )
        })

        it('appelle api.get avec la bonne URL', async () => {
            mockGet.mockResolvedValue({data: {} })

            renderHook(() => useFetch('/stats/progression'))

            await waitFor(() => {
                expect(mockGet).toHaveBeenCalledWith('/stats/progression')
            })
        })
    })