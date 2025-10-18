export default function Card({ children, className = '', hover = false }) {
  return (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg ${
        hover ? 'hover:shadow-2xl hover:-translate-y-1' : ''
      } transition-all duration-300 ${className}`}
    >
      {children}
    </div>
  );
}
