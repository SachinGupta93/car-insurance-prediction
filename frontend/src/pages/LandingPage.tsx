import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Zap,
  Shield,
  Brain,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowRight,
  Car,
  FileText,
  BarChart3,
  Smartphone
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Brain className="w-8 h-8" />,
      title: "AI-Powered Analysis",
      description: "Advanced Gemini AI technology for accurate damage assessment",
      color: "from-purple-500 to-indigo-500"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Instant Results",
      description: "Get comprehensive damage reports in seconds, not hours",
      color: "from-amber-500 to-orange-500"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Insurance Ready",
      description: "Generate professional reports accepted by major insurers",
      color: "from-emerald-500 to-teal-500"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Detailed Analytics",
      description: "Visual damage mapping with precise cost estimations",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "24/7 Availability",
      description: "Access your analysis anytime, anywhere on any device",
      color: "from-rose-500 to-pink-500"
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Export Reports",
      description: "Download PDF reports or share analysis with stakeholders",
      color: "from-violet-500 to-purple-500"
    }
  ];

  const stats = [
    { value: "10K+", label: "Analyses Completed" },
    { value: "95%", label: "Accuracy Rate" },
    { value: "< 30s", label: "Average Time" },
    { value: "24/7", label: "Support" }
  ];

  const steps = [
    {
      number: "01",
      title: "Upload Image",
      description: "Take a photo or upload existing damage images",
      icon: <Smartphone className="w-6 h-6" />
    },
    {
      number: "02",
      title: "AI Analysis",
      description: "Our AI processes and identifies all damage areas",
      icon: <Brain className="w-6 h-6" />
    },
    {
      number: "03",
      title: "Get Report",
      description: "Receive detailed analysis with cost estimates",
      icon: <FileText className="w-6 h-6" />
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-300/20 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-300/20 rounded-full filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <Badge className="mb-6 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-none">
              <Sparkles className="w-4 h-4 mr-2 inline" />
              AI-Powered Insurance Technology
            </Badge>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 bg-clip-text text-transparent leading-tight">
              Car Damage Analysis
              <br />
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Made Simple
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-xl md:text-2xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              Leverage cutting-edge AI to assess vehicle damage instantly.
              Get professional insurance reports in seconds.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                onClick={() => navigate('/analyze')}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-6 text-lg group shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                Start Analysis
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="px-8 py-6 text-lg border-2 border-purple-600 text-purple-600 hover:bg-purple-50"
              >
                View Dashboard
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-sm text-slate-600 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900">
              Powerful Features
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Everything you need for comprehensive vehicle damage assessment
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-purple-200 hover:-translate-y-2"
              >
                <CardHeader>
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.color} p-3 mb-4 text-white group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </div>
                  <CardTitle className="text-2xl mb-2">{feature.title}</CardTitle>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900">
              How It Works
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Get your damage analysis in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <Card className="text-center h-full hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <div className="relative">
                      <div className="text-6xl font-bold text-purple-100 mb-4">{step.number}</div>
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white shadow-lg">
                        {step.icon}
                      </div>
                    </div>
                    <CardTitle className="mt-8 mb-3 text-xl">{step.title}</CardTitle>
                    <CardDescription className="text-base">{step.description}</CardDescription>
                  </CardHeader>
                </Card>
                {/* Arrow between cards */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 z-10">
                    <ArrowRight className="w-8 h-8 text-purple-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-10 opacity-90 max-w-2xl mx-auto">
            Join thousands of users who trust our AI-powered analysis for accurate damage assessment
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/signup')}
            className="bg-white text-purple-600 hover:bg-slate-100 px-10 py-6 text-lg shadow-xl hover:shadow-2xl group"
          >
            Create Free Account
            <Sparkles className="ml-2 w-5 h-5 group-hover:rotate-12 transition-transform" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-slate-900 text-white/70">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Car className="w-6 h-6 mr-2" />
            <span className="text-xl font-bold text-white">CarDamage AI</span>
          </div>
          <p className="text-sm">© 2025 CarDamage AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
