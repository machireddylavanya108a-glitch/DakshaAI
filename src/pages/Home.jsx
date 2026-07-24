import HeroSection from '../components/HeroSection'
import FeatureFlow from '../components/FeatureFlow'
import Footer from '../components/Footer/Footer'
import useLenis from '../hooks/useLenis'

export default function Home() {
  useLenis()

  return (
    <div className="relative overflow-hidden bg-[#020617] text-white">
      <HeroSection />
      <FeatureFlow />
      <Footer />
    </div>
  )
}
