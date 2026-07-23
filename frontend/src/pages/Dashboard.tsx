import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon, Settings, Activity } from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-md shadow-primary-500/20">
                <Activity className="text-white w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold text-slate-800">HMS Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-slate-600">
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-800 leading-tight">{user?.name}</span>
                  <span className="text-xs text-primary-600 font-medium">
                    {user?.roles?.[0]?.name || 'Staff'}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800">Welcome, {user?.name}!</h2>
          <p className="text-slate-500 mt-1">Here is the overview of your hospital system.</p>
        </div>

        {/* Placeholder Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <h3 className="text-slate-500 text-sm font-semibold mb-2">Total Patients</h3>
            <p className="text-3xl font-bold text-slate-800">1,248</p>
            <div className="mt-4 flex items-center text-sm text-primary-600 font-medium">
              <span>+12 today</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <h3 className="text-slate-500 text-sm font-semibold mb-2">Active OPD</h3>
            <p className="text-3xl font-bold text-slate-800">42</p>
            <div className="mt-4 flex items-center text-sm text-yellow-600 font-medium">
              <span>5 waiting</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <h3 className="text-slate-500 text-sm font-semibold mb-2">Available Beds</h3>
            <p className="text-3xl font-bold text-slate-800">18</p>
            <div className="mt-4 flex items-center text-sm text-red-500 font-medium">
              <span>Out of 100</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
