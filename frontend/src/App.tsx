// frontend/src/App.tsx
import React, { useState, useEffect } from 'react';
import UploadPage from './UploadPage';
import BudgetTab from './BudgetTab';
import SpendingTab from './SpendingTab';
import IncomeTab from './IncomeTab';

// Define a type for the tab content to make it more robust
type TabName = 'budget' | 'spending' | 'income';

// Define interfaces for data (moved here for global access if needed, or can be duplicated in each tab component)
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

    // State for year selection in monthly spending chart (lifted to App for shared control)
    const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
    const [availableYears, setAvailableYears] = useState<string[]>([]);


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

            // Extract unique years for the dropdown
            const years = Array.from(new Set(
                data.map(record => new Date(record.date).getFullYear().toString())
            )).sort((a, b) => parseInt(b) - parseInt(a)); // Sort descending
            setAvailableYears(years);
            if (years.length > 0 && !years.includes(selectedYear)) {
                setSelectedYear(years[0]); // Set to the latest year if current year not in data
            } else if (years.length === 0) {
                setSelectedYear(String(new Date().getFullYear())); // Reset to current year if no data
            }

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
    // This effect is now responsible for triggering data fetches for the respective tabs
    useEffect(() => {
        if (!showUploadPage) { // Only fetch if not on the upload page
            if (activeTab === 'spending' || activeTab === 'budget') { // Fetch spending for budget tab too
                fetchSpendingData();
            }
            if (activeTab === 'income' || activeTab === 'budget') { // Fetch income for budget tab too
                fetchIncomeData();
            }
        }
    }, [activeTab, showUploadPage]);


    // Helper function to get button classes based on active tab
    const getTabButtonClasses = (tabName: TabName) => {
        const baseClasses = "px-6 py-3 rounded-full text-lg font-semibold transition-all duration-300 ease-in-out shadow-md focus:outline-none focus:ring-4";
        if (activeTab === tabName) {
            return `${baseClasses} bg-indigo-500 text-white hover:bg-indigo-600 focus:ring-indigo-300`;
        } else {
            return `${baseClasses} bg-gray-700 text-gray-300 hover:bg-gray-600 focus:ring-gray-500`;
        }
    };

    const handleUploadSuccess = () => {
        setShowUploadPage(false); // Switch to the main app page
        // After successful upload, immediately fetch new data for all relevant tabs
        fetchSpendingData();
        fetchIncomeData();
    };

    if (showUploadPage) {
        return <UploadPage onUploadSuccess={handleUploadSuccess} />;
    }

    return (
        <div className="bg-gradient-to-br from-gray-900 to-gray-700 min-h-screen flex flex-col items-center p-4 font-inter">
            <div className="bg-gray-800 rounded-none shadow-none p-6 md:p-8 w-full h-full flex flex-col">
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
                    <BudgetTab
                        spendingRecords={spendingRecords}
                        incomeRecords={incomeRecords}
                    />
                )}
                {activeTab === 'spending' && (
                    <SpendingTab
                        spendingRecords={spendingRecords}
                        loadingSpending={loadingSpending}
                        spendingError={spendingError}
                        fetchSpendingData={fetchSpendingData} // Pass fetch function
                        selectedYear={selectedYear}
                        setSelectedYear={setSelectedYear}
                        availableYears={availableYears}
                    />
                )}
                {activeTab === 'income' && (
                    <IncomeTab
                        incomeRecords={incomeRecords}
                        loadingIncome={loadingIncome}
                        incomeError={incomeError}
                    />
                )}
            </div>
        </div>
    );
};

export default App;
