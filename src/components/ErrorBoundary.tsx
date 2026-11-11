import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { StatePanel } from './StatePanel.tsx';

interface Props {
  children: React.ReactNode;
  onHome: () => void;
}

interface State {
  failed: boolean;
}

/**
 * Catches an unexpected crash in one page, so the rest of the app keeps working
 * and the learner gets a way out. The page is remounted when the tab changes.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Page error:', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <StatePanel
        tone="error"
        icon={<AlertTriangle className="h-5 w-5" />}
        title="This page stopped working"
        body="Something unexpected happened. Your other work is safe. Try again, or go back to the home page."
        action={{ label: 'Try again', onClick: () => this.setState({ failed: false }) }}
        secondary={{ label: 'Go to home', onClick: () => { this.setState({ failed: false }); this.props.onHome(); } }}
      />
    );
  }
}
