import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaSearch, 
  FaFileAlt, 
  FaWrench, 
  FaBook, 
  FaHeadset, 
  FaTools, 
  FaShieldAlt, 
  FaExclamationTriangle, 
  FaCar, 
  FaCloudSun, 
  FaPaw, 
  FaFire, 
  FaHammer,
  FaArrowRight,
  FaStar,
  FaClock,
  FaCalendar,
  FaBookOpen,
  FaHistory
} from 'react-icons/fa';

interface Resource {
  id: string;
  title: string;
  description: string;
  link?: string; 
  icon?: string; // Name or class for icon (FontAwesome, etc.)
  category: 'insurance' | 'repair' | 'documentation' | 'support';
}

const ResourcesPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('insurance');

  // Handle hash navigation
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && categorizedResources[hash]) {
      setActiveSection(hash);
      const element = document.getElementById(hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, []);

  const handleNavClick = (sectionId: string) => {
    if (categorizedResources[sectionId]) {
    setActiveSection(sectionId);
    window.location.hash = sectionId;
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };
  // Actual resources data
  const resources: Resource[] = [
    {
      id: '1',
      title: 'Insurance Claim Process',
      description: 'Step-by-step guide to filing an insurance claim after car damage detection.',
      link: '/resources/insurance-claim-process',
      icon: 'document',
      category: 'insurance',
    },
    {
      id: '2',
      title: 'Certified Repair Network',
      description: 'Find trusted repair shops in your area that specialize in your damage type.',
      link: '/resources/repair-network',
      icon: 'wrench',
      category: 'repair',
    },
    {
      id: '3',
      title: 'Damage Assessment Guide',
      description: 'Comprehensive guide to understanding damage types, severity levels, and repair implications.',
      link: '/resources/damage-guide',
      icon: 'book',
      category: 'documentation',
    },
    {
      id: '4',
      title: 'Technical Support',
      description: 'Get help with using the application or understanding analysis results.',
      link: '/support',
      icon: 'headset',
      category: 'support',
    },
    {
      id: '5',
      title: 'Emergency Repair Procedures',
      description: 'Learn safe temporary fixes to prevent further damage before professional repair.',
      link: '/resources/emergency-repairs',
      icon: 'tools',
      category: 'repair',
    },
    {
      id: '6',
      title: 'Insurance Coverage Analysis',
      description: 'Understand what your insurance policy covers based on damage type and severity.',
      link: '/resources/coverage-analysis',
      icon: 'shield',
      category: 'insurance',
    },
    {
      id: '7',
      title: 'Vehicle Safety Assessment',
      description: 'Guidelines for determining if your vehicle is safe to drive after damage.',
      link: '/resources/safety-assessment',
      icon: 'shield',
      category: 'documentation',
    },
    {
      id: '8',
      title: 'Cost Estimation Factors',
      description: 'Learn what factors influence repair cost estimates for different damage types.',
      link: '/resources/cost-factors',
      icon: 'document',
      category: 'documentation',
    },
  ];
  const getIconClass = (iconName: string): React.ReactElement => {
    const iconMap: Record<string, React.ReactElement> = {
      document: <FaFileAlt className="text-blue-500" />,
      wrench: <FaWrench className="text-orange-500" />,
      book: <FaBook className="text-green-500" />,
      headset: <FaHeadset className="text-purple-500" />,
      tools: <FaTools className="text-yellow-500" />,
      shield: <FaShieldAlt className="text-blue-600" />,
    };
    
    return iconMap[iconName] || <FaFileAlt className="text-gray-500" />;
  };

  // Group resources by category
  const categorizedResources = resources.reduce((acc, resource) => {
    if (!acc[resource.category]) {
      acc[resource.category] = [];
    }
    acc[resource.category].push(resource);
    return acc;
  }, {} as Record<string, Resource[]>);
  
  // Category display names
  const categoryNames: Record<string, string> = {
    insurance: 'Insurance Resources',
    repair: 'Repair Resources',
    documentation: 'Documentation',
    support: 'Support',
  };

  // Latest updates data with actual information
  const latestUpdates = [
    {
      id: '1',
      title: 'Advanced Damage Detection',
      description: 'Improved AI model for detecting subtle paint damage, rust, and structural issues with higher accuracy',
      date: '2024-04-15',
      icon: FaCar
    },
    {
      id: '2',
      title: 'Multi-Region Cost Estimation',
      description: 'Added support for region-specific repair cost estimates based on local labor and parts pricing',
      date: '2024-04-10',
      icon: FaHammer
    },
    {
      id: '3',
      title: 'Insurance Provider API Integration',
      description: 'Direct integration with major insurance providers for streamlined claim submission',
      date: '2024-04-05',
      icon: FaShieldAlt
    },
    {
      id: '4',
      title: 'Enhanced Safety Assessment',
      description: 'New safety evaluation system that provides drivability recommendations based on damage severity',
      date: '2024-03-28',
      icon: FaExclamationTriangle
    },
    {
      id: '5',
      title: 'Damage History Tracking',
      description: 'New feature to track repair history and monitor recurring issues for the same vehicle',
      date: '2024-03-20',
      icon: FaHistory
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-16 h-16 bg-rose-200 rounded-2xl flex items-center justify-center">
              <FaBookOpen className="w-8 h-8 text-black" />
            </div>
            <h1 className="text-5xl font-bold text-black">
              Resources & Guides
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Access our comprehensive collection of guides, tutorials, and resources to help you make the most of CarGuard AI.
          </p>
          </div>
          
          {/* Resource Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {Object.entries(categorizedResources).map(([category, items]) => (
            <div
              key={category}
              className="bg-white rounded-xl border border-rose-200 p-6 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-12 h-12 bg-rose-200/50 rounded-xl flex items-center justify-center mb-4">
                {getIconClass(items[0]?.icon || 'document')}
              </div>
              <h3 className="text-xl font-bold text-black mb-2">{categoryNames[category] || category}</h3>
              <p className="text-gray-600 mb-4">{items[0]?.description || 'No description available'}</p>
              <Link
                to={`/resources/${category}`}
                className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Learn More
                <FaArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          ))}
            </div>

        {/* Featured Resources */}
        <div className="bg-white rounded-xl border border-rose-200 p-8 mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-rose-200/50 rounded-xl flex items-center justify-center">
              <FaStar className="w-6 h-6 text-black" />
            </div>
            <h2 className="text-2xl font-bold text-black">Featured Resources</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categorizedResources[activeSection]?.map((resource) => (
              <div
                key={resource.id}
                className="bg-white rounded-xl border border-rose-200 p-6 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-rose-200/50 rounded-lg flex items-center justify-center">
                    {getIconClass(resource.icon || 'document')}
                  </div>
                  <h3 className="font-bold text-black">{resource.title}</h3>
                </div>
                <p className="text-gray-600 mb-4">{resource.description}</p>
                {resource.link ? (
                  <Link
                    to={resource.link} // Now guaranteed to be a string if Link is rendered
                    className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Read More
                    <FaArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center text-gray-400 font-medium">
                    More details soon
                  </span>
                )}
                  </div>
                ))}
          </div>
          </div>
          
        {/* Latest Updates */}
        <div className="bg-white rounded-xl border border-rose-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-rose-200/50 rounded-xl flex items-center justify-center">
              <FaClock className="w-6 h-6 text-black" />
            </div>
            <h2 className="text-2xl font-bold text-black">Latest Updates</h2>
          </div>
          
          <div className="space-y-6">
            {latestUpdates.map((update) => (
              <div
                key={update.id}
                className="flex items-start gap-4 p-4 rounded-xl border border-rose-200 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-10 h-10 bg-rose-200/50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <update.icon className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="font-bold text-black mb-1">{update.title}</h3>
                  <p className="text-gray-600 mb-2">{update.description}</p>
                  <div className="flex items-center text-sm text-gray-500">
                    <FaCalendar className="w-4 h-4 mr-2" />
                    {update.date}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourcesPage;