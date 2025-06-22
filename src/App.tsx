import { DashboardLayout } from './components/dashboard/DashboardLayout';
import Index from './components/Index';

function App() {
  // Protected route logic - only show the main content if user is authenticated
  return (
    <DashboardLayout>
      <Index />
    </DashboardLayout>
  );
}

export default App;
