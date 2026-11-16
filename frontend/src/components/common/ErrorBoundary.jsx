import React from 'react'
import { WarningOctagon, ArrowClockwise, House } from '@phosphor-icons/react'
import { Button } from './Button'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled exception:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    } else {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[70vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 shadow-lg p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <WarningOctagon size={28} weight="duotone" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900">
              {this.props.title || 'Security Telemetry Render Interruption'}
            </h2>
            <p className="text-xs text-zinc-600 leading-relaxed">
              {this.props.description ||
                'A display error occurred while rendering this fraud risk report. The transaction audit telemetry is safely recorded.'}
            </p>
            {this.state.error?.message && (
              <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-[11px] font-mono text-zinc-700 text-left overflow-x-auto">
                {this.state.error.message}
              </div>
            )}
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                icon={ArrowClockwise}
                onClick={this.handleReset}
              >
                Reload View
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={House}
                onClick={() => {
                  window.location.href = '/dashboard'
                }}
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

