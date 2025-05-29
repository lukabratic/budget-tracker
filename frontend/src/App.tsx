// frontend/src/App.tsx
import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto'; // Import Chart.js
import UploadPage from './UploadPage'; // Import the new UploadPage component

// Define a type for the tab content to make it more robust
type TabName = 'budget' | 'spending' | 'income';

// Define interfaces for data
interface SpendingRecord {
    id: number;
    card_used: string;
    date: string;
    description: string;
    category: string;
    amount: number;
}

interface IncomeRecord {
    id: number;
    date: string;
    source: string;
    net_income: number;
}


const App: React.FC = () => {
    // State to manage which page is currently shown (upload or main app)
    const [showUploadPage, setShowUploadPage] = useState(true); // Start with upload page
    // State to manage the active tab on the main app page
    const [activeTab, setActiveTab] = useState<TabName>('budget');
    // State to store spending data fetched from the backend
    const [spendingRecords, setSpendingRecords] = useState<SpendingRecord[]>([]);
    // State to store income data fetched from the backend
    const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
    // State to manage loading state for spending data
    const [loadingSpending, setLoadingSpending] = useState(false);
    // State to manage error state for spending data fetching
    const [spendingError, setSpendingError] = useState<string | null>(null);
    // State to manage loading state for income data
    const [loadingIncome, setLoadingIncome] = useState(false);
    // State to manage error state for income data fetching
    const [incomeError, setIncomeError] = useState<string | null>(null);


    // Ref for the Chart.js canvas element
    const chartRef = useRef<HTMLCanvasElement | null>(null);
    // Ref for the Chart.js instance
    const chartInstance = useRef<Chart | null>(null);

    // Function to fetch spending data from Flask backend
    const fetchSpendingData = async () => {
        setLoadingSpending(true);
        setSpendingError(null);
        try {
            const response = await fetch('http://localhost:5000/api/spending_records');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data: SpendingRecord[] = await response.json();
            setSpendingRecords(data);
        } catch (error) {
            console.error("Error fetching spending data:", error);
            setSpendingError("Failed to load spending data. Please try again.");
        } finally {
            setLoadingSpending(false);
        }
    };

    // Function to fetch income data from Flask backend
    const fetchIncomeData = async () => {
        setLoadingIncome(true);
        setIncomeError(null);
        try {
            const response = await fetch('http://localhost:5000/api/income_records');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data: IncomeRecord[] = await response.json();
            setIncomeRecords(data);
        } catch (error) {
            console.error("Error fetching income data:", error);
            setIncomeError("Failed to load income data. Please try again.");
        } finally {
            setLoadingIncome(false);
        }
    };


    // Effect to fetch data when the spending or income tab is activated or after upload success
    useEffect(() => {
        if (!showUploadPage) { // Only fetch if not on the upload page
            if (activeTab === 'spending') {
                fetchSpendingData();
            } else if (activeTab === 'income') {
                fetchIncomeData();
            }
        }
    }, [activeTab, showUploadPage]); // Depend on activeTab and showUploadPage

    // Effect to handle Chart.js rendering and destruction
    useEffect(() => {
        if (!showUploadPage && activeTab === 'spending' && chartRef.current && spendingRecords.length > 0) {
            // Destroy existing chart instance if it exists
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }

            // Aggregate spending data by category for the chart
            const spendingByCategory: { [key: string]: number } = {};
            spendingRecords.forEach(record => {
                const category = record.category || 'Uncategorized'; // Handle null/empty categories
                spendingByCategory[category] = (spendingByCategory[category] || 0) + record.amount;
            });

            const chartLabels = Object.keys(spendingByCategory);
            const chartData = Object.values(spendingByCategory);

            const ctx = chartRef.current.getContext('2d');
            if (ctx) {
                chartInstance.current = new Chart(ctx, {
                    type: 'bar', // Or 'pie', 'line', etc.
                    data: {
                        labels: chartLabels,
                        datasets: [
                            {
                                label: 'Spending by Category',
                                data: chartData,
                                backgroundColor: [
                                    'rgba(75, 192, 192, 0.6)', 'rgba(255, 99, 132, 0.6)',
                                    'rgba(54, 162, 235, 0.6)', 'rgba(255, 206, 86, 0.6)',
                                    'rgba(153, 102, 255, 0.6)', 'rgba(201, 203, 207, 0.6)',
                                    'rgba(255, 159, 64, 0.6)'
                                ],
                                borderColor: [
                                    'rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)',
                                    'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)',
                                    'rgba(153, 102, 255, 1)', 'rgba(201, 203, 207, 1)',
                                    'rgba(255, 159, 64, 1)'
                                ],
                                borderWidth: 1,
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Monthly Spending Breakdown',
                                font: {
                                    size: 18,
                                    weight: 'bold',
                                },
                                color: '#E5E7EB', // Light text for dark mode chart title
                            },
                            legend: {
                                display: false,
                            },
                        },
                        scales: {
                            x: {
                                beginAtZero: true,
                                grid: {
                                    display: false,
                                },
                                ticks: {
                                    color: '#E5E7EB', // Light text for x-axis labels
                                },
                            },
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value: any) {
                                        return '$' + value;
                                    },
                                    color: '#E5E7EB', // Light text for y-axis labels
                                },
                                grid: {
                                    color: 'rgba(255, 255, 255, 0.1)', // Lighter grid lines
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
    }, [activeTab, showUploadPage, spendingRecords]); // Re-run effect when activeTab, showUploadPage, or spendingRecords change

    // Helper function to get button classes based on active tab
    const getTabButtonClasses = (tabName: TabName) => {
        const baseClasses = "px-6 py-3 rounded-full text-lg font-semibold transition-all duration-300 ease-in-out shadow-md focus:outline-none focus:ring-4";
        if (activeTab === tabName) {
            return `${baseClasses} bg-indigo-500 text-white hover:bg-indigo-600 focus:ring-indigo-300`;
        } else {
            // Darker gray for inactive tabs in dark mode
            return `${baseClasses} bg-gray-700 text-gray-300 hover:bg-gray-600 focus:ring-gray-500`;
        }
    };

    const handleUploadSuccess = () => {
        setShowUploadPage(false); // Switch to the main app page
        // After successful upload, immediately fetch new data for the spending and income tabs
        fetchSpendingData();
        fetchIncomeData();
    };

    if (showUploadPage) {
        return <UploadPage onUploadSuccess={handleUploadSuccess} />;
    }

    return (
        <div className="bg-gradient-to-br from-gray-900 to-gray-700 min-h-screen flex flex-col items-center p-4 font-inter">
            <div className="bg-gray-800 rounded-none shadow-none p-6 md:p-8 w-full h-full flex flex-col"> {/* Removed max-w-4xl, shadow-2xl, rounded-xl */}
                <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-8 text-center">Budget Tracker</h1>

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
                )}

                {activeTab === 'spending' && (
                    <div className="flex-grow p-6 bg-gray-700 rounded-lg border border-gray-600 shadow-inner animate-fade-in text-gray-100">
                        <h2 className="text-3xl font-bold text-green-300 mb-4">Track Your Spending</h2>
                        <p className="text-gray-300 text-lg mb-6">
                            Here you can log all your daily expenses. Categorize them to get a clear picture of where your money is going.
                            This helps in identifying areas for potential savings.
                        </p>

                        {loadingSpending && (
                            <p className="text-center text-green-300">Loading spending data...</p>
                        )}
                        {spendingError && (
                            <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded relative mb-4" role="alert">
                                <strong className="font-bold">Error!</strong>
                                <span className="block sm:inline"> {spendingError}</span>
                            </div>
                        )}

                        {/* Chart Display */}
                        {spendingRecords.length > 0 ? (
                            <div className="mt-6 p-4 bg-gray-600 rounded-lg h-80 mb-6">
                                <canvas ref={chartRef}></canvas>
                            </div>
                        ) : (
                            !loadingSpending && !spendingError && (
                                <p className="text-center text-gray-400 mt-4">No spending data available. Please upload an Excel sheet.</p>
                            )
                        )}

                        {/* Spending Records Table */}
                        {spendingRecords.length > 0 && (
                            <div className="mt-8 overflow-x-auto bg-gray-800 rounded-lg shadow-md border border-gray-700">
                                <table className="min-w-full divide-y divide-gray-700">
                                    <thead className="bg-gray-700">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                                Date
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                                Description
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                                Category
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                                Card Used
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                                Amount
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                                        {spendingRecords.map((record) => (
                                            <tr key={record.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                                                    {new Date(record.date).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                                                    {record.description}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                                                    {record.category}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                                                    {record.card_used}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                                                    ${record.amount.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'income' && (
                    <div className="flex-grow p-6 bg-gray-700 rounded-lg border border-gray-600 shadow-inner animate-fade-in text-gray-100">
                        <h2 className="text-3xl font-bold text-yellow-300 mb-4">Manage Your Income</h2>
                        <p className="text-gray-300 text-lg">
                            Record all your sources of income in this section. This provides a comprehensive view of your total earnings,
                            whether from salary, freelance work, or other sources.
                        </p>
                        {loadingIncome && (
                            <p className="text-center text-yellow-300">Loading income data...</p>
                        )}
                        {incomeError && (
                            <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded relative mb-4" role="alert">
                                <strong className="font-bold">Error!</strong>
                                <span className="block sm:inline"> {incomeError}</span>
                            </div>
                        )}
                        {incomeRecords.length > 0 ? (
                             <div className="mt-8 overflow-x-auto bg-gray-800 rounded-lg shadow-md border border-gray-700">
                                <table className="min-w-full divide-y divide-gray-700">
                                    <thead className="bg-gray-700">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                                Date
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                                Source
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                                Net Income
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                                        {incomeRecords.map((record) => (
                                            <tr key={record.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                                                    {new Date(record.date).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                                                    {record.source}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                                                    ${record.net_income.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            !loadingIncome && !incomeError && (
                                <p className="text-center text-gray-400 mt-4">No income data available. Please upload an Excel sheet.</p>
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;
