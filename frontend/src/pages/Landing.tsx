import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Shield, MapPin, Users, Zap, ArrowRight, CheckCircle2, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/theme'

export default function Landing() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  const features = [
    {
      icon: Shield,
      title: 'Smart Safety Routing',
      description: 'AI-powered routes that prioritize your safety with real-time risk assessment'
    },
    {
      icon: MapPin,
      title: 'Live Location Tracking',
      description: 'Share your journey with trusted contacts for peace of mind'
    },
    {
      icon: Zap,
      title: 'Instant Alerts',
      description: 'Get notified of potential hazards and route changes in real-time'
    },
    {
      icon: Users,
      title: 'Guardian Network',
      description: 'Emergency SOS system with live guardian dashboard'
    }
  ]

  const benefits = [
    'Multiple routing modes (Safe, Balanced, Stealth, Escort)',
    'Real-time hazard detection and monitoring',
    'Emergency SOS with location sharing',
    'Beautiful, intuitive interface',
    'Privacy-focused design',
    'Works across the globe'
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="bg-orange-600 p-2 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">SafeTrace X</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                ) : (
                  <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                )}
              </button>
              <Button variant="ghost" onClick={() => navigate('/login')}>
                Sign In
              </Button>
              <Button onClick={() => navigate('/signup')}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-block">
                  <span className="bg-orange-100 text-orange-800 text-sm font-semibold px-4 py-1.5 rounded-full">
                    Your Intelligent Safety Companion
                  </span>
                </div>
                <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
                  Navigate Safely,
                  <span className="text-orange-600 dark:text-orange-500"> Anywhere</span>
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                  Advanced AI-powered routing that keeps you safe. Real-time hazard detection, 
                  emergency SOS, and intelligent path planning—all in one app.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="text-lg px-8"
                  onClick={() => navigate('/signup')}
                >
                  Start Your Journey
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-8"
                  onClick={() => navigate('/login')}
                >
                  Sign In
                </Button>
              </div>
              <div className="flex items-center space-x-8 pt-4">
                <div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">100K+</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Safe Routes</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">50K+</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Active Users</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">4.9★</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">User Rating</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=800&h=800&fit=crop&q=80" 
                  alt="Digital Navigation Map"
                  className="w-full h-full object-cover aspect-square"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-orange-600/30 via-transparent to-transparent dark:from-orange-900/50"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Powerful Features for Your Safety
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Everything you need to travel safely and confidently, powered by cutting-edge technology
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-500 hover:shadow-lg transition-all duration-300 bg-white dark:bg-gray-900"
              >
                <div className="bg-orange-100 dark:bg-orange-900/30 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-orange-600 dark:text-orange-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white">
                Why Choose SafeTrace X?
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                We've built the most comprehensive safety routing platform with features 
                designed specifically for modern travelers who prioritize security.
              </p>
              <div className="grid gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <CheckCircle2 className="w-6 h-6 text-orange-600 dark:text-orange-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{benefit}</span>
                  </div>
                ))}
              </div>
              <Button 
                size="lg"
                className="mt-4"
                onClick={() => navigate('/signup')}
              >
                Get Started Now
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/20 dark:to-gray-800 rounded-2xl p-8 border border-orange-200 dark:border-orange-900/50">
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                        <Shield className="w-5 h-5 text-green-600 dark:text-green-500" />
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">Safe Route Active</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Monitoring your journey in real-time
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                        <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">Location Shared</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      3 guardians are watching your journey
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-full">
                        <Zap className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">All Clear</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      No hazards detected on your route
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-orange-600 to-orange-700 dark:from-orange-800 dark:to-orange-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Travel Safer?
          </h2>
          <p className="text-xl text-orange-100 mb-8">
            Join thousands of users who trust SafeTrace X for their daily journeys
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              variant="outline"
              className="bg-white text-orange-600 hover:bg-orange-50 border-0 text-lg px-8"
              onClick={() => navigate('/signup')}
            >
              Create Free Account
            </Button>
            <Button 
              size="lg"
              className="bg-orange-800 hover:bg-orange-900 text-white text-lg px-8"
              onClick={() => navigate('/login')}
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-gray-400 dark:text-gray-500 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="bg-orange-600 p-2 rounded-lg">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">SafeTrace X</span>
              </div>
              <p className="text-sm">
                Your intelligent safety companion for navigating the world confidently.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-orange-400">Features</a></li>
                <li><a href="#" className="hover:text-orange-400">Pricing</a></li>
                <li><a href="#" className="hover:text-orange-400">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-orange-400">About</a></li>
                <li><a href="#" className="hover:text-orange-400">Blog</a></li>
                <li><a href="#" className="hover:text-orange-400">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-orange-400">Privacy</a></li>
                <li><a href="#" className="hover:text-orange-400">Terms</a></li>
                <li><a href="#" className="hover:text-orange-400">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2025 SafeTrace X. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
