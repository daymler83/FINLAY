'use client'
import { useEffect } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface User {
  id: string
  email: string
  nombre: string | null
  isPro: boolean
}

export function useAuth() {
  const { data, isLoading, mutate } = useSWR<{ user: User | null }>('/api/auth/me', fetcher, {
    revalidateOnFocus: false,
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
