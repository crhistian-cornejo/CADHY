/**
 * Landing Layout
 *
 * Main layout for the landing page with navbar and footer.
 */

import { Outlet } from "react-router-dom"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"

export default function LandingLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
