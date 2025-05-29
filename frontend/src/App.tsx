// frontend/src/App.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
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

    // State for spending table sorting
    const [sortColumnSpending, setSortColumnSpending] = useState<keyof SpendingRecord>('date');
    const [sortDirectionSpending, setSortDirectionSpending] = useState<'asc' | 'desc'>('desc');

    // State for spending table pagination
    const [currentPageSpending, setCurrentPageSpending] = useState(1);
    const [itemsPerPageSpending, setItemsPerPageSpending] = useState(10);

    // State for spending table search
    const [searchTermSpending, setSearchTermSpending] = useState('');

    // State for income table sorting (NEW)
    const [sortColumnIncome, setSortColumnIncome] = useState<keyof IncomeRecord>('date');
    const [sortDirectionIncome, setSortDirectionIncome] = useState<'asc' | 'desc'>('desc');

    // State for income table pagination (NEW)
    const [currentPageIncome, setCurrentPageIncome] = useState(1);
    const [itemsPerPageIncome, setItemsPerPageIncome] = useState(10);

    // State for income table search (NEW)
    const [searchTermIncome, setSearchTermIncome] = useState('');

    // State for year selection in monthly spending chart
    const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
    const [availableYears, setAvailableYears] = useState<string[]>([]);


    // Refs for the Chart.js canvas elements
    const monthlySpendingChartRef = useRef<HTMLCanvasElement | null>(null);
    const categorySpendingChartRef = useRef<HTMLCanvasElement | null>(null);
    // Refs for the Chart.js instances
    const monthlySpendingChartInstance = useRef<Chart | null>(null);
    const categorySpendingChartInstance = useRef<Chart | null>(null);


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
    useEffect(() => {
        if (!showUploadPage) { // Only fetch if not on the upload page
            if (activeTab === 'spending') {
                fetchSpendingData();
            } else if (activeTab === 'income') {
                fetchIncomeData();
            }
        }
    }, [activeTab, showUploadPage]); // Depend on activeTab and showUploadPage

    // Effect to handle Chart.js rendering and destruction for both charts
    useEffect(() => {
        if (!showUploadPage && activeTab === 'spending' && spendingRecords.length > 0) {
            // --- Monthly Spending Line Chart ---
            if (monthlySpendingChartInstance.current) {
                monthlySpendingChartInstance.current.destroy();
            }

            const monthlySpending: { [key: string]: number } = {};
            const monthNames = ["January", "February", "March", "April", "May", "June",
                                "July", "August", "September", "October", "November", "December"];

            // Initialize all months for the selected year to 0 to ensure all months are shown
            monthNames.forEach(month => monthlySpending[month] = 0);

            spendingRecords.filter(record => new Date(record.date).getFullYear().toString() === selectedYear)
                           .forEach(record => {
                const monthIndex = new Date(record.date).getMonth();
                const monthName = monthNames[monthIndex];
                monthlySpending[monthName] = (monthlySpending[monthName] || 0) + record.amount;
            });

            // Ensure labels are in chronological order
            const monthlyChartLabels = monthNames; // Use predefined month names for order
            const monthlyChartData = monthlyChartLabels.map(month => monthlySpending[month]);

            if (monthlySpendingChartRef.current) {
                const ctxMonthly = monthlySpendingChartRef.current.getContext('2d');
                if (ctxMonthly) {
                    monthlySpendingChartInstance.current = new Chart(ctxMonthly, {
                        type: 'line', // Changed to line chart
                        data: {
                            labels: monthlyChartLabels,
                            datasets: [{
                                label: 'Total Spending', // Changed label
                                data: monthlyChartData,
                                fill: false, // Don't fill area under the line
                                borderColor: 'rgba(75, 192, 192, 1)', // Line color
                                backgroundColor: 'rgba(75, 192, 192, 0.2)', // Point background color
                                tension: 0.3, // Smoothness of the line
                                pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                                pointBorderColor: '#fff',
                                pointHoverBackgroundColor: '#fff',
                                pointHoverBorderColor: 'rgba(75, 192, 192, 1)',
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                title: {
                                    display: true,
                                    text: `Monthly Spending Trends (${selectedYear})`, // Updated title
                                    font: { size: 18, weight: 'bold' },
                                    color: '#E5E7EB',
                                },
                                legend: {
                                    labels: {
                                        color: '#E5E7EB', // Legend text color
                                    }
                                },
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            let label = context.dataset.label || '';
                                            if (label) {
                                                label += ': ';
                                            }
                                            if (context.parsed.y !== null) {
                                                label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                                            }
                                            return label;
                                        }
                                    }
                                }
                            },
                            scales: {
                                x: {
                                    title: {
                                        display: true,
                                        text: 'Month',
                                        color: '#E5E7EB',
                                    },
                                    grid: {
                                        color: 'rgba(255, 255, 255, 0.1)', // Lighter grid lines
                                    },
                                    ticks: {
                                        color: '#E5E7EB', // X-axis labels color
                                    }
                                },
                                y: {
                                    title: {
                                        display: true,
                                        text: 'Amount ($)',
                                        color: '#E5E7EB',
                                    },
                                    beginAtZero: true,
                                    grid: {
                                        color: 'rgba(255, 255, 255, 0.1)', // Lighter grid lines
                                    },
                                    ticks: {
                                        callback: function(value: any) {
                                            return '$' + value;
                                        },
                                        color: '#E5E7EB', // Y-axis labels color
                                    }
                                }
                            }
                        }
                    });
                }
            }

            // --- Category Spending Bar Graph (remains largely the same) ---
            if (categorySpendingChartInstance.current) {
                categorySpendingChartInstance.current.destroy();
            }

            const spendingByCategory: { [key: string]: number } = {};
            spendingRecords.forEach(record => {
                const category = record.category || 'Uncategorized';
                spendingByCategory[category] = (spendingByCategory[category] || 0) + record.amount;
            });

            const categoryChartLabels = Object.keys(spendingByCategory);
            const categoryChartData = Object.values(spendingByCategory);

            if (categorySpendingChartRef.current) {
                const ctxCategory = categorySpendingChartRef.current.getContext('2d');
                if (ctxCategory) {
                    categorySpendingChartInstance.current = new Chart(ctxCategory, {
                        type: 'bar',
                        data: {
                            labels: categoryChartLabels,
                            datasets: [
                                {
                                    label: 'Spending by Category',
                                    data: categoryChartData,
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
                                    text: 'Total Spending by Category',
                                    font: { size: 18, weight: 'bold' },
                                    color: '#E5E7EB',
                                },
                                legend: { display: false },
                            },
                            scales: {
                                x: {
                                    beginAtZero: true,
                                    grid: { display: false },
                                    ticks: { color: '#E5E7EB' },
                                },
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        callback: function(value: any) { return '$' + value; },
                                        color: '#E5E7EB',
                                    },
                                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                                },
                            },
                        },
                    });
                }
            }
        }

        // Cleanup function: destroy charts when component unmounts or tab changes
        return () => {
            if (monthlySpendingChartInstance.current) {
                monthlySpendingChartInstance.current.destroy();
                monthlySpendingChartInstance.current = null;
            }
            if (categorySpendingChartInstance.current) {
                categorySpendingChartInstance.current.destroy();
                categorySpendingChartInstance.current = null;
            }
        };
    }, [activeTab, showUploadPage, spendingRecords, selectedYear]); // Re-run effect when these dependencies change

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

    // --- Spending Table Logic ---

    // Filtered and Sorted Spending Records
    const filteredAndSortedSpendingRecords = useMemo(() => {
        let filtered = spendingRecords.filter(record =>
            Object.values(record).some(value =>
                String(value).toLowerCase().includes(searchTermSpending.toLowerCase())
            )
        );

        // Sort the filtered data
        filtered.sort((a, b) => {
            const aValue = a[sortColumnSpending];
            const bValue = b[sortColumnSpending];

            // Special handling for date strings
            if (sortColumnSpending === 'date') {
                const dateA = new Date(aValue as string).getTime();
                const dateB = new Date(bValue as string).getTime();
                return sortDirectionSpending === 'asc' ? dateA - dateB : dateB - dateA;
            }

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortDirectionSpending === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortDirectionSpending === 'asc' ? aValue - bValue : bValue - aValue;
            }
            // Fallback for other types or mixed types
            return 0;
        });

        return filtered;
    }, [spendingRecords, searchTermSpending, sortColumnSpending, sortDirectionSpending]);

    // Pagination Logic for Spending
    const totalPagesSpending = Math.ceil(filteredAndSortedSpendingRecords.length / itemsPerPageSpending);
    const startIndexSpending = (currentPageSpending - 1) * itemsPerPageSpending;
    const endIndexSpending = startIndexSpending + itemsPerPageSpending;
    const currentSpendingPageData = filteredAndSortedSpendingRecords.slice(startIndexSpending, endIndexSpending);

    const handleSortSpending = (column: keyof SpendingRecord) => {
        if (sortColumnSpending === column) {
            setSortDirectionSpending(sortDirectionSpending === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumnSpending(column);
            setSortDirectionSpending('asc'); // Default to ascending when changing column
        }
        setCurrentPageSpending(1); // Reset to first page on sort
    };

    const handlePageChangeSpending = (page: number) => {
        if (page >= 1 && page <= totalPagesSpending) {
            setCurrentPageSpending(page);
        }
    };

    const handleItemsPerPageChangeSpending = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setItemsPerPageSpending(Number(e.target.value));
        setCurrentPageSpending(1); // Reset to first page when items per page changes
    };

    const handleSearchChangeSpending = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTermSpending(e.target.value);
        setCurrentPageSpending(1); // Reset to first page on search
    };


    // --- Income Table Logic (NEW) ---

    // Filtered and Sorted Income Records
    const filteredAndSortedIncomeRecords = useMemo(() => {
        let filtered = incomeRecords.filter(record =>
            Object.values(record).some(value =>
                String(value).toLowerCase().includes(searchTermIncome.toLowerCase())
            )
        );

        // Sort the filtered data
        filtered.sort((a, b) => {
            const aValue = a[sortColumnIncome];
            const bValue = b[sortColumnIncome];

            // Special handling for date strings
            if (sortColumnIncome === 'date') {
                const dateA = new Date(aValue as string).getTime();
                const dateB = new Date(bValue as string).getTime();
                return sortDirectionIncome === 'asc' ? dateA - dateB : dateB - dateA;
            }

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortDirectionIncome === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortDirectionIncome === 'asc' ? aValue - bValue : bValue - aValue;
            }
            return 0;
        });

        return filtered;
    }, [incomeRecords, searchTermIncome, sortColumnIncome, sortDirectionIncome]);

    // Pagination Logic for Income
    const totalPagesIncome = Math.ceil(filteredAndSortedIncomeRecords.length / itemsPerPageIncome);
    const startIndexIncome = (currentPageIncome - 1) * itemsPerPageIncome;
    const endIndexIncome = startIndexIncome + itemsPerPageIncome;
    const currentIncomePageData = filteredAndSortedIncomeRecords.slice(startIndexIncome, endIndexIncome);

    const handleSortIncome = (column: keyof IncomeRecord) => {
        if (sortColumnIncome === column) {
            setSortDirectionIncome(sortDirectionIncome === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumnIncome(column);
            setSortDirectionIncome('asc');
        }
        setCurrentPageIncome(1);
    };

    const handlePageChangeIncome = (page: number) => {
        if (page >= 1 && page <= totalPagesIncome) {
            setCurrentPageIncome(page);
        }
    };

    const handleItemsPerPageChangeIncome = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setItemsPerPageIncome(Number(e.target.value));
        setCurrentPageIncome(1);
    };

    const handleSearchChangeIncome = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTermIncome(e.target.value);
        setCurrentPageIncome(1);
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

                        {/* Charts Display */}
                        {spendingRecords.length > 0 ? (
                            <>
                                {/* Monthly Spending Line Chart with Year Selector */}
                                <div className="mt-6 p-4 bg-gray-600 rounded-lg mb-6 flex flex-col items-center">
                                    <div className="mb-4">
                                        <label htmlFor="year-select" className="text-gray-300 mr-2">Select Year:</label>
                                        <select
                                            id="year-select"
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(e.target.value)}
                                            className="p-2 rounded-md bg-gray-700 text-white border border-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            {availableYears.map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-full h-80"> {/* Fixed height for chart container */}
                                        <canvas ref={monthlySpendingChartRef}></canvas>
                                    </div>
                                </div>

                                {/* Category Spending Bar Graph */}
                                <div className="mt-6 p-4 bg-gray-600 rounded-lg h-80 mb-6">
                                    <canvas ref={categorySpendingChartRef}></canvas>
                                </div>
                            </>
                        ) : (
                            !loadingSpending && !spendingError && (
                                <p className="text-center text-gray-400 mt-4">No spending data available. Please upload an Excel sheet.</p>
                            )
                        )}

                        {/* Search and Pagination Controls */}
                        {spendingRecords.length > 0 && (
                            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                                {/* Search Input */}
                                <input
                                    type="text"
                                    placeholder="Search spending..."
                                    value={searchTermSpending}
                                    onChange={handleSearchChangeSpending}
                                    className="p-2 rounded-md bg-gray-600 text-white placeholder-gray-400 border border-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-1/3"
                                />

                                {/* Items per page dropdown */}
                                <div className="flex items-center gap-2">
                                    <label htmlFor="itemsPerPageSpending" className="text-gray-300">Items per page:</label>
                                    <select
                                        id="itemsPerPageSpending"
                                        value={itemsPerPageSpending}
                                        onChange={handleItemsPerPageChangeSpending}
                                        className="p-2 rounded-md bg-gray-600 text-white border border-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-50"
                                    >
                                        <option value={5}>5</option>
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                    </select>
                                </div>
                            </div>
                        )}


                        {/* Spending Records Table */}
                        {spendingRecords.length > 0 && (
                            <div className="mt-8 overflow-x-auto bg-gray-800 rounded-lg shadow-md border border-gray-700">
                                <table className="min-w-full divide-y divide-gray-700">
                                    <thead className="bg-gray-700">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                                onClick={() => handleSortSpending('date')}>
                                                Date
                                                {sortColumnSpending === 'date' && (sortDirectionSpending === 'asc' ? ' ▲' : ' ▼')}
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                                onClick={() => handleSortSpending('description')}>
                                                Description
                                                {sortColumnSpending === 'description' && (sortDirectionSpending === 'asc' ? ' ▲' : ' ▼')}
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                                onClick={() => handleSortSpending('category')}>
                                                Category
                                                {sortColumnSpending === 'category' && (sortDirectionSpending === 'asc' ? ' ▲' : ' ▼')}
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                                onClick={() => handleSortSpending('card_used')}>
                                                Card Used
                                                {sortColumnSpending === 'card_used' && (sortDirectionSpending === 'asc' ? ' ▲' : ' ▼')}
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                                onClick={() => handleSortSpending('amount')}>
                                                Amount
                                                {sortColumnSpending === 'amount' && (sortDirectionSpending === 'asc' ? ' ▲' : ' ▼')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                                        {currentSpendingPageData.length > 0 ? (
                                            currentSpendingPageData.map((record) => (
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
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-4 text-center text-gray-400">
                                                    No matching spending records found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination Controls */}
                        {filteredAndSortedSpendingRecords.length > 0 && (
                            <div className="flex justify-between items-center mt-4">
                                <button
                                    onClick={() => handlePageChangeSpending(currentPageSpending - 1)}
                                    disabled={currentPageSpending === 1}
                                    className="px-4 py-2 rounded-md bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <span className="text-gray-300">
                                    Page {currentPageSpending} of {totalPagesSpending}
                                </span>
                                <button
                                    onClick={() => handlePageChangeSpending(currentPageSpending + 1)}
                                    disabled={currentPageSpending === totalPagesSpending}
                                    className="px-4 py-2 rounded-md bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
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
                            <>
                                {/* Search and Pagination Controls for Income */}
                                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                                    {/* Search Input */}
                                    <input
                                        type="text"
                                        placeholder="Search income..."
                                        value={searchTermIncome}
                                        onChange={handleSearchChangeIncome}
                                        className="p-2 rounded-md bg-gray-600 text-white placeholder-gray-400 border border-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-1/3"
                                    />

                                    {/* Items per page dropdown */}
                                    <div className="flex items-center gap-2">
                                        <label htmlFor="itemsPerPageIncome" className="text-gray-300">Items per page:</label>
                                        <select
                                            id="itemsPerPageIncome"
                                            value={itemsPerPageIncome}
                                            onChange={handleItemsPerPageChangeIncome}
                                            className="p-2 rounded-md bg-gray-600 text-white border border-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-50"
                                        >
                                            <option value={5}>5</option>
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                            <option value={50}>50</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="mt-8 overflow-x-auto bg-gray-800 rounded-lg shadow-md border border-gray-700">
                                    <table className="min-w-full divide-y divide-gray-700">
                                        <thead className="bg-gray-700">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                                    onClick={() => handleSortIncome('date')}>
                                                    Date
                                                    {sortColumnIncome === 'date' && (sortDirectionIncome === 'asc' ? ' ▲' : ' ▼')}
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                                    onClick={() => handleSortIncome('source')}>
                                                    Source
                                                    {sortColumnIncome === 'source' && (sortDirectionIncome === 'asc' ? ' ▲' : ' ▼')}
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                                    onClick={() => handleSortIncome('net_income')}>
                                                    Net Income
                                                    {sortColumnIncome === 'net_income' && (sortDirectionIncome === 'asc' ? ' ▲' : ' ▼')}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                                            {currentIncomePageData.length > 0 ? (
                                                currentIncomePageData.map((record) => (
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
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={3} className="px-6 py-4 text-center text-gray-400">
                                                        No matching income records found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination Controls for Income */}
                                <div className="flex justify-between items-center mt-4">
                                    <button
                                        onClick={() => handlePageChangeIncome(currentPageIncome - 1)}
                                        disabled={currentPageIncome === 1}
                                        className="px-4 py-2 rounded-md bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>
                                    <span className="text-gray-300">
                                        Page {currentPageIncome} of {totalPagesIncome}
                                    </span>
                                    <button
                                        onClick={() => handlePageChangeIncome(currentPageIncome + 1)}
                                        disabled={currentPageIncome === totalPagesIncome}
                                        className="px-4 py-2 rounded-md bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </div>
                            </>
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
