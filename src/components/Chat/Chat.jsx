// src/pages/Chat.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { UserPlus, Users, Search, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Chat = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);

  const messagesEndRef = useRef(null);
  const { socket, sendMessage, sendTyping, joinRoom, connected, onlineUsers } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (user) fetchConversations();
  }, [user]);

  useEffect(() => {
    if (socket) {
      socket.on('newMessage', handleNewMessage);
      socket.on('messageSent', handleMessageSent);
      socket.on('userTyping', handleUserTyping);
      socket.on('messageError', (error) => alert(`Message error: ${error.error}`));
      return () => {
        socket.off('newMessage');
        socket.off('messageSent');
        socket.off('userTyping');
        socket.off('messageError');
      };
    }
  }, [socket, activeConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (activeConversation) {
      joinRoom(activeConversation._id);
      fetchMessages(activeConversation);
    }
  }, [activeConversation]);

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const all = [
        ...res.data.directMessages.map(dm => ({ ...dm, type: 'direct' })),
        ...res.data.groupConversations.map(gc => ({ ...gc, type: 'group' })),
      ];
      setConversations(all);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conv) => {
    try {
      const token = localStorage.getItem('token');
      const url = conv.type === 'group'
        ? `${API_URL}/chat/rooms/${conv._id}/messages`
        : `${API_URL}/chat/direct/${conv._id._id}`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNewMessage = (msg) => {
    const isGroup = activeConversation?.type === 'group' && msg.chatRoom === activeConversation._id;
    const isDirect = activeConversation?.type === 'direct' &&
      ((msg.sender._id === activeConversation._id._id && msg.receiver === user._id) ||
        (msg.sender._id === user._id && msg.receiver === activeConversation._id._id));
    if (isGroup || isDirect) setMessages(prev => [...prev, msg]);
  };

  const handleMessageSent = (msg) => setMessages(prev => [...prev, msg]);

  const handleUserTyping = ({ userId, typing }) => {
    if (userId !== user._id) setIsTyping(typing);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const trimmed = newMessage.trim();
    if (!trimmed || !activeConversation || !socket || !connected) return;

    const messageData = {
      content: trimmed,
      receiver: activeConversation.type === 'direct' ? activeConversation._id._id : null,
      chatRoom: activeConversation.type === 'group' ? activeConversation._id : null,
      messageType: 'text',
    };

    sendMessage(messageData);
    setNewMessage('');

    const token = localStorage.getItem('token');
    try {
      const url = activeConversation.type === 'direct'
        ? `${API_URL}/chat/direct`
        : `${API_URL}/chat/rooms/${activeConversation._id}/messages`;
      const body = activeConversation.type === 'direct'
        ? { receiver: messageData.receiver, content: trimmed }
        : { content: trimmed };
      await axios.post(url, body, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Send error:', err);
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      sendTyping({
        typing: true,
        receiver: activeConversation?.type === 'direct' ? activeConversation._id._id : null,
        chatRoom: activeConversation?.type === 'group' ? activeConversation._id : null,
      });
    }
    clearTimeout(typingTimeout);
    setTypingTimeout(setTimeout(() => {
      setIsTyping(false);
      sendTyping({
        typing: false,
        receiver: activeConversation?.type === 'direct' ? activeConversation._id._id : null,
        chatRoom: activeConversation?.type === 'group' ? activeConversation._id : null,
      });
    }, 1000));
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const formatTime = (time) =>
    new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const searchUsers = async (query, setter) => {
    if (!query.trim()) return setter([]);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/users/search/${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setter(res.data.users || []);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const toggleUserSelection = (u) => {
    setSelectedUsers(prev =>
      prev.find(x => x._id === u._id) ? prev.filter(x => x._id !== u._id) : [...prev, u]
    );
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/chat/rooms`, {
        name: groupName,
        description: groupDescription,
        memberIds: selectedUsers.map(u => u._id),
      }, { headers: { Authorization: `Bearer ${token}` } });
      setShowCreateGroup(false);
      setGroupName('');
      setGroupDescription('');
      setSelectedUsers([]);
      setSearchResults([]);
      fetchConversations();
    } catch (err) {
      console.error('Group create error:', err);
    }
  };

  const startDirectChat = async (targetUser) => {
    const existing = conversations.find(c => c.type === 'direct' && c._id._id === targetUser._id);
    if (existing) {
      setActiveConversation(existing);
      fetchMessages(existing);
    } else {
      const newConv = { _id: targetUser, type: 'direct', lastMessage: null };
      setActiveConversation(newConv);
      setConversations(prev => [newConv, ...prev]);
    }
    setShowUserSearch(false);
    setUserSearchQuery('');
    setUserSearchResults([]);
  };

  const renderOnlineStatus = () => {
    if (activeConversation?.type === 'direct') {
      return onlineUsers.has(activeConversation._id._id) ? '🟢 Online' : '🔴 Offline';
    }
    return connected ? '🟢 Connected' : '🔴 Disconnected';
  };

  if (loading) return <div className="flex items-center justify-center h-screen text-lg">Loading...</div>;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar */}
      <aside className="w-full md:w-1/3 lg:w-1/4 border-r bg-white p-4 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Chats</h2>
          <div className="flex space-x-2">
            <button onClick={() => setShowUserSearch(true)} className="text-blue-600 hover:text-blue-800" title="New Chat"><UserPlus size={18} /></button>
            <button onClick={() => setShowCreateGroup(true)} className="text-green-600 hover:text-green-800" title="New Group"><Users size={18} /></button>
          </div>
        </div>

        {showUserSearch && (
          <div className="mb-4">
            <div className="flex items-center border rounded px-2 py-1">
              <Search className="mr-2 text-gray-400" size={16} />
              <input
                value={userSearchQuery}
                onChange={(e) => {
                  setUserSearchQuery(e.target.value);
                  searchUsers(e.target.value, setUserSearchResults);
                }}
                placeholder="Search users..."
                className="flex-1 outline-none"
              />
              <X onClick={() => setShowUserSearch(false)} className="cursor-pointer text-gray-500" size={16} />
            </div>
            <div className="mt-2 space-y-1">
              {userSearchResults.map(u => (
                <div
                  key={u._id}
                  onClick={() => startDirectChat(u)}
                  className="cursor-pointer px-3 py-1 rounded hover:bg-blue-50"
                >
                  {u.username}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          {conversations.map((c) => (
            <div
              key={c._id}
              onClick={() => setActiveConversation(c)}
              className={`p-3 rounded-md cursor-pointer hover:bg-blue-100 ${
                activeConversation?._id === c._id ? 'bg-blue-200 font-semibold' : ''
              }`}
            >
              <div className="text-sm">{c.type === 'group' ? c.name : c._id.username}</div>
              <div className="text-xs text-gray-500 truncate">{c.lastMessage?.content || 'No messages'}</div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Chat */}
      <main className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            <header className="px-4 py-2 bg-white border-b flex justify-between items-center">
              <h4 className="text-md font-semibold">{activeConversation.type === 'group' ? activeConversation.name : activeConversation._id.username}</h4>
              <span className="text-sm">{renderOnlineStatus()}</span>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {messages.map((msg) => (
                <div
                  key={msg._id}
                  className={`max-w-sm p-2 rounded-md ${
                    msg.sender._id === user._id ? 'bg-blue-600 text-white ml-auto' : 'bg-gray-200'
                  }`}
                >
                  {activeConversation.type === 'group' && msg.sender._id !== user._id && (
                    <div className="text-xs font-bold">{msg.sender.username}</div>
                  )}
                  <div>{msg.content}</div>
                  <div className="text-[10px] mt-1 text-right">{formatTime(msg.createdAt)}</div>
                </div>
              ))}
              {isTyping && <div className="text-sm text-gray-400 italic">Typing...</div>}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2 px-4 py-3 border-t bg-white">
              <input
                value={newMessage}
                onChange={handleInputChange}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border rounded-md"
              />
              <button
                type="submit"
                disabled={!connected || !newMessage.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300"
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="flex items-center justify-center flex-1 text-gray-400">
            Select a conversation to start chatting
          </div>
        )}
      </main>

      {/* Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Create Group</h3>
              <button onClick={() => setShowCreateGroup(false)}><X /></button>
            </div>
            <input className="w-full mb-2 px-3 py-2 border rounded" placeholder="Group Name" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
            <textarea className="w-full mb-2 px-3 py-2 border rounded" placeholder="Description" value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)} />
            <input className="w-full mb-2 px-3 py-2 border rounded" placeholder="Search users..." value={searchQuery} onChange={(e) => {
              setSearchQuery(e.target.value);
              searchUsers(e.target.value, setSearchResults);
            }} />
            <div className="max-h-40 overflow-y-auto mb-4">
              {searchResults.map(u => (
                <div
                  key={u._id}
                  onClick={() => toggleUserSelection(u)}
                  className="cursor-pointer p-2 hover:bg-blue-50 rounded"
                >
                  {u.username} {selectedUsers.find(x => x._id === u._id) && '✔'}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreateGroup(false)} className="text-gray-500">Cancel</button>
              <button onClick={createGroup} disabled={!groupName.trim() || selectedUsers.length === 0} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
