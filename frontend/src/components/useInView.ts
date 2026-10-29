import { useEffect, useRef, useState } from 'react'

/**
 * 요소가 화면 근처(rootMargin)에 처음 들어오면 true가 되고, 그 뒤로는 계속 true다.
 * 화면 아래쪽 카드가 보이기 직전에만 데이터를 불러오게 할 때 쓴다. IntersectionObserver가 없으면 바로 true.
 */
export function useInViewOnce<T extends Element>(rootMargin = '200px') {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    if (inView || !ref.current) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setInView(true)
        observer.disconnect()
      }
    }, { rootMargin })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [inView, rootMargin])

  return [ref, inView] as const
}
