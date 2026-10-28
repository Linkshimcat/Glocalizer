import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../store/AuthContext'

/** 설정 페이지 카드가 로그인 토큰으로 서버 데이터를 한 번 불러오고, 실패하면 다시 시도할 수 있게 하는 훅. load는 모듈 수준 함수를 넘긴다. */
export function useAccountResource<T>(load: (token: string) => Promise<T>) {
  const { token } = useAuth()
  const [data, setData] = useState<T | null>(null)
  const [failed, setFailed] = useState(false)

  const reload = useCallback(async () => {
    if (!token) return
    setFailed(false)
    try {
      setData(await load(token))
    } catch {
      setFailed(true)
    }
  }, [token, load])

  useEffect(() => { void reload() }, [reload])

  return { data, failed, reload }
}
