import { Outlet } from 'react-router-dom';

export function PublicLayout() {
  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <Outlet />
    </main>
  );
}
