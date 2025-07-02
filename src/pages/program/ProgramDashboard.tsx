import React from 'react';
import { CircleUser, Calendar, Trophy, Users } from 'lucide-react';

const ProgramDashboard = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8">Program Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stats Cards */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CircleUser className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-gray-500">Total Users</p>
              <p className="text-2xl font-semibold">1,234</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-gray-500">Active Programs</p>
              <p className="text-2xl font-semibold">12</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-gray-500">Achievements</p>
              <p className="text-2xl font-semibold">89</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-gray-500">Active Groups</p>
              <p className="text-2xl font-semibold">15</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Recent Activity</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium">Program Update #{item}</p>
                    <p className="text-sm text-gray-500">2 hours ago</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    Update
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgramDashboard;