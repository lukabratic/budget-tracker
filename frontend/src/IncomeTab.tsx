// frontend/src/IncomeTab.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Chart from 'chart.js/auto'; // Import Chart.js for the new chart

// Define interfaces for data
interface IncomeRecord {
    id: number;
    date: string;
    source: string;
    net_income: number;
}

interface IncomeTabProps {
    incomeRecords: IncomeRecord[];
    loadingIncome: boolean;
    incomeError: string | null;
}

const IncomeTab: React.FC<IncomeTabProps> = ({
    incomeRecords,
    loadingIncome,
    incomeError,
}) => {
    // State for income table sorting
    const [sortColumnIncome, setSortColumnIncome] = useState<keyof IncomeRecord>('date');
    const [sortDirectionIncome, setSortDirectionIncome] = useState<'asc' | 'desc'>('desc');

    // State for income table pagination
    const [currentPageIncome, setCurrentPageIncome] = useState(1);
    const [itemsPerPageIncome, setItemsPerPageIncome] = useState(10);

    // State for income table search
    const [searchTermIncome, setSearchTermIncome] = useState('');

    // State for year selection in monthly income chart (NEW)
    const [selectedYearIncome, setSelectedYearIncome] = useState<string>(String(new Date().getFullYear()));
    const [availableYearsIncome, setAvailableYearsIncome] = useState<string[]>([]);

    // Ref for the new monthly income chart canvas and its instance (NEW)
    const monthlyIncomeChartRef = useRef<HTMLCanvasElement | null>(null);
    const monthlyIncomeChartInstance = useRef<Chart | null>(null);


    // Effect to extract unique years from incomeRecords for the dropdown (NEW)
    useEffect(() => {
        if (incomeRecords.length > 0) {
            const years = Array.from(new Set(
                incomeRecords.map(record => new Date(record.date).getFullYear().toString())
            )).sort((a, b) => parseInt(b) - parseInt(a)); // Sort descending
            setAvailableYearsIncome(years);
            if (years.length > 0 && !years.includes(selectedYearIncome)) {
                setSelectedYearIncome(years[0]); // Set to the latest year if current year not in data
            } else if (years.length === 0) {
                setSelectedYearIncome(String(new Date().getFullYear())); // Reset to current year if no data
            }
        } else {
            setAvailableYearsIncome([]);
            setSelectedYearIncome(String(new Date().getFullYear()));
        }
    }, [incomeRecords]); // Dependency on incomeRecords to re-calculate years


    // Effect to handle Chart.js rendering and destruction for the monthly income chart (NEW)
    useEffect(() => {
        if (incomeRecords.length > 0 && monthlyIncomeChartRef.current) {
            // Destroy existing chart instance if it exists
            if (monthlyIncomeChartInstance.current) {
                monthlyIncomeChartInstance.current.destroy();
            }

            const monthlyIncome: { [key: string]: number } = {};
            const monthNames = ["January", "February", "March", "April", "May", "June",
                                "July", "August", "September", "October", "November", "December"];

            // Initialize all months for the selected year to 0
            monthNames.forEach(month => monthlyIncome[month] = 0);

            incomeRecords.filter(record => new Date(record.date).getFullYear().toString() === selectedYearIncome)
                           .forEach(record => {
                const monthIndex = new Date(record.date).getMonth();
                const monthName = monthNames[monthIndex];
                monthlyIncome[monthName] = (monthlyIncome[monthName] || 0) + record.net_income;
            });

            const monthlyChartLabels = monthNames;
            const monthlyChartData = monthlyChartLabels.map(month => monthlyIncome[month]);

            const ctx = monthlyIncomeChartRef.current.getContext('2d');
            if (ctx) {
                monthlyIncomeChartInstance.current = new Chart(ctx, {
                    type: 'bar', // Bar graph for income by month
                    data: {
                        labels: monthlyChartLabels,
                        datasets: [
                            {
                                label: 'Income by Month',
                                data: monthlyChartData,
                                backgroundColor: 'rgba(255, 206, 86, 0.6)', // Yellowish color for income
                                borderColor: 'rgba(255, 206, 86, 1)',
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
                                text: `Monthly Income Breakdown (${selectedYearIncome})`,
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
                                        return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

        // Cleanup function: destroy chart when component unmounts or selectedYearIncome changes
        return () => {
            if (monthlyIncomeChartInstance.current) {
                monthlyIncomeChartInstance.current.destroy();
                monthlyIncomeChartInstance.current = null;
            }
        };
    }, [incomeRecords, selectedYearIncome]); // Re-run effect when these dependencies change


    // Calculate total income for the selected year (NEW)
    const totalIncomeForSelectedYear = useMemo(() => {
        return incomeRecords
            .filter(record => new Date(record.date).getFullYear().toString() === selectedYearIncome)
            .reduce((sum, record) => sum + record.net_income, 0);
    }, [incomeRecords, selectedYearIncome]);


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

    return (
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
                    {/* Year Selector and Total Income Display (NEW) */}
                    <div className="mt-6 p-4 bg-gray-600 rounded-lg mb-6 flex flex-col items-center">
                        <div className="mb-4 flex flex-col md:flex-row items-center justify-center gap-4 w-full">
                            <div className="flex items-center">
                                <label htmlFor="income-year-select" className="text-gray-300 mr-2">Select Year:</label>
                                <select
                                    id="income-year-select"
                                    value={selectedYearIncome}
                                    onChange={(e) => setSelectedYearIncome(e.target.value)}
                                    className="p-2 rounded-md bg-gray-700 text-white border border-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    {availableYearsIncome.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="text-lg font-bold text-gray-100">
                                Total Income ({selectedYearIncome}): <span className="text-yellow-400">${totalIncomeForSelectedYear.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                        {/* Monthly Income Bar Graph (NEW) */}
                        <div className="w-full h-80">
                            <canvas ref={monthlyIncomeChartRef}></canvas>
                        </div>
                    </div>


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
    );
};

export default IncomeTab;
