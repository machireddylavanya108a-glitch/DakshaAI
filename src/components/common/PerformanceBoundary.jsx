import { memo, Suspense } from 'react';

const PerformanceBoundary = memo(function PerformanceBoundary({ children, fallback = null }) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
});

export default PerformanceBoundary;
