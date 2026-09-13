// src/world/loader/WorldErrorBoundary.jsx
//
// A missing/corrupt world GLB (404, parse failure) must never blank the sim:
// this boundary catches loader throws and renders the fallback stage instead.

import { Component } from "react";

export class WorldErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(err) {
    console.warn("[CompanyWorld] world failed to load, using default:", err?.message ?? err);
  }

  componentDidUpdate(prevProps) {
    // Reset when the requested world changes so a later good load retries.
    if (prevProps.worldPath !== this.props.worldPath && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (this.state.failed) {
      const { fallback } = this.props;
      return fallback ?? null;
    }
    return this.props.children;
  }
}
