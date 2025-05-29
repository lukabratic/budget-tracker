// frontend/src/UploadPage.tsx
import React, { useRef, useState } from 'react';

// Define props for the component
interface UploadPageProps {
    onUploadSuccess: () => void; // Callback to notify parent (App.tsx)
}

const UploadPage: React.FC<UploadPageProps> = ({ onUploadSuccess }) => {
    const spendingFileInputRef = useRef<HTMLInputElement>(null);
    const incomeFileInputRef = useRef<HTMLInputElement>(null);

    const [uploadingSpending, setUploadingSpending] = useState(false);
    const [uploadingIncome, setUploadingIncome] = useState(false);
    const [spendingMessage, setSpendingMessage] = useState('');
    const [incomeMessage, setIncomeMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const handleFileUpload = async (file: File | null, type: 'spending' | 'income') => {
        if (!file) {
            setErrorMessage(`No file selected for ${type}.`);
            return;
        }

        setErrorMessage('');
        let setUploading = type === 'spending' ? setUploadingSpending : setUploadingIncome;
        let setMessage = type === 'spending' ? setSpendingMessage : setIncomeMessage;

        setUploading(true);
        setMessage('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`http://localhost:5000/api/upload/${type}`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message);
                // Optionally, if both are uploaded, then navigate
                // For simplicity now, we'll let the user manually trigger navigation
                // or you can add logic here to check if both are done before calling onUploadSuccess
            } else {
                setErrorMessage(data.error || `Failed to upload ${type} data.`);
            }
        } catch (error) {
            console.error('Upload error:', error);
            setErrorMessage(`Network error or server unreachable for ${type} upload.`);
        } finally {
            setUploading(false);
            // Clear the file input value so the same file can be re-selected if needed
            if (type === 'spending' && spendingFileInputRef.current) {
                spendingFileInputRef.current.value = '';
            }
            if (type === 'income' && incomeFileInputRef.current) {
                incomeFileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 min-h-screen flex items-center justify-center p-4 font-inter">
            <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-2xl text-center">
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-8">Upload Budget Data</h1>
                <p className="text-gray-700 text-lg mb-8">
                    Please upload your spending and income data Excel sheets.
                </p>

                {errorMessage && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                        <strong className="font-bold">Error!</strong>
                        <span className="block sm:inline"> {errorMessage}</span>
                    </div>
                )}

                <div className="flex flex-col md:flex-row justify-center gap-6 mb-8">
                    {/* Spending Upload */}
                    <div className="flex flex-col items-center p-4 bg-blue-50 rounded-lg shadow-md border border-blue-200 w-full md:w-1/2">
                        <h2 className="text-2xl font-bold text-blue-800 mb-4">Spending Data</h2>
                        <input
                            type="file"
                            ref={spendingFileInputRef}
                            onChange={(e) => handleFileUpload(e.target.files ? e.target.files[0] : null, 'spending')}
                            accept=".xls,.xlsx"
                            className="hidden" // Hide the default input
                        />
                        <button
                            onClick={() => spendingFileInputRef.current?.click()}
                            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full transition-colors duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={uploadingSpending}
                        >
                            {uploadingSpending ? 'Uploading...' : 'Upload Spending Excel'}
                        </button>
                        {spendingMessage && <p className="mt-2 text-sm text-blue-700">{spendingMessage}</p>}
                    </div>

                    {/* Income Upload */}
                    <div className="flex flex-col items-center p-4 bg-green-50 rounded-lg shadow-md border border-green-200 w-full md:w-1/2">
                        <h2 className="text-2xl font-bold text-green-800 mb-4">Income Data</h2>
                        <input
                            type="file"
                            ref={incomeFileInputRef}
                            onChange={(e) => handleFileUpload(e.target.files ? e.target.files[0] : null, 'income')}
                            accept=".xls,.xlsx"
                            className="hidden" // Hide the default input
                        />
                        <button
                            onClick={() => incomeFileInputRef.current?.click()}
                            className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-full transition-colors duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={uploadingIncome}
                        >
                            {uploadingIncome ? 'Uploading...' : 'Upload Income Excel'}
                        </button>
                        {incomeMessage && <p className="mt-2 text-sm text-green-700">{incomeMessage}</p>}
                    </div>
                </div>

                {/* Button to proceed to main app after uploads */}
                {(spendingMessage || incomeMessage) && !uploadingSpending && !uploadingIncome && (
                    <button
                        onClick={onUploadSuccess}
                        className="mt-8 bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-8 rounded-full transition-colors duration-300 shadow-xl text-lg"
                    >
                        Go to Budget Tracker
                    </button>
                )}
            </div>
        </div>
    );
};

export default UploadPage;
