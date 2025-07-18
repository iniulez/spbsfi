
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { NAVIGATION_LINKS, APP_NAME, ICON_MAP } from '../constants';
import { getInitials } from '../utils/helpers';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const links = NAVIGATION_LINKS[user.role] || [];

  const Icon = ({ name }: { name: string }) => {
    // A simple SVG placeholder or use a library for actual icons
    // Using heroicons string name directly for this example
    // In a real app, you would map this to an SVG component or <i> tag with CSS classes
    const iconKey = ICON_MAP[name] || ICON_MAP['document-text'];
    return <span className="mr-3 h-6 w-6">{iconKey.charAt(0).toUpperCase()}</span>; // Placeholder, use actual icon component
  };
  
  return (
    <>
      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-40 flex md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out`}
        role="dialog"
        aria-modal="true"
      >
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-blue-700 text-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Close sidebar</span>
              {/* X Icon */}
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <span className="text-xl font-semibold">{APP_NAME}</span> {/* Adjusted font size for longer name */}
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {links.map((link) => (
                <NavLink
                  key={link.name}
                  to={link.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                      isActive ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-600 hover:text-white'
                    }`
                  }
                >
                  <Icon name={link.icon} />
                  {link.name}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-blue-800 p-4">
            <div className="flex-shrink-0 group block">
              <div className="flex items-center">
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-blue-500">
                  <span className="text-sm font-medium leading-none text-white">{getInitials(user.name)}</span>
                </div>
                <div className="ml-3">
                  <p className="text-base font-medium text-white">{user.name}</p>
                  <p className="text-sm font-medium text-blue-200 group-hover:text-blue-100">{user.role}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-blue-800">
             <button
                onClick={logout}
                className="w-full group flex items-center px-2 py-2 text-base font-medium rounded-md text-blue-100 hover:bg-blue-600 hover:text-white"
              >
                <Icon name="logout" />
                Logout
              </button>
          </div>
        </div>
        <div className="flex-shrink-0 w-14" aria-hidden="true"></div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 bg-blue-700 text-white">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                 <span className="text-xl font-semibold">{APP_NAME}</span> {/* Adjusted font size for longer name */}
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {links.map((link) => (
                  <NavLink
                    key={link.name}
                    to={link.path}
                    className={({ isActive }) =>
                      `group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                        isActive ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-600 hover:text-white'
                      }`
                    }
                  >
                     <Icon name={link.icon} />
                    {link.name}
                  </NavLink>
                ))}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-blue-800 p-4">
              <div className="flex-shrink-0 w-full group block">
                <div className="flex items-center">
                  <div className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-blue-500">
                    <span className="text-sm font-medium leading-none text-white">{getInitials(user.name)}</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-white">{user.name}</p>
                    <p className="text-xs font-medium text-blue-200 group-hover:text-blue-100">{user.role}</p>
                  </div>
                </div>
              </div>
            </div>
             <div className="p-4 border-t border-blue-800">
             <button
                onClick={logout}
                className="w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md text-blue-100 hover:bg-blue-600 hover:text-white"
              >
                <Icon name="logout" />
                Logout
              </button>
          </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;