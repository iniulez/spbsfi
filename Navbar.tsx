
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { Notification } from '../types';
import { formatDate, truncateText, getInitials } from '../utils/helpers';
import { ICON_MAP } from '../constants';

interface NavbarProps {
  setSidebarOpen: (open: boolean) => void;
}

const Navbar: React.FC<NavbarProps> = ({ setSidebarOpen }) => {
  const { user } = useAuth();
  const { getUserNotifications, getUnreadCount, markAsRead } = useNotifications();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  if (!user) return null;

  const userNotifications = getUserNotifications(user.id);
  const unreadCount = getUnreadCount(user.id);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    setNotificationsOpen(false);
    // Potentially navigate if notification.link exists
  };

  const Icon = ({ name }: { name: string }) => <span className="h-6 w-6">{ICON_MAP[name]?.charAt(0).toUpperCase() || '?'}</span>;


  return (
    <header className="relative bg-white shadow-sm z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">Open sidebar</span>
              <Icon name="menu" />
            </button>
          </div>

          {/* Search (Placeholder) */}
          <div className="hidden md:flex flex-1 justify-center px-2 lg:ml-6 lg:justify-end">
            <div className="max-w-lg w-full lg:max-w-xs">
              <label htmlFor="search" className="sr-only">Search</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Icon name="search" />
                </div>
                <input
                  id="search"
                  name="search"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search (Not Implemented)"
                  type="search"
                />
              </div>
            </div>
          </div>

          {/* Notifications and Profile */}
          <div className="flex items-center ml-auto">
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <span className="sr-only">View notifications</span>
                <Icon name="bell" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 block h-2 w-2 transform translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 ring-2 ring-white"></span>
                )}
              </button>
              {notificationsOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-80 md:w-96 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm font-medium text-gray-900 border-b">Notifications</div>
                    {userNotifications.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-gray-500">No new notifications.</p>
                    ) : (
                      <ul className="max-h-80 overflow-y-auto">
                        {userNotifications.map((notification) => (
                          <li key={notification.id} className={`${notification.isRead ? '' : 'bg-blue-50'}`}>
                            <Link
                              to={notification.link || '#'}
                              onClick={() => handleNotificationClick(notification)}
                              className="block px-4 py-3 hover:bg-gray-100"
                            >
                              <p className={`text-sm ${notification.isRead ? 'text-gray-600' : 'font-semibold text-gray-800'}`}>
                                {truncateText(notification.message, 100)}
                              </p>
                              <p className="text-xs text-gray-400">{formatDate(notification.timestamp, true)}</p>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                     <div className="px-4 py-2 border-t">
                        <Link to="#" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                           View all notifications (Not Implemented)
                        </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile dropdown */}
            <div className="ml-3 relative">
              <div>
                <button className="max-w-xs bg-white flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <span className="sr-only">Open user menu</span>
                  <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                    {getInitials(user.name)}
                  </div>
                </button>
              </div>
              {/* Dropdown menu, show/hide based on menu state. (Not implemented for brevity) */}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
