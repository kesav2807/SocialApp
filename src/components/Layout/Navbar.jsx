import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  Home,
  Search,
  Bell,
  LogOut,
  UserCircle,
  Mic,
  MicOff,
  MessageSquare,
  Compass,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioRef = useRef(null);

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
    if (audioRef.current) {
      audioEnabled ? audioRef.current.pause() : audioRef.current.play().catch(console.error);
    }
  };

  const handleSearch = async (query) => {
    if (!query.trim()) return setSearchResults([]);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/users/search/${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSearchResults(res.data.users || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    handleSearch(val);
  };

  const closeSearch = () => {
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const navigateToProfile = (id) => {
    navigate(`/profile/${id}`);
    closeSearch();
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (showSearch && !e.target.closest('.search-box')) closeSearch();
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showSearch]);

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-50 backdrop-blur-md bg-white/80 border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="text-2xl font-bold text-blue-600">
            SocialApp
          </Link>

          {/* Search */}
          <div className="relative">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="flex items-center gap-2 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md transition"
            >
              <Search size={18} /> Search
            </button>

            {showSearch && (
              <div className="absolute top-12 left-0 w-80 bg-white shadow-xl rounded-xl p-4 z-50 border search-box">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleInputChange}
                    placeholder="Search users..."
                    autoFocus
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                  <button onClick={closeSearch} className="text-gray-600 hover:text-black">
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searchResults.map((u) => (
                    <div
                      key={u._id}
                      onClick={() => navigateToProfile(u._id)}
                      className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-md cursor-pointer"
                    >
                      {u.avatar ? (
                        <img
                          src={`http://localhost:5000${u.avatar}`}
                          alt={u.username}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-blue-500 text-white flex items-center justify-center rounded-full">
                          {u.username[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{u.username}</div>
                        <div className="text-xs text-gray-500">{u.bio || 'No bio'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Icons Menu */}
          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className={`flex items-center gap-1 text-sm ${
                isActive('/') ? 'text-blue-600 font-semibold' : 'text-gray-700 hover:text-blue-500'
              }`}
            >
              <Home size={18} /> Home
            </Link>
            <Link
              to="/explore"
              className={`flex items-center gap-1 text-sm ${
                isActive('/explore') ? 'text-blue-600 font-semibold' : 'text-gray-700 hover:text-blue-500'
              }`}
            >
              <Compass size={18} /> Explore
            </Link>
            <Link
              to="/chat"
              className={`flex items-center gap-1 text-sm ${
                isActive('/chat') ? 'text-blue-600 font-semibold' : 'text-gray-700 hover:text-blue-500'
              }`}
            >
              <MessageSquare size={18} /> Chat
            </Link>
            <Link
              to="/notifications"
              className={`flex items-center gap-1 text-sm ${
                isActive('/notifications') ? 'text-blue-600 font-semibold' : 'text-gray-700 hover:text-blue-500'
              }`}
            >
              <Bell size={18} /> Notifications
            </Link>
            <button onClick={toggleAudio} title="Toggle Audio">
              {audioEnabled ? (
                <Mic size={18} className="text-green-600" />
              ) : (
                <MicOff size={18} className="text-gray-500" />
              )}
            </button>
            <Link to={`/profile/${user?._id}`} className="hover:opacity-90">
              {user?.avatar ? (
                <img
                  src={`http://localhost:5000${user.avatar}`}
                  alt="avatar"
                  className="w-8 h-8 rounded-full border border-blue-500"
                />
              ) : (
                <UserCircle size={20} />
              )}
            </Link>
            <button
              onClick={handleLogout}
              className="text-red-600 hover:underline flex items-center gap-1 text-sm"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </nav>

      <audio ref={audioRef} loop preload="none" style={{ display: 'none' }}>
        <source src="https://www.soundjay.com/misc/sounds/bell-ringing-05.wav" type="audio/wav" />
      </audio>

      {/* spacer */}
      <div className="h-16"></div>
    </>
  );
};

export default Navbar;
