import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  Sprout, TrendingUp, Camera, Users, ShieldCheck, Languages, Layers,
  ArrowRight, Mail,
} from 'lucide-react'
import { GlowEffect } from '../../components/core/glow-effect'

// Real, non-AI-generated photography (Pexels, free to use) — genuine Indian
// farmer/mandi photos, not stock illustrations or generated imagery.
const HERO_IMG = 'https://images.pexels.com/photos/28678642/pexels-photo-28678642.jpeg?auto=compress&cs=tinysrgb&w=1600'
const MARKET_IMG = 'https://images.pexels.com/photos/6476384/pexels-photo-6476384.jpeg?auto=compress&cs=tinysrgb&w=1200'
const PRODUCE_IMG = 'https://images.pexels.com/photos/39206252/pexels-photo-39206252.jpeg?auto=compress&cs=tinysrgb&w=1200'

const FEATURES = [
  { icon: TrendingUp, title: 'Live Price Intelligence', desc: 'Real mandi prices pulled every night, with an ML-trained sell-or-hold forecast.', color: 'gold' },
  { icon: Camera, title: 'Auto-Graded, Geotagged Lots', desc: 'Snap a photo — grading and GPS location are captured automatically.', color: 'green' },
  { icon: Users, title: 'Direct Buyer Matching', desc: 'Negotiate directly with buyers and processors — no middlemen in between.', color: 'gold' },
  { icon: ShieldCheck, title: 'Tamper-Evident Payments', desc: 'Every payment is hash-chained and anchored to Bitcoin — verifiable, not just promised.', color: 'green' },
  { icon: Languages, title: 'Speak Your Language', desc: 'Marathi, Hindi or English — type it or speak it, the app understands.', color: 'gold' },
  { icon: Layers, title: 'FPO Pooling', desc: 'Small farmers pool lots together through their FPO for stronger bulk pricing.', color: 'green' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-white/95 backdrop-blur border-b-2 border-primary-100 px-5 py-3 lg:px-10">
        <div className="flex items-center gap-2">
          <div className="bg-primary-600 text-white rounded-xl p-1.5">
            <Sprout size={22} />
          </div>
          <span className="text-lg font-bold text-primary-800">AgriSphere</span>
        </div>
        <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-gray-600">
          <a href="#home" className="hover:text-primary-700">Home</a>
          <a href="#demo" className="hover:text-primary-700">Demo</a>
          <a href="#support" className="hover:text-primary-700">Support</a>
        </nav>
        <Link
          to="/login"
          className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          Login / Sign up
        </Link>
      </header>

      {/* Hero */}
      <section id="home" className="relative overflow-hidden">
        <div
          className="relative bg-cover bg-center min-h-[440px] lg:min-h-[520px] flex items-center"
          style={{ backgroundImage: `url(${HERO_IMG})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/20" />
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="relative z-10 max-w-lg lg:max-w-2xl px-6 lg:px-14 text-white"
          >
            <p className="text-gold-500 text-sm font-semibold tracking-wide uppercase mb-3">Farm-to-market, made fair</p>
            <h1 className="text-3xl lg:text-5xl font-extrabold leading-tight mb-4">
              Know the real price. <br className="hidden lg:block" />Sell on your own terms.
            </h1>
            <p className="text-gray-200 text-base lg:text-lg mb-7 max-w-md">
              Live mandi prices, ML forecasts, and direct buyer access — built for Indian farmers, in their own language.
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="relative group">
                <GlowEffect
                  colors={['#3c7f20', '#b8860b', '#4c9a2a', '#c9972e']}
                  mode="colorShift"
                  blur="medium"
                  duration={4}
                  className="rounded-2xl opacity-0 group-hover:opacity-80 transition-opacity duration-300"
                />
                <Link
                  to="/login"
                  className="relative flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-white font-semibold px-6 py-3.5 rounded-2xl transition"
                >
                  Get Started <ArrowRight size={18} />
                </Link>
              </div>
              <a
                href="#demo"
                className="flex items-center gap-2 border-2 border-white/70 text-white font-semibold px-6 py-3.5 rounded-2xl hover:bg-white/10 transition"
              >
                See how it works
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Intro strip */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeUp}
        className="max-w-4xl mx-auto px-6 py-12 text-center"
      >
        <p className="text-gray-600 text-base lg:text-lg leading-relaxed">
          AgriSphere connects farmers directly to buyers with a live, real-data price dashboard —
          no guesswork, no unnecessary middlemen. Our price model retrains itself every night on
          fresh government mandi data, so what you see is never stale.
        </p>
        <div className="grid grid-cols-3 gap-4 mt-8 max-w-lg mx-auto">
          <div>
            <p className="text-2xl font-bold text-primary-700">15</p>
            <p className="text-xs text-gray-500 mt-1">Crops tracked</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gold-700">3</p>
            <p className="text-xs text-gray-500 mt-1">Languages supported</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary-700">Nightly</p>
            <p className="text-xs text-gray-500 mt-1">Live price updates</p>
          </div>
        </div>
      </motion.section>

      {/* How we can help */}
      <section className="max-w-5xl mx-auto px-6 py-10">
        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={fadeUp}
          className="text-center text-2xl font-bold text-primary-800 mb-10"
        >
          How AgriSphere Helps
        </motion.p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            const gold = f.color === 'gold'
            return (
              <motion.div
                key={f.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={fadeUp}
                transition={{ delay: (i % 3) * 0.08 }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${gold ? 'bg-gold-100' : 'bg-primary-100'}`}>
                  <Icon size={20} className={gold ? 'text-gold-700' : 'text-primary-700'} />
                </div>
                <p className="font-semibold text-primary-800 mb-1">{f.title}</p>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Demo / see it in action */}
      <section id="demo" className="bg-white py-14">
        <div className="max-w-5xl mx-auto px-6">
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            className="text-center text-2xl font-bold text-primary-800 mb-2"
          >
            See it in action
          </motion.p>
          <p className="text-center text-sm text-gray-500 mb-10">A real price dashboard, updated every night from live government data.</p>

          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeUp}
              className="rounded-2xl overflow-hidden shadow-md"
            >
              <img src={MARKET_IMG} alt="Farmer selling fresh produce at a mandi" className="w-full h-64 object-cover" />
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeUp}
              className="bg-cream rounded-2xl p-5 border-2 border-primary-100"
            >
              <div className="bg-primary-600 text-white rounded-xl px-4 py-3 mb-3 text-center">
                <p className="text-sm font-semibold">Hold — prices rising this week</p>
              </div>
              <svg width="100%" height="60" viewBox="0 0 300 60">
                <polyline points="0,45 40,38 80,42 120,20 160,28 200,10 240,16 280,4" fill="none" stroke="#b8860b" strokeWidth="3" />
              </svg>
              <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                <span>Onion · Nashik mandi</span>
                <span className="font-semibold text-primary-700">+4.2% this week</span>
              </div>
              <div className="flex items-center gap-2 mt-4 bg-white rounded-xl p-3">
                <div className="w-8 h-8 rounded-lg bg-gold-100 flex items-center justify-center">
                  <Camera size={15} className="text-gold-700" />
                </div>
                <span className="text-xs font-medium text-gray-700">Grade A · Geotagged automatically</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Produce strip */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeUp}
        className="relative h-56 lg:h-72 bg-cover bg-center"
        style={{ backgroundImage: `url(${PRODUCE_IMG})` }}
      >
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <p className="text-white text-xl lg:text-2xl font-bold text-center px-6">
            Real produce. Real prices. Real fairness.
          </p>
        </div>
      </motion.section>

      {/* Support */}
      <section id="support" className="max-w-2xl mx-auto px-6 py-16 text-center">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} variants={fadeUp}>
          <div className="bg-primary-100 text-primary-700 rounded-full p-3 w-fit mx-auto mb-4">
            <Mail size={22} />
          </div>
          <p className="text-xl font-bold text-primary-800 mb-2">We're here to help</p>
          <p className="text-sm text-gray-500 mb-6">
            Questions about AgriSphere, or need help getting started? Reach out and our team will get back to you.
          </p>
          <a
            href="mailto:support@agrisphere.app"
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-xl transition"
          >
            <Mail size={16} /> Contact Support
          </a>
        </motion.div>
      </section>

      <footer className="border-t border-primary-100 py-6 text-center text-xs text-gray-400">
        © 2026 AgriSphere · SIH26132
      </footer>
    </div>
  )
}
