import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[Seldarzu] Bileşen hatası:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0b0f19',
        gap: '16px',
        padding: '24px',
        textAlign: 'center',
      }}>
        <AlertTriangle size={48} color="#ef4444" />
        <h2 style={{ color: '#fff', fontSize: '1.4rem', margin: 0 }}>
          Bir şeyler ters gitti
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: '400px', margin: 0 }}>
          {this.props.label || 'Bu bileşen yüklenirken hata oluştu.'}
        </p>
        {this.state.error && (
          <code style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px',
            padding: '10px 16px',
            color: '#fca5a5',
            fontSize: '0.8rem',
            maxWidth: '500px',
            wordBreak: 'break-word',
          }}>
            {this.state.error.message}
          </code>
        )}
        <button
          onClick={() => this.setState({ hasError: false, error: null })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '8px',
            padding: '10px 20px',
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: 600,
          }}
        >
          <RefreshCw size={16} />
          Tekrar Dene
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
