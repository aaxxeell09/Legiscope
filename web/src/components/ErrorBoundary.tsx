import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Attrape une erreur de rendu et affiche son message à la place de la zone,
 * pour qu'un bloc cassé n'emporte pas la page. `resetKey` : changer la clé
 * (la route, par exemple) réessaie le rendu.
 */
export class ErrorBoundary extends Component<{ children: ReactNode; zone?: string; resetKey?: string }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.zone ?? "vue"}]`, error, info.componentStack);
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="status status-error erreur-zone" role="alert">
          {this.props.zone ? `${this.props.zone} : ` : ""}
          {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}
