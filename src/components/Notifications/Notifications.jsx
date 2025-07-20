import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API_URL}/users/notifications/all`);
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`${API_URL}/users/notifications/${notificationId}/read`);
      setNotifications(notifications.map(notification =>
        notification._id === notificationId
          ? { ...notification, isRead: true }
          : notification
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes}m ago`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Notifications</h2>

      {notifications.length === 0 ? (
        <div className="text-center text-gray-500">
          <p>No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map(notification => (
            <div
              key={notification._id}
              className={`flex items-start gap-4 p-4 rounded-lg shadow-md cursor-pointer transition-all duration-300 ${
                notification.isRead
                  ? 'bg-white hover:bg-gray-100'
                  : 'bg-blue-50 border-l-4 border-blue-500 hover:bg-blue-100'
              }`}
              onClick={() => !notification.isRead && markAsRead(notification._id)}
            >
              {notification.sender?.avatar ? (
                <img
                  src={`http://localhost:5000${notification.sender.avatar}`}
                  alt={notification.sender.username}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold text-lg">
                  {notification.sender?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}

              <div className="flex-1">
                <p className="text-gray-800 font-medium">{notification.message}</p>
                <p className="text-sm text-gray-500 mt-1">{formatTime(notification.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
