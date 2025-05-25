import { render, screen, fireEvent } from '@testing-library/react';
import DashboardPage from '../page';
import { useAuth } from '@/context/AuthContext';

// Mock the hooks and components
jest.mock('@/context/AuthContext');
jest.mock('@/components/auth/ProtectedRoute', () => {
  return function MockProtectedRoute({ children }: { children: React.ReactNode }) {
    return <div data-testid="protected-route">{children}</div>;
  };
});
jest.mock('@/components/auth/LogoutButton', () => {
  return function MockLogoutButton() {
    return <button data-testid="logout-button">Logout</button>;
  };
});
jest.mock('@/components/dashboard/ImageUpload', () => {
  return function MockImageUpload({ onImageUploaded }: { onImageUploaded: (url: string) => void }) {
    return (
      <div data-testid="image-upload">
        <button onClick={() => onImageUploaded('test-image-url')}>Upload Image</button>
      </div>
    );
  };
});
jest.mock('@/components/dashboard/DamageAnalysis', () => {
  return function MockDamageAnalysis({ imageUrl }: { imageUrl?: string }) {
    return <div data-testid="damage-analysis">Image URL: {imageUrl}</div>;
  };
});
jest.mock('@/components/dashboard/RagAnalysis', () => {
  return function MockRagAnalysis() {
    return <div data-testid="rag-analysis">RAG Analysis</div>;
  };
});

describe('DashboardPage', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { email: 'test@example.com' },
    });
  });

  it('renders dashboard with all components', () => {
    render(<DashboardPage />);
    
    expect(screen.getByTestId('protected-route')).toBeInTheDocument();
    expect(screen.getByText('Car Damage Prediction')).toBeInTheDocument();
    expect(screen.getByTestId('logout-button')).toBeInTheDocument();
    expect(screen.getByTestId('image-upload')).toBeInTheDocument();
    expect(screen.getByTestId('damage-analysis')).toBeInTheDocument();
    expect(screen.getByTestId('rag-analysis')).toBeInTheDocument();
  });

  it('updates image URL when image is uploaded', () => {
    render(<DashboardPage />);
    
    fireEvent.click(screen.getByText('Upload Image'));
    
    expect(screen.getByText('Image URL: test-image-url')).toBeInTheDocument();
  });
}); 