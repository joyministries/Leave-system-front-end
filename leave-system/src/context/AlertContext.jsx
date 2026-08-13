import { AlertContext } from "../hooks/alerthook";
import { useState, useCallback, useMemo } from "react";
import { AlertBanner } from "../components/AlertBanner";
import { formatApiError } from "../services/ApiClient";

// AlertProvider component
export const AlertProvider = ({ children }) => {
    const [alert, setAlert] = useState(null);

    const showAlert = useCallback((message, type = 'info', duration = 5000) => {
        const finalMessage = typeof message === 'string'
            ? message
            : formatApiError(message);
        setAlert({ message: finalMessage, type, duration });
    }, []);

    const showSuccess = useCallback((message, duration = 5000) => {
        showAlert(message, 'success', duration);
    }, [showAlert]);

    const showError = useCallback((message, duration = 6000) => {
        showAlert(message, 'error', duration);
    }, [showAlert]);

    const showWarning = useCallback((message, duration = 5000) => {
        showAlert(message, 'warning', duration);
    }, [showAlert]);

    const showInfo = useCallback((message, duration = 5000) => {
        showAlert(message, 'info', duration);
    }, [showAlert]);

    const showLoading = useCallback((message) => {
        showAlert(message, 'loading', 0);
    }, [showAlert]);

    const hideAlert = useCallback(() => {
        setAlert(null);
    }, []);

    const contextValue = useMemo(() => ({
        showAlert,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        showLoading,
        hideAlert,
    }), [showAlert, showSuccess, showError, showWarning, showInfo, showLoading, hideAlert]);

    return (
        <AlertContext.Provider value={contextValue}>
            {children}
            {alert && (
                <AlertBanner
                    message={alert.message}
                    type={alert.type}
                    onClose={hideAlert}
                    autoClose={alert.duration > 0}
                    autoCloseDuration={alert.duration}
                />
            )}
        </AlertContext.Provider>
    );
};
