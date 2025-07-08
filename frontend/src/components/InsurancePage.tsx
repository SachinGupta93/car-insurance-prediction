import React from 'react';
import { Shield, TrendingUp, FileText, LifeBuoy } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InsuranceDashboard from './insurance/InsuranceDashboard';
import {
  ClaimsManagement,
  InsuranceMarketplace,
  InsuranceResources
} from './insurance';

const InsurancePage = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-screen-xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center">
            <Shield className="w-8 h-8 text-rose-600" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Insurance Hub</h1>
            <p className="text-gray-500 mt-1">Manage claims, compare providers, and get insights.</p>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto md:h-12 rounded-xl bg-rose-50 p-2">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              <span className="hidden md:inline-block">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="claims" className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <span className="hidden md:inline-block">Claims</span>
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span className="hidden md:inline-block">Marketplace</span>
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-2">
              <LifeBuoy className="w-5 h-5" />
              <span className="hidden md:inline-block">Resources</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="mt-6">
            <InsuranceDashboard />
          </TabsContent>
          <TabsContent value="claims" className="mt-6">
            <ClaimsManagement />
          </TabsContent>
          <TabsContent value="marketplace" className="mt-6">
            <InsuranceMarketplace />
          </TabsContent>
          <TabsContent value="resources" className="mt-6">
            <InsuranceResources />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default InsurancePage;
