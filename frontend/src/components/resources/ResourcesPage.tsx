import React from 'react';
import { Link } from 'react-router-dom';

interface Resource {
  id: string;
  title: string;
  description: string;
  link?: string; 
  icon?: string; // Name or class for icon (FontAwesome, etc.)
  category: 'insurance' | 'repair' | 'documentation' | 'support';
}

const ResourcesPage: React.FC = () => {
  // Sample resources data
  const resources: Resource[] = [
    {
      id: '1',
      title: 'Understanding Insurance Claims',
      description: 'Learn about the car insurance claim process after damage occurs.',
      link: '#insurance-guide',
      icon: 'document',
      category: 'insurance',
    },
    {
      id: '2',
      title: 'Finding Repair Shops',
      description: 'Locate certified repair shops in your area based on damage type.',
      link: '#repair-locations',
      icon: 'wrench',
      category: 'repair',
    },
    {
      id: '3',
      title: 'Damage Types Guide',
      description: 'Reference guide for different types of car damage and their implications.',
      link: '#damage-guide',
      icon: 'book',
      category: 'documentation',
    },
    {
      id: '4',
      title: 'Contact Support',
      description: 'Need help with analysis results? Contact our support team.',
      link: '/support',
      icon: 'headset',
      category: 'support',
    },
    {
      id: '5',
      title: 'DIY Temporary Fixes',
      description: 'Safe temporary fixes you can do yourself before professional repair.',
      link: '#diy-fixes',
      icon: 'tools',
      category: 'repair',
    },
    {
      id: '6',
      title: 'Insurance Policy Guide',
      description: 'Understand what your insurance might cover based on damage type.',
      link: '#policy-guide',
      icon: 'shield',
      category: 'insurance',
    },
  ];

  const getIconClass = (iconName: string): string => {
    // This is a simple mapping function that you can expand
    // Here we're just using a placeholder approach
    const iconMap: Record<string, string> = {
      document: '📄',
      wrench: '🔧',
      book: '📚',
      headset: '🎧',
      tools: '🧰',
      shield: '🛡️',
    };
    
    return iconMap[iconName] || '📋'; // Default icon
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

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-800">Resources</h1>
          <p className="mt-2 text-gray-600">
            Find helpful information about car damage, repairs, and insurance claims.
          </p>
        </div>

        {/* Hero section with search (placeholder for now) */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-8 mb-10 text-white shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Looking for something specific?</h2>
          <div className="flex max-w-md mx-auto">
            <input 
              type="text" 
              placeholder="Search resources..." 
              className="w-full px-4 py-2 rounded-l-md text-gray-800 focus:outline-none"
            />
            <button className="bg-indigo-700 hover:bg-indigo-800 px-6 rounded-r-md transition-colors">
              Search
            </button>
          </div>
        </div>
        
        {/* Resource categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {Object.entries(categorizedResources).map(([category, items]) => (
            <div key={category} className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
                {categoryNames[category] || category}
              </h2>
              <div className="space-y-4">
                {items.map((resource) => (
                  <div key={resource.id} className="flex items-start">
                    {resource.icon && (
                      <div className="text-2xl mr-3">
                        {getIconClass(resource.icon)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium text-gray-800">
                        {resource.link ? (
                          resource.link.startsWith('/') ? (
                            <Link to={resource.link} className="text-blue-600 hover:text-blue-800">
                              {resource.title}
                            </Link>
                          ) : (
                            <a href={resource.link} className="text-blue-600 hover:text-blue-800">
                              {resource.title}
                            </a>
                          )
                        ) : (
                          resource.title
                        )}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {/* FAQ section */}
        <div className="mt-12 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-800">How accurate is the damage analysis?</h3>
              <p className="mt-1 text-gray-600">
                Our AI damage analysis typically achieves 85-95% accuracy depending on image quality and damage type. 
                Results should be confirmed by a professional for final assessment.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800">Can I use the analysis report for my insurance claim?</h3>
              <p className="mt-1 text-gray-600">
                The analysis report can be used as an initial assessment, but most insurance companies 
                require their own adjuster's evaluation for official claims.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800">How do I get the best quality analysis?</h3>
              <p className="mt-1 text-gray-600">
                Take photos in good lighting, from multiple angles, ensure the damaged area is clearly visible,
                and try to minimize reflections or shadows over the damaged area.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourcesPage;