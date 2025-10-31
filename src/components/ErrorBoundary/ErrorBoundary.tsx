import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { ErrorFactory, AppError, DataRecoveryManager } from '../../utils/errorHandling';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: AppError) => void;
  culturalContext?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  appError: AppError | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      appError: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const appError = ErrorFactory.createStorageError(
      `React Error Boundary: ${error.message}`,
      {
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      }
    );

    this.setState({
      errorInfo,
      appError,
    });

    if (this.props.onError) {
      this.props.onError(appError);
    }

    // Log error for debugging
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      appError: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleCreateBackup = () => {
    try {
      // Try to get current app state for backup
      const appState = {
        timestamp: new Date().toISOString(),
        error: this.state.error?.message,
        url: window.location.href,
      };
      
      DataRecoveryManager.createBackup(appState, 'Respaldo de emergencia');
      alert('Respaldo creado exitosamente');
    } catch (error) {
      console.error('Failed to create backup:', error);
      alert('No se pudo crear el respaldo');
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { culturalContext = true } = this.props;
      const { error, appError } = this.state;

      return (
        <div className={styles.errorBoundary} role="alert">
          <Card variant="elevated" padding="large" className={styles.errorCard}>
            <div className={styles.errorHeader}>
              <div className={styles.errorIcon} aria-hidden="true">
                🕯️
              </div>
              <h2 className={styles.errorTitle}>
                {culturalContext 
                  ? 'La llama del altar se ha apagado'
                  : 'Ha ocurrido un error inesperado'
                }
              </h2>
            </div>

            <div className={styles.errorContent}>
              {culturalContext ? (
                <p className={styles.culturalMessage}>
                  Como las velas que a veces se apagan en el viento, 
                  nuestra aplicación ha encontrado un problema. 
                  Pero así como encendemos nuevas velas para honrar a nuestros seres queridos, 
                  podemos reiniciar y continuar preservando nuestras memorias familiares.
                </p>
              ) : (
                <p className={styles.errorMessage}>
                  La aplicación ha encontrado un error inesperado. 
                  Tus datos están seguros y puedes intentar continuar.
                </p>
              )}

              {appError?.userMessage && (
                <div className={styles.userMessage}>
                  <strong>Detalles:</strong> {appError.userMessage}
                </div>
              )}

              {process.env.NODE_ENV === 'development' && error && (
                <details className={styles.errorDetails}>
                  <summary>Detalles técnicos (desarrollo)</summary>
                  <pre className={styles.errorStack}>
                    {error.message}
                    {error.stack && `\n\n${error.stack}`}
                  </pre>
                </details>
              )}
            </div>

            <div className={styles.errorActions}>
              <div className={styles.primaryActions}>
                <Button
                  variant="primary"
                  onClick={this.handleRetry}
                  aria-label="Intentar continuar sin recargar la página"
                >
                  🔄 Intentar de nuevo
                </Button>
                
                <Button
                  variant="secondary"
                  onClick={this.handleReload}
                  aria-label="Recargar la página completamente"
                >
                  🔃 Recargar página
                </Button>
              </div>

              <div className={styles.secondaryActions}>
                <Button
                  variant="outline"
                  size="small"
                  onClick={this.handleCreateBackup}
                  aria-label="Crear respaldo de emergencia de los datos"
                >
                  💾 Crear respaldo
                </Button>
              </div>
            </div>

            {/* Cultural decorative elements */}
            {culturalContext && (
              <div className={styles.culturalDecorations} aria-hidden="true">
                <div className={styles.marigoldBorder}></div>
                <div className={styles.candleFlame}></div>
              </div>
            )}
          </Card>

          {/* Recovery suggestions */}
          <Card variant="outlined" padding="medium" className={styles.recoveryCard}>
            <h3 className={styles.recoveryTitle}>
              💡 Sugerencias para recuperarse
            </h3>
            <ul className={styles.recoveryList}>
              <li>Intenta recargar la página</li>
              <li>Verifica tu conexión a internet</li>
              <li>Cierra otras pestañas del navegador</li>
              <li>Si el problema persiste, crea un respaldo de tus datos</li>
              {culturalContext && (
                <li>Recuerda: tus memorias familiares están seguras en el almacenamiento local</li>
              )}
            </ul>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary for functional components
 */
export const useErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return {
    captureError,
    resetError,
  };
};

/**
 * Higher-order component for wrapping components with error boundary
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};