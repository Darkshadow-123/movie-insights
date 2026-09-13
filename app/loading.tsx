import { LoadingSpinner } from './components';

export default function Loading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
      <LoadingSpinner />
    </div>
  );
}
