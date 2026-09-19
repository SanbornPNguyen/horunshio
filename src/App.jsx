import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import Home from './pages/Home.jsx'
import Submit from './pages/Submit.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import Compare from './pages/Compare.jsx'
import Events from './pages/Events.jsx'
import Event from './pages/Event.jsx'
import Predict from './pages/Predict.jsx'
import YearReview from './pages/YearReview.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/r/:slug" element={<Home />} />
        <Route path="/r/:slug/:year" element={<YearReview />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:event" element={<Event />} />
        <Route path="/predict" element={<Predict />} />
        <Route path="/submit" element={<Submit />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/compare" element={<Compare />} />
      </Routes>
      <Analytics />
    </BrowserRouter>
  )
}
