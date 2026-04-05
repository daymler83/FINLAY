'use client'
import { useEffect } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { fetchJsonWithTimeout } from '@/lib/fetchJson'

interface User {
  id: string
  email: string
  nombre: string | null
  isPro: boolean
}

export function useAuth() {
  const { data, isLoading, mutate } = useSWR<{ user: User | null }>('/api/auth/me', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
    errorRetryCount: 0,
  })

  return {
    user: data?.user ?? null,
    isLoading,
    mutate,
  }
}

export function useRequireAuth() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [isLoading, user, router])

  return { user, isLoading }
}

async function fetcher(url: string): Promise<{ user: User | null }> {
  return fetchJsonWithTimeout<{ user: User | null }>(url)
}
