import React from 'react';
import AILearningDashboard from '../../components/admin/AILearningDashboard';

const AdminAILearning = () => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">AI Learning System</h1>
        <p className="text-neutral-600">Monitor and manage the AI learning capabilities</p>
      </div>
      
      <AILearningDashboard />
    </div>
  );
};

export default AdminAILearning;