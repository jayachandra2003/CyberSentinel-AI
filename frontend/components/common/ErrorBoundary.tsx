"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught Error Boundary catch:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-4">
          <AlertTriangle className="h-12 w-12 text-rose-500 mb-4 animate-bounce" />
          <h2 className="text-xl font-bold mb-2">Security Application Exception Intercepted</h2>
          <p className="text-slate-400 text-sm mb-6 text-center max-w-md">
            An unforeseen runtime error occurred within the dashboard component layer.
          </p>
          <Button onClick={() => this.setState({ hasError: false })}>Reload Interface</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
