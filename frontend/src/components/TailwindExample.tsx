import { useState } from 'react'

function TailwindExample() {
  const [count, setCount] = useState(0)

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900">Glocalizer</h1>
        <p className="mt-2 text-gray-600">
          Tailwind CSS가 정상 동작하면 이 카드가 스타일링되어 보여요.
        </p>
        <button
          type="button"
          onClick={() => setCount((c) => c + 1)}
          className="mt-6 rounded-lg bg-violet-600 px-4 py-2 font-medium text-white transition hover:bg-violet-700"
        >
          클릭 횟수: {count}
        </button>
      </div>
    </main>
  )
}

export default TailwindExample
