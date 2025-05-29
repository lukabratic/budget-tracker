// frontend/src/App.tsx
import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto'; // Import Chart.js

// Define a type for the tab content to make it more robust
type TabName = 'budget' | 'spending' | 'income';

const App: React.FC = () => {
    // State to manage the active tab
    const [activeTab, setActiveTab] = useState<TabName>('budget');
    // Ref for the Chart.js canvas element
    const chartRef = useRef<HTMLCanvasElement | null>(null);
    // Ref for the Chart.js instance
    const chartInstance = useRef<Chart | null>(null);

    // Data for the spending chart (example data)
    const spendingData = {
        labels: ['Groceries', 'Entertainment', 'Utilities', 'Transport', 'Dining Out'],
        datasets: [
            {
                label: 'Spending by Category',
                data: [150, 80, 120, 70, 95],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(153, 102, 255, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    // Effect to handle Chart.js rendering and destruction
    useEffect(() => {
        if (activeTab === 'spending' && chartRef.current) {
            // Destroy existing chart instance if it exists
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }

            // Create new chart instance
            const ctx = chartRef.current.getContext('2d');
            if (ctx) {
                chartInstance.current = new Chart(ctx, {
                    type: 'bar', // Or 'pie', 'line', etc.
                    data: spendingData,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false, // Allows the chart to fill its container
                        plugins: {
                            title: {
                                display: true,
                                text: 'Monthly Spending Breakdown',
                                font: {
                                    size: 18,
                                    weight: 'bold',
                                },
                                color: '#333',
                            },
                            legend: {
                                display: false, // Hide legend for single dataset
                            },
                        },
                        scales: {
                            x: {
                                beginAtZero: true,
                                grid: {
                                    display: false, // Hide x-axis grid lines
                                },
                            },
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return '$' + value; // Format y-axis labels as currency
                                    }
                                },
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.1)', // Light grid lines
                                },
                            },
                        },
                    },
                });
            }
        }

        // Cleanup function: destroy chart when component unmounts or tab changes
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
        };
    }, [activeTab]); // Re-run effect when activeTab changes

    // Helper function to get button classes based on active tab
    const getTabButtonClasses = (tabName: TabName) => {
        const baseClasses = "px-6 py-3 rounded-full text-lg font-semibold transition-all duration-300 ease-in-out shadow-md focus:outline-none focus:ring-4";
        if (activeTab === tabName) {
            return `${baseClasses} bg-indigo-500 text-white hover:bg-indigo-600 focus:ring-indigo-300`;
        } else {
            return `${baseClasses} bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-300`;
        }
    };

    return (
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 min-h-screen flex items-center justify-center p-4 font-inter">
            <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-4xl">
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-8 text-center">Budget Tracker</h1>

                {/* Tab Navigation */}
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                    <button
                        className={getTabButtonClasses('budget')}
                        onClick={() => setActiveTab('budget')}
                    >
                        Budget
                    </button>
                    <button
                        className={getTabButtonClasses('spending')}
                        onClick={() => setActiveTab('spending')}
                    >
                        Spending
                    </button>
                    <button
                        className={getTabButtonClasses('income')}
                        onClick={() => setActiveTab('income')}
                    >
                        Income
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'budget' && (
                    <div className="p-6 bg-blue-50 rounded-lg border border-blue-200 shadow-inner animate-fade-in">
                        <h2 className="text-3xl font-bold text-blue-800 mb-4">Your Budget Overview</h2>
                        <p className="text-gray-700 text-lg">
                            This section will display your overall budget, including planned expenses and remaining funds.
                            You can set your financial goals here and track your progress against them.
                        </p>
                        <div className="mt-6 p-4 bg-blue-100 rounded-lg">
                            <p className="font-semibold text-blue-700">Example: Monthly Income: $3000</p>
                            <p className="font-semibold text-blue-700">Example: Planned Expenses: $2000</p>
                            <p className="font-bold text-blue-900 mt-2">Remaining Budget: $1000</p>
                        </div>
                    </div>
                )}

                {activeTab === 'spending' && (
                    <div className="p-6 bg-green-50 rounded-lg border border-green-200 shadow-inner animate-fade-in">
                        <h2 className="text-3xl font-bold text-green-800 mb-4">Track Your Spending</h2>
                        <p className="text-gray-700 text-lg mb-6">
                            Here you can log all your daily expenses. Categorize them to get a clear picture of where your money is going.
                            This helps in identifying areas for potential savings.
                        </p>
                        <div className="mt-6 p-4 bg-green-100 rounded-lg h-80"> {/* Fixed height for chart container */}
                            {/* Chart.js canvas will be rendered here */}
                            <canvas ref={chartRef}></canvas>
                        </div>
                    </div>
                )}

                {activeTab === 'income' && (
                    <div className="p-6 bg-yellow-50 rounded-lg border border-yellow-200 shadow-inner animate-fade-in">
                        <h2 className="text-3xl font-bold text-yellow-800 mb-4">Manage Your Income</h2>
                        <p className="text-gray-700 text-lg">
                            Record all your sources of income in this section. This provides a comprehensive view of your total earnings,
                            whether from salary, freelance work, or other sources.
                        </p>
                        <div className="mt-6 p-4 bg-yellow-100 rounded-lg">
                            <p className="font-semibold text-yellow-700">Example: Salary: $2500</p>
                            <p className="font-semibold text-yellow-700">Example: Freelance Project: $500</p>
                            <p className="font-bold text-yellow-900 mt-2">Total Income This Month: $3000</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;
