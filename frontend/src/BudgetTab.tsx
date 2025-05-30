// frontend/src/BudgetTab.tsx
import React, { useState, useEffect, useMemo } from 'react';

// Define interfaces for data (copied from App.tsx for self-containment)
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

interface BudgetTabProps {
    spendingRecords: SpendingRecord[];
    incomeRecords: IncomeRecord[];
}

const BudgetTab: React.FC<BudgetTabProps> = ({ spendingRecords, incomeRecords }) => {
    // State to store planned expenses for each category
    const [plannedExpenses, setPlannedExpenses] = useState<{[key: string]: number}>({});

    // State for table sorting
    const [sortColumnBudget, setSortColumnBudget] = useState<string | null>('category'); // Default sort by category
    const [sortDirectionBudget, setSortDirectionBudget] = useState<'asc' | 'desc'>('asc');

    // Define fixed categories that should always be present
    const fixedCategories = useMemo(() => ['Savings', 'Investing', 'Misc'], []);

    // Calculate previous month's spending for each category
    const previousMonthExpenses = useMemo(() => {
        const summary: {[key: string]: number} = {};
        const now = new Date();
        // Calculate the previous month and year
        const previousMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1; // 0-indexed month
        const previousMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

        spendingRecords.forEach(record => {
            const recordDate = new Date(record.date);
            if (recordDate.getMonth() === previousMonth && recordDate.getFullYear() === previousMonthYear) {
                const category = record.category || 'Uncategorized';
                summary[category] = (summary[category] || 0) + record.amount;
            }
        });

        // Fixed categories explicitly do not have a previous month's expense, so we don't initialize them here.
        // They will be handled as 'N/A' in the render logic.

        return summary;
    }, [spendingRecords]);

    // Get all unique spending categories from records, plus fixed ones
    const allCategories = useMemo(() => {
        const dynamicCategories = Array.from(new Set(spendingRecords.map(r => r.category || 'Uncategorized')));
        // Combine and ensure uniqueness
        const combined = [...new Set([...dynamicCategories, ...fixedCategories])];
        return combined; // We will sort this array in sortedCategories useMemo
    }, [spendingRecords, fixedCategories]);

    // Initialize planned expenses when categories change
    useEffect(() => {
        const initialPlanned: {[key: string]: number} = {};
        allCategories.forEach(category => {
            // Initialize with existing planned value or 0
            initialPlanned[category] = plannedExpenses[category] !== undefined ? plannedExpenses[category] : 0;
        });
        setPlannedExpenses(initialPlanned);
    }, [allCategories]); // Only re-initialize when categories change

    // Calculate average monthly income
    const averageMonthlyIncome = useMemo(() => {
        if (incomeRecords.length === 0) return 0;

        const incomeByMonth: { [key: string]: number } = {}; // 'YYYY-MM' -> total income

        incomeRecords.forEach(record => {
            const date = new Date(record.date);
            const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            incomeByMonth[yearMonth] = (incomeByMonth[yearMonth] || 0) + record.net_income;
        });

        const totalMonths = Object.keys(incomeByMonth).length;
        if (totalMonths === 0) return 0;

        const totalIncomeSum = Object.values(incomeByMonth).reduce((sum, income) => sum + income, 0);
        return totalIncomeSum / totalMonths;
    }, [incomeRecords]);

    // Calculate planned total expenses
    const calculatedPlannedTotalExpenses = useMemo(() => {
        return Object.values(plannedExpenses).reduce((sum, amount) => sum + (Number(amount) || 0), 0);
    }, [plannedExpenses]);

    // Calculate remaining budget
    const remainingBudget = useMemo(() => {
        return averageMonthlyIncome - calculatedPlannedTotalExpenses;
    }, [averageMonthlyIncome, calculatedPlannedTotalExpenses]);

    // Handle changes in planned expense input fields
    const handlePlannedExpenseChange = (category: string, value: string) => {
        const numValue = parseFloat(value);
        setPlannedExpenses(prev => ({
            ...prev,
            [category]: isNaN(numValue) ? 0 : numValue, // Store 0 if input is not a valid number
        }));
    };

    // Handle table sorting
    const handleSortBudget = (column: string) => {
        if (sortColumnBudget === column) {
            setSortDirectionBudget(sortDirectionBudget === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumnBudget(column);
            setSortDirectionBudget('asc'); // Default to ascending when changing column
        }
    };

    // Sorted categories for table display (NEW)
    const sortedCategories = useMemo(() => {
        let currentCategories = [...allCategories];

        if (sortColumnBudget === 'category') {
            currentCategories.sort((a, b) => {
                if (sortDirectionBudget === 'asc') {
                    return a.localeCompare(b);
                } else {
                    return b.localeCompare(a);
                }
            });
        } else if (sortColumnBudget === 'previousMonthExpense') {
            currentCategories.sort((a, b) => {
                // Fixed categories (Savings, Investing, Misc) always sort to the bottom for this column
                const isAFixed = fixedCategories.includes(a);
                const isBFixed = fixedCategories.includes(b);

                if (isAFixed && !isBFixed) return sortDirectionBudget === 'asc' ? 1 : -1; // A is fixed, B is not -> A goes down
                if (!isAFixed && isBFixed) return sortDirectionBudget === 'asc' ? -1 : 1; // B is fixed, A is not -> B goes down
                if (isAFixed && isBFixed) return a.localeCompare(b); // Both fixed, sort by category name

                // For dynamic categories, sort by previous month's expense
                const prevA = previousMonthExpenses[a] || 0;
                const prevB = previousMonthExpenses[b] || 0;

                if (sortDirectionBudget === 'asc') {
                    return prevA - prevB;
                } else {
                    return prevB - prevA;
                }
            });
        }
        return currentCategories;
    }, [allCategories, sortColumnBudget, sortDirectionBudget, previousMonthExpenses, fixedCategories]);


    return (
        <div className="flex-grow p-6 bg-gray-700 rounded-lg border border-gray-600 shadow-inner animate-fade-in text-gray-100">
            <h2 className="text-3xl font-bold text-blue-300 mb-4">Your Budget Overview</h2>
            <p className="text-gray-300 text-lg mb-6">
                Plan your expenses and see your remaining budget based on your average monthly income.
            </p>

            {/* Summary Section */}
            <div className="bg-gray-600 rounded-lg p-4 mb-6 flex flex-col md:flex-row justify-around items-center gap-4">
                <div className="text-center">
                    <p className="text-lg font-semibold text-blue-300">Average Monthly Income:</p>
                    <p className="text-2xl font-bold text-blue-100">${averageMonthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="text-center">
                    <p className="text-lg font-semibold text-blue-300">Planned Total Expenses:</p>
                    <p className="text-2xl font-bold text-blue-100">${calculatedPlannedTotalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="text-center">
                    <p className="text-lg font-semibold text-blue-300">Remaining Budget:</p>
                    <p className={`text-2xl font-bold ${remainingBudget >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${remainingBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {/* Budget Planning Table */}
            <div className="mt-8 overflow-x-auto bg-gray-800 rounded-lg shadow-md border border-gray-700">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-700">
                        <tr>
                            <th scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                onClick={() => handleSortBudget('category')}>
                                Category
                                {sortColumnBudget === 'category' && (sortDirectionBudget === 'asc' ? ' ▲' : ' ▼')}
                            </th>
                            <th scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                onClick={() => handleSortBudget('previousMonthExpense')}>
                                Prev. Month Expense
                                {sortColumnBudget === 'previousMonthExpense' && (sortDirectionBudget === 'asc' ? ' ▲' : ' ▼')}
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                Planned Expense
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                        {sortedCategories.length > 0 ? (
                            sortedCategories.map(category => (
                                <tr key={category}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">
                                        {category}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                                        {fixedCategories.includes(category)
                                            ? 'N/A'
                                            : `$${(previousMonthExpenses[category] || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={plannedExpenses[category] !== undefined ? plannedExpenses[category] : ''}
                                            onChange={(e) => handlePlannedExpenseChange(category, e.target.value)}
                                            className="w-28 p-2 rounded-md bg-gray-600 text-white placeholder-gray-400 border border-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </td>
                                </tr>
                            ))
                        ) : (
                             <tr>
                                <td colSpan={3} className="px-6 py-4 text-center text-gray-400">
                                    No categories found. Please upload spending and income data.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BudgetTab;
