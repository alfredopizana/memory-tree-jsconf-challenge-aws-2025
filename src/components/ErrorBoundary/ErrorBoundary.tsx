import { Component, ErrorInfo, ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={styles.errorBoundary} role="alert">
          <div className={styles.errorContent}>
            <div className={styles.errorIcon}>⚠️</div>
            <h2 className={styles.errorTitle}>Algo salió mal</h2>
            <p className={styles.errorMessage}>
              Lo sentimos, ocurrió un error inesperado en la aplicación.
            </p>
            {this.state.error && (
              <details className={styles.errorDetails}>
                <summary>Detalles técnicos</summary>
                <pre className={styles.errorStack}>
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className={styles.errorActions}>
              <button 
                className={styles.retryButton}
                onClick={this.handleRetry}
              >
                Intentar de nuevo
              </button>
              <button 
                className={styles.reloadButton}
                onClick={() => window.location.reload()}
              >
                Recargar página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}