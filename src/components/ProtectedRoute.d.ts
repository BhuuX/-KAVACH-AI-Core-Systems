import { ReactNode } from 'react';

export interface ProtectedRouteProps {
  children: ReactNode;
  roles?: string[];
}

declare const ProtectedRoute: (props: ProtectedRouteProps) => JSX.Element;
export default ProtectedRoute;
