// frontend/src/BudgetTab.tsx
import React from 'react';

const BudgetTab: React.FC = () => {
    return (
        <div className="flex-grow p-6 bg-gray-700 rounded-lg border border-gray-600 shadow-inner animate-fade-in text-gray-100">
            <h2 className="text-3xl font-bold text-blue-300 mb-4">Your Budget Overview</h2>
            <p className="text-gray-300 text-lg">
                This section will display your overall budget, including planned expenses and remaining funds.
                You can set your financial goals here and track your progress against them.
            </p>
            <div className="mt-6 p-4 bg-gray-600 rounded-lg">
                <p className="font-semibold text-blue-300">Example: Monthly Income: $3000</p>
                <p className="font-semibold text-blue-300">Example: Planned Expenses: $2000</p>
                <p className="font-bold text-blue-100 mt-2">Remaining Budget: $1000</p>
            </div>
        </div>
    );
};

export default BudgetTab;
