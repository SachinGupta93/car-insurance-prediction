import React from 'react';
import { BookOpen, ChevronRight, HelpCircle, ShieldCheck } from 'lucide-react';

interface Resource {
  title: string;
  description: string;
  category: string;
  icon: React.ElementType;
  color: string;
}

const resources: Resource[] = [
  {
    title: "Understanding Your Car Insurance Policy",
    description: "A comprehensive guide to decode the terms and conditions in your policy document.",
    category: "Policy Basics",
    icon: BookOpen,
    color: "blue",
  },
  {
    title: "How to File a Claim After an Accident",
    description: "Step-by-step instructions on the claim filing process to ensure a smooth experience.",
    category: "Claims Process",
    icon: ShieldCheck,
    color: "emerald",
  },
  {
    title: "Choosing the Right Add-ons for Your Car",
    description: "Learn about popular add-ons like Zero Depreciation, Engine Protect, and more.",
    category: "Coverage",
    icon: HelpCircle,
    color: "purple",
  },
  {
    title: "What is No Claim Bonus (NCB)?",
    description: "Understand how NCB works and how you can save on your premiums.",
    category: "Savings",
    icon: BookOpen,
    color: "amber",
  },
    {
    title: "Tips for a Quick and Easy Claim Settlement",
    description: "Best practices to follow for a hassle-free claim settlement experience.",
    category: "Claims Process",
    icon: ShieldCheck,
    color: "emerald",
  },
  {
    title: "Renewing Your Car Insurance Policy Online",
    description: "A guide to renewing your policy online, comparing quotes, and finding the best deals.",
    category: "Policy Basics",
    icon: BookOpen,
    color: "blue",
  },
];

const categoryStyles: { [key: string]: string } = {
  "Policy Basics": "bg-blue-100 text-blue-800",
  "Claims Process": "bg-emerald-100 text-emerald-800",
  "Coverage": "bg-purple-100 text-purple-800",
  "Savings": "bg-amber-100 text-amber-800",
};

const InsuranceResources = () => {
  return (
    <div className="space-y-6">
       <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Knowledge Base</h2>
        <p className="text-gray-500">Your guide to understanding car insurance and making informed decisions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.map((resource, index) => (
          <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-300 flex flex-col">
            <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${categoryStyles[resource.category] || 'bg-gray-100'}`}>
                    <resource.icon className="w-6 h-6" />
                </div>
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${categoryStyles[resource.category] || 'bg-gray-100 text-gray-800'}`}>
                    {resource.category}
                </span>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2 flex-grow">{resource.title}</h3>
            <p className="text-gray-600 text-sm mb-4">{resource.description}</p>
            <a href="#" className="mt-auto text-sm font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1">
              Read More <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InsuranceResources;
