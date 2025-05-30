// frontend/src/SpendingTab.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Chart from 'chart.js/auto';

// Define interfaces for data
interface SpendingRecord {
    id: number;
    card_used: string;
    date: string;
    description: string;
    category: string;
    amount: number;
}

interface SpendingTabProps {
    spendingRecords: SpendingRecord[];
    loadingSpending: boolean;
    spendingError: string | null;
    fetchSpendingData: () => void;
    selectedYear: string;
    setSelectedYear: React.Dispatch<React.SetStateAction<string>>;
    availableYears: string[];
}

const SpendingTab: React.FC<SpendingTabProps> = ({
    spendingRecords,
    loadingSpending,
    spendingError,
    fetchSpendingData,
    selectedYear,
    setSelectedYear,
    availableYears,
}) => {
    // State for table sorting
    const [sortColumnSpending, setSortColumnSpending] = useState<keyof SpendingRecord>('date');
    const [sortDirectionSpending, setSortDirectionSpending] = useState<'asc' | 'desc'>('desc');

    // State for table pagination
    const [currentPageSpending, setCurrentPageSpending] = useState(1);
    const [itemsPerPageSpending, setItemsPerPageSpending] = useState(10);

    // State for table search
    const [searchTermSpending, setSearchTermSpending] = useState('');
    // State for category filter from chart click
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

    // State for expanded category in the new monthly category table
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    // State for toggling visibility of the entire "Spending by Category per Month" table
    const [showCategoryMonthlyTable, setShowCategoryMonthlyTable] = useState(false);


    // Refs for the Chart.js canvas elements
    const monthlySpendingChartRef = useRef<HTMLCanvasElement | null>(null);
    const categorySpendingChartRef = useRef<HTMLCanvasElement | null>(null);
    // Refs for the Chart.js instances
    const monthlySpendingChartInstance = useRef<Chart | null>(null);
    const categorySpendingChartInstance = useRef<Chart | null>(null);


    // Function to generate distinct colors for charts
    const generateColors = (numColors: number) => {
        const colors = [];
        const baseColors = [
            'rgba(75, 192, 192, 0.6)', 'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)', 'rgba(255, 206, 86, 0.6)',
            'rgba(153, 102, 255, 0.6)', 'rgba(255, 159, 64, 0.6)',
            'rgba(199, 199, 199, 0.6)', 'rgba(83, 102, 255, 0.6)',
            'rgba(231, 233, 237, 0.6)', 'rgba(120, 120, 120, 0.6)',
            'rgba(100, 200, 150, 0.6)', 'rgba(220, 180, 70, 0.6)'
        ];
        for (let i = 0; i < numColors; i++) {
            colors.push(baseColors[i % baseColors.length]);
        }
        return colors;
    };

    // Effect to handle Chart.js rendering and destruction for both charts
    useEffect(() => {
        if (spendingRecords.length > 0) {
            // --- Monthly Spending Line Chart ---
            if (monthlySpendingChartInstance.current) {
                monthlySpendingChartInstance.current.destroy();
            }

            const monthlySpending: { [key: string]: number } = {};
            const monthNames = ["January", "February", "March", "April", "May", "June",
                                "July", "August", "September", "October", "November", "December"];

            monthNames.forEach(month => monthlySpending[month] = 0);

            spendingRecords.filter(record => new Date(record.date).getFullYear().toString() === selectedYear)
                           .forEach(record => {
                const monthIndex = new Date(record.date).getMonth();
                const monthName = monthNames[monthIndex];
                monthlySpending[monthName] = (monthlySpending[monthName] || 0) + record.amount;
            });

            const monthlyChartLabels = monthNames;
            const monthlyChartData = monthlyChartLabels.map(month => monthlySpending[month]);

            if (monthlySpendingChartRef.current) {
                const ctxMonthly = monthlySpendingChartRef.current.getContext('2d');
                if (ctxMonthly) {
                    monthlySpendingChartInstance.current = new Chart(ctxMonthly, {
                        type: 'line',
                        data: {
                            labels: monthlyChartLabels,
                            datasets: [{
                                label: 'Total Spending',
                                data: monthlyChartData,
                                fill: false,
                                borderColor: 'rgba(75, 192, 192, 1)',
                                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                                tension: 0.3,
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
                                    text: `Monthly Spending Trends (${selectedYear})`,
                                    font: { size: 18, weight: 'bold' },
                                    color: '#E5E7EB',
                                },
                                legend: {
                                    labels: {
                                        color: '#E5E7EB',
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
                                        color: 'rgba(255, 255, 255, 0.1)',
                                    },
                                    ticks: {
                                        color: '#E5E7EB',
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
                                        color: 'rgba(255, 255, 255, 0.1)',
                                    },
                                    ticks: {
                                        callback: function(value: any) {
                                            return '$' + value;
                                        },
                                        color: '#E5E7EB',
                                    }
                                }
                            }
                        }
                    });
                }
            }

            // --- Total Spending by Category Bar Graph (Clickable) ---
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
            const categoryChartColors = generateColors(categoryChartLabels.length);


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
                                    backgroundColor: categoryChartColors,
                                    borderColor: categoryChartColors.map(color => color.replace('0.6', '1')),
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
                            onClick: (event, elements, chart) => {
                                if (elements.length > 0) {
                                    const clickedElementIndex = elements[0].index;
                                    const label = chart.data.labels?.[clickedElementIndex] as string;
                                    setSelectedCategoryFilter(label);
                                    setCurrentPageSpending(1);
                                } else {
                                    setSelectedCategoryFilter(null);
                                }
                            }
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
    }, [spendingRecords, selectedYear]); // Re-run effect when these dependencies change


    // --- Table Logic ---

    // Filtered and Sorted Spending Records
    const filteredAndSortedSpendingRecords = useMemo(() => {
        let filtered = spendingRecords.filter(record =>
            Object.values(record).some(value =>
                String(value).toLowerCase().includes(searchTermSpending.toLowerCase())
            )
        );

        // Apply category filter if active
        if (selectedCategoryFilter) {
            filtered = filtered.filter(record =>
                (record.category || 'Uncategorized').toLowerCase() === selectedCategoryFilter.toLowerCase()
            );
        }

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
                return sortDirectionSpending === 'asc' ? aValue - bValue : bValue - aValue; // Corrected bBValue to bValue
            }
            // Fallback for other types or mixed types
            return 0;
        });

        return filtered;
    }, [spendingRecords, searchTermSpending, sortColumnSpending, sortDirectionSpending, selectedCategoryFilter]);

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

    const handleClearCategoryFilter = () => {
        setSelectedCategoryFilter(null);
        setCurrentPageSpending(1); // Reset pagination
    };

    // --- Data preparation for "Spending by Category by Month" Table ---
    const categoryMonthlySummary = useMemo(() => {
        const summary: { [category: string]: { [month: string]: number } } = {};
        const monthNames = ["January", "February", "March", "April", "May", "June",
                            "July", "August", "September", "October", "November", "December"];

        // Initialize all months for each category
        const allCategories = Array.from(new Set(spendingRecords.map(r => r.category || 'Uncategorized')));
        allCategories.forEach(cat => {
            summary[cat] = {};
            monthNames.forEach(month => summary[cat][month] = 0);
        });

        // Populate with actual data for the selected year
        spendingRecords.filter(record => new Date(record.date).getFullYear().toString() === selectedYear)
                       .forEach(record => {
            const monthIndex = new Date(record.date).getMonth();
            const monthName = monthNames[monthIndex];
            const category = record.category || 'Uncategorized';
            summary[category][monthName] += record.amount;
        });

        return summary;
    }, [spendingRecords, selectedYear]);

    // Function to toggle expanded state for category rows
    const toggleCategoryExpansion = (category: string) => {
        setExpandedCategory(prev => (prev === category ? null : category));
    };

    // Function to toggle visibility of the entire "Spending by Category per Month" table
    const toggleCategoryMonthlyTableVisibility = () => {
        setShowCategoryMonthlyTable(prev => !prev);
    };

    // Calculate total spending for the selected year
    const totalSpendingForSelectedYear = useMemo(() => {
        return spendingRecords
            .filter(record => new Date(record.date).getFullYear().toString() === selectedYear)
            .reduce((sum, record) => sum + record.amount, 0);
    }, [spendingRecords, selectedYear]);


    return (
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
                    {/* Monthly Spending Line Chart with Year Selector and Total Spending */}
                    <div className="mt-6 p-4 bg-gray-600 rounded-lg mb-6 flex flex-col items-center">
                        <div className="mb-4 flex flex-col md:flex-row items-center justify-center gap-4 w-full">
                            <div className="flex items-center">
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
                            <div className="text-lg font-bold text-gray-100">
                                Total Spent ({selectedYear}): <span className="text-green-400">${totalSpendingForSelectedYear.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                        <div className="w-full h-80">
                            <canvas ref={monthlySpendingChartRef}></canvas>
                        </div>
                    </div>

                    {/* Total Spending by Category Bar Graph (Clickable) */}
                    <div className="mt-6 p-4 bg-gray-600 rounded-lg h-80 mb-6">
                        <canvas ref={categorySpendingChartRef}></canvas>
                    </div>

                    {/* Toggle button for Spending by Category by Month Table */}
                    <div className="text-center mb-6">
                        <button
                            onClick={toggleCategoryMonthlyTableVisibility}
                            className="px-6 py-3 rounded-md bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            {showCategoryMonthlyTable ? 'Hide Monthly Category Breakdown' : 'Show Monthly Category Breakdown'}
                        </button>
                    </div>

                    {/* Spending by Category by Month Table (Conditionally rendered) */}
                    {showCategoryMonthlyTable && (
                        <div className="mt-6 p-4 bg-gray-600 rounded-lg mb-6 animate-fade-in">
                            <h3 className="text-2xl font-bold text-gray-100 mb-4 text-center">
                                Spending by Category per Month ({selectedYear})
                            </h3>
                            <div className="overflow-x-auto bg-gray-800 rounded-lg shadow-md border border-gray-700">
                                <table className="min-w-full divide-y divide-gray-700">
                                    <thead className="bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                                Category
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                                Total
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                                Details
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                                        {Object.entries(categoryMonthlySummary).map(([category, monthsData]) => {
                                            const totalCategorySpending = Object.values(monthsData).reduce((sum, amount) => sum + amount, 0);
                                            const isExpanded = expandedCategory === category;
                                            const monthNames = ["January", "February", "March", "April", "May", "June",
                                                                "July", "August", "September", "October", "November", "December"];

                                            return (
                                                <React.Fragment key={category}>
                                                    <tr>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">
                                                            {category}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                                                            ${totalCategorySpending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                                                            <button
                                                                onClick={() => toggleCategoryExpansion(category)}
                                                                className="px-3 py-1 rounded-md bg-indigo-600 text-white text-xs hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                            >
                                                                {isExpanded ? 'Hide Months' : 'Show Months'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    {isExpanded && (
                                                        <tr>
                                                            <td colSpan={3} className="p-0">
                                                                <div className="bg-gray-700 p-4 border-t border-gray-600">
                                                                    <h4 className="text-lg font-semibold text-gray-100 mb-2">
                                                                        Monthly Breakdown for {category}
                                                                    </h4>
                                                                    <ul className="list-disc list-inside text-gray-300">
                                                                        {monthNames.map(month => (
                                                                            <li key={month} className="py-1">
                                                                                {month}: ${monthsData[month].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                        {Object.keys(categoryMonthlySummary).length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-4 text-center text-gray-400">
                                                    No category spending data for {selectedYear}.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
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

            {/* Clear Category Filter Button */}
            {selectedCategoryFilter && (
                <div className="text-center mb-4">
                    <span className="text-gray-300 mr-2">
                        Filtering by: <span className="font-bold text-indigo-400">{selectedCategoryFilter}</span>
                    </span>
                    <button
                        onClick={handleClearCategoryFilter}
                        className="px-3 py-1 rounded-md bg-red-600 text-white text-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                        Clear Filter
                    </button>
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
    );
};

export default SpendingTab;
