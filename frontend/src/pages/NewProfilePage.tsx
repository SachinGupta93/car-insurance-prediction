import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  Calendar,
  Shield,
  Bell,
  Key,
  CreditCard,
  Download,
  Upload,
  LogOut,
  Check,
  X,
  Edit,
  Camera,
  Save
} from 'lucide-react';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';
import unifiedApiService from '@/services/unifiedApiService';

const NewProfilePage: React.FC = () => {
  const { firebaseUser, logout } = useFirebaseAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    analysisComplete: true,
    insuranceUpdates: true,
    marketingEmails: false
  });

  // Sample user data
  const [userData, setUserData] = useState({
    name: firebaseUser?.displayName || 'John Doe',
    email: firebaseUser?.email || 'john.doe@example.com',
    phone: '+91 98765 43210',
    company: 'ABC Insurance Co.',
    location: 'Mumbai, Maharashtra',
    joinedDate: '2024-01-15',
    plan: 'Professional',
    analysisCount: 0,
    storageUsed: '0 GB'
  });

  const stats = [
    { label: 'Analyses', value: userData.analysisCount, icon: Upload, color: 'from-blue-500 to-cyan-500' },
    { label: 'Storage', value: userData.storageUsed, icon: CreditCard, color: 'from-purple-500 to-indigo-500' },
    { label: 'Plan', value: userData.plan, icon: Shield, color: 'from-emerald-500 to-teal-500' },
    { label: 'Member Since', value: new Date(userData.joinedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), icon: Calendar, color: 'from-rose-500 to-pink-500' }
  ];

  const handleSave = () => {
    setIsEditing(false);
    // Save logic here
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        // Ensure user profile exists and fetch details
        const profile = await unifiedApiService.getUserProfile().catch(() => null);
        const stats = await unifiedApiService.getUserStats().catch(() => null);

        // Update basic info
        setUserData(prev => ({
          ...prev,
          name: profile?.data?.display_name || profile?.display_name || firebaseUser?.displayName || prev.name,
          email: profile?.data?.email || profile?.email || firebaseUser?.email || prev.email,
          joinedDate: profile?.data?.created_at || profile?.created_at || prev.joinedDate,
          plan: (stats?.plan || 'Professional'),
          analysisCount: Number(stats?.totalAnalyses || stats?.analysis_count || 0),
          storageUsed: stats?.storageUsed || stats?.storage_used || prev.storageUsed,
        }));
      } catch (e: any) {
        setError(e?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [firebaseUser?.uid]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        {loading && (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600">Loading profile...</p>
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">{error}</div>
        )}
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
            Profile & Settings
          </h1>
          <p className="text-slate-600 text-lg">Manage your account and preferences</p>
        </div>

        {/* Profile Overview Card */}
        <Card className="mb-8 hover:shadow-xl transition-shadow border-2">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              {/* Avatar */}
              <div className="relative group">
                <Avatar className="w-32 h-32 border-4 border-white shadow-xl">
                  <AvatarImage src={firebaseUser?.photoURL || undefined} />
                  <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                    {userData.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                  <h2 className="text-3xl font-bold text-slate-900">{userData.name}</h2>
                  <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-none">
                    {userData.plan}
                  </Badge>
                </div>
                <p className="text-slate-600 text-lg mb-4">{userData.email}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-center md:text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center text-white`}>
                          <stat.icon className="w-4 h-4" />
                        </div>
                        <p className="text-sm text-slate-600">{stat.label}</p>
                      </div>
                      <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex flex-col gap-2">
                <Button
                  variant={isEditing ? "default" : "outline"}
                  onClick={() => setIsEditing(!isEditing)}
                  className={isEditing ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 gap-2" : "gap-2"}
                >
                  <Edit className="w-4 h-4" />
                  {isEditing ? 'Editing' : 'Edit Profile'}
                </Button>
                <Button variant="outline" className="gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Tabs */}
        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal" className="gap-2">
              <User className="w-4 h-4" />
              Personal
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2">
              <CreditCard className="w-4 h-4" />
              Billing
            </TabsTrigger>
          </TabsList>

          {/* Personal Info Tab */}
          <TabsContent value="personal" className="space-y-6">
            <Card className="hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={userData.name}
                      onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userData.email}
                      onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={userData.phone}
                      onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={userData.company}
                      onChange={(e) => setUserData({ ...userData, company: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={userData.location}
                      onChange={(e) => setUserData({ ...userData, location: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="flex gap-3 pt-4">
                    <Button onClick={handleSave} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 gap-2">
                      <Save className="w-4 h-4" />
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={handleCancel} className="gap-2">
                      <X className="w-4 h-4" />
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card className="hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage your password and security options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input id="current-password" type="password" placeholder="Enter current password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input id="new-password" type="password" placeholder="Enter new password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input id="confirm-password" type="password" placeholder="Confirm new password" />
                  </div>
                  <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 gap-2">
                    <Key className="w-4 h-4" />
                    Update Password
                  </Button>
                </div>

                <div className="pt-6 border-t border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-4">Two-Factor Authentication</h4>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">Enable 2FA</p>
                      <p className="text-sm text-slate-600">Add an extra layer of security to your account</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose how you want to be notified</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="font-medium text-slate-900">Email Notifications</p>
                        <p className="text-sm text-slate-600">Receive updates via email</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.email}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="font-medium text-slate-900">Push Notifications</p>
                        <p className="text-sm text-slate-600">Receive browser push notifications</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.push}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="font-medium text-slate-900">Analysis Complete</p>
                        <p className="text-sm text-slate-600">Notify when damage analysis is complete</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.analysisComplete}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, analysisComplete: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="font-medium text-slate-900">Insurance Updates</p>
                        <p className="text-sm text-slate-600">Get notified about insurance claim updates</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.insuranceUpdates}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, insuranceUpdates: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="font-medium text-slate-900">Marketing Emails</p>
                        <p className="text-sm text-slate-600">Receive product updates and offers</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.marketingEmails}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, marketingEmails: checked })}
                    />
                  </div>
                </div>

                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 gap-2">
                  <Save className="w-4 h-4" />
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <Card className="hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle>Billing & Subscription</CardTitle>
                <CardDescription>Manage your subscription and payment methods</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current Plan */}
                <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">{userData.plan} Plan</h3>
                      <p className="text-slate-600">Unlimited analyses, priority support</p>
                    </div>
                    <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-none text-lg px-4 py-2">
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        ₹2,999 <span className="text-lg text-slate-600">/month</span>
                      </p>
                      <p className="text-sm text-slate-600 mt-1">Next billing date: Feb 15, 2025</p>
                    </div>
                    <Button variant="outline" className="gap-2">
                      <Download className="w-4 h-4" />
                      Download Invoice
                    </Button>
                  </div>
                </div>

                {/* Usage */}
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">Current Usage</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-600">Storage</span>
                        <span className="text-sm font-semibold text-slate-900">{userData.storageUsed} / 10 GB</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full" style={{ width: '24%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-600">Analyses This Month</span>
                        <span className="text-sm font-semibold text-slate-900">{userData.analysisCount} / Unlimited</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                    Upgrade Plan
                  </Button>
                  <Button variant="outline" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                    Cancel Subscription
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default NewProfilePage;
