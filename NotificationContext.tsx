
import React, { createContext, useState, useCallback, ReactNode } from 'react';
import { Notification, UserRole } from '../types';
import { db } from '../firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (message: string, userId: string, link?: string) => void;
  markAsRead: (notificationId: string) => void;
  getUnreadCount: (userId: string) => number;
  getUserNotifications: (userId: string) => Notification[];
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]); // This will be populated by a listener if made persistent

  const addNotification = useCallback(async (message: string, userId: string, link?: string) => {
    const newNotification: Omit<Notification, 'id'> = {
      userId,
      message,
      link,
      isRead: false,
      timestamp: Timestamp.now(),
    };
    // In a real app, this would be written to a 'notifications' collection in Firestore
    // For this example, we keep it in local state to avoid setting up another listener
    // but the type is compatible with Firestore.
    const tempId = new Date().toISOString(); // Temporary ID for local state
    setNotifications(prev => [{ id: tempId, ...newNotification }, ...prev].slice(0, 50));
    console.log(`Notification for ${userId}: ${message}`);
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
     // In a real app, you would update the 'isRead' field of the notification document in Firestore
  }, []);

  const getUnreadCount = useCallback((userId: string) => {
    return notifications.filter(n => n.userId === userId && !n.isRead).length;
  }, [notifications]);

  const getUserNotifications = useCallback((userId: string) => {
    return notifications.filter(n => n.userId === userId).sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
  }, [notifications]);

  return (
    <NotificationContext.Provider
      value={{ notifications, addNotification, markAsRead, getUnreadCount, getUserNotifications }}
    >
      {children}
    </NotificationContext.Provider>
  );
};