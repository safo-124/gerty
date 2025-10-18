export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-3 rounded-lg border-2 ${
          error 
            ? 'border-red-500 focus:border-red-600' 
            : 'border-gray-300 focus:border-blue-600 dark:border-gray-600 dark:focus:border-blue-400'
        } focus:outline-none focus:ring-2 ${
          error ? 'focus:ring-red-200' : 'focus:ring-blue-200'
        } transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
