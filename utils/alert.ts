// Re-export the global alert functions from AlertContext
// These work from anywhere — components and non-components alike
export { showAlertGlobal as showAlert, showConfirmGlobal as showConfirm } from '../contexts/AlertContext';
