import { useEffect } from 'react';
import { IoClose, IoCheckmarkCircle, IoWarning, IoAlert, IoRefresh } from 'react-icons/io5';

export const AlertBanner = ({ 
    message, 
    type = 'info', 
    onClose, 
    autoClose = true,
    autoCloseDuration = 5000 
}) => {
    
    useEffect(() => {
        // Auto close after specified duration (skip for loading type)
        if (autoClose && type !== 'loading' && onClose) {
            const timer = setTimeout(onClose, autoCloseDuration);
            return () => clearTimeout(timer);
        }
    }, [autoClose, onClose, type, autoCloseDuration]);

    if (!message) return null;

    // Type-specific styling
    const alertStyles = {
        success: {
            bg: 'bg-green-50',
            border: 'border-green-200',
            text: 'text-green-800',
            icon: <IoCheckmarkCircle className="text-green-600" />,
        },
        error: {
            bg: 'bg-red-50',
            border: 'border-red-200',
            text: 'text-red-800',
            icon: <IoAlert className="text-red-600" />,
        },
        warning: {
            bg: 'bg-yellow-50',
            border: 'border-yellow-200',
            text: 'text-yellow-800',
            icon: <IoWarning className="text-yellow-600" />,
        },
        info: {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            text: 'text-blue-800',
            icon: <IoAlert className="text-blue-600" />,
        },
        loading: {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            text: 'text-blue-800',
            icon: <IoRefresh className="text-blue-600 animate-spin" />,
        },
    };

    const style = alertStyles[type] || alertStyles.info;

    return (
        <div 
            className={`fixed top-4 left-4 ${style.bg} border ${style.border} ${style.text} px-4 py-3 rounded-lg shadow-lg max-w-md z-[9999] flex items-start gap-3 whitespace-normal break-words`}
        >
            {/* Icon */}
            <div className="flex-shrink-0 text-xl mt-0.5">
                {style.icon}
            </div>

            {/* Message */}
            <div className="flex-1 text-sm font-medium">
                {message}
            </div>

            {/* Close button */}
            {onClose && (
                <button
                    onClick={onClose}
                    className="flex-shrink-0 text-lg hover:opacity-70 transition-opacity"
                >
                    <IoClose />
                </button>
            )}
        </div>
    );
};
