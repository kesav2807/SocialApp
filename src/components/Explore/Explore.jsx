import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Compass, Search } from 'lucide-react';
import PostCard from '../Posts/PostCard';
import { motion } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Explore = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchExplorePosts();
  }, []);

  const fetchExplorePosts = async () => {
    try {
      const response = await axios.get(`${API_URL}/posts/explore`);
      setPosts(response.data.posts);
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostLiked = (postId, isLiked, likesCount) => {
    setPosts(posts.map(post =>
      post._id === postId
        ? { ...post, isLiked, likes: Array(likesCount).fill() }
        : post
    ));
  };

  const filteredPosts = posts.filter(post =>
    post.content?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-2xl font-bold text-blue-600 flex items-center gap-2">
          <Compass size={22} /> Explore
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Loader */}
      {loading ? (
        <div className="flex justify-center items-center h-60">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center text-gray-500 mt-20">
          <p className="text-lg font-semibold">No posts found.</p>
          <p className="text-sm">Try a different keyword.</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredPosts.map(post => (
            <motion.div
              key={post._id}
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 120 }}
            >
              <PostCard post={post} onLike={handlePostLiked} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default Explore;
