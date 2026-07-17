import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import Dashboard from './pages/Dashboard'
import Editor from './pages/Editor'
import Landing from './pages/Landing'
import Result from './pages/Result'
import { UploadProvider } from './store/uploads'

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
      <UploadProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/result" element={<Result />} />
        </Routes>
      </UploadProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
