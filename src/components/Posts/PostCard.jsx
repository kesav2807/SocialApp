import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Heart, MessageCircle, Trash2, Send, Image as ImageIcon, Video as VideoIcon
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PostCard = ({ post, onDelete, onLike }) => {
  const { user } = useAuth();

  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState(post.comments || []);
  const [loading, setLoading] = useState(false);

  const isLiked = post.likes?.some(like =>
    typeof like === 'string' ? like === user._id : like._id === user._id
  );

  const handleLike = async () => {
    try {
      const res = await axios.post(`${API_URL}/posts/${post._id}/like`);
      onLike(post._id, res.data.isLiked, res.data.likesCount);
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const handleDelete = async () => {
    if (confirm('Delete this post?')) {
      try {
        await axios.delete(`${API_URL}/posts/${post._id}`);
        onDelete(post._id);
      } catch (err) {
        console.error('Delete error:', err);
      }
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/posts/${post._id}/comment`, {
        content: newComment
      });
      setComments(prev => [...prev, res.data.comment]);
      setNewComment('');
    } catch (err) {
      console.error('Comment error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-xl shadow hover:shadow-lg p-5 mb-6 transition-all">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          {post.author?.avatar ? (
            <img
              src={`http://localhost:5000${post.author.avatar}`}
              alt="avatar"
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center font-bold text-white">
              {post.author?.username?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <div>
            <Link to={`/profile/${post.author._id}`} className="font-semibold text-gray-800 hover:underline">
              {post.author.username}
            </Link>
            <div className="text-sm text-gray-500">{formatDate(post.createdAt)}</div>
          </div>
        </div>
        {user._id === post.author._id && (
          <button onClick={handleDelete} title="Delete post">
            <Trash2 size={18} className="text-red-500 hover:text-red-700" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="mb-4">
        <p className="text-gray-800">{post.content}</p>
        {post.media?.length > 0 && (
          <div className="grid gap-3 mt-3">
            {post.media.map((item, idx) => (
              <div key={idx}>
                {item.type === 'image' ? (
                  <img
                    src={`http://localhost:5000${item.url}`}
                    alt="Post media"
                    className="rounded-lg w-full object-cover max-h-[500px]"
                    loading="lazy"
                  />
                ) : (
                  <video
                    src={`http://localhost:5000${item.url}`}
                    controls
                    className="rounded-lg w-full"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-5 mb-4">
        <button
          onClick={handleLike}
          className="flex items-center gap-1 text-sm px-2 py-1 rounded-full hover:bg-gray-100"
          title={isLiked ? 'Unlike' : 'Like'}
        >
          <Heart size={18} fill={isLiked ? 'red' : 'none'} stroke={isLiked ? 'red' : 'currentColor'} />
          {post.likes?.length || 0}
        </button>
        <button
          onClick={() => setShowComments(prev => !prev)}
          className="flex items-center gap-1 text-sm px-2 py-1 rounded-full hover:bg-gray-100"
          title="Comments"
        >
          <MessageCircle size={18} />
          {comments.length}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-4 space-y-4">
          {comments.map((comment, i) => (
            <div key={i} className="flex items-start gap-3">
              {comment.author?.avatar ? (
                <img
                  src={`http://localhost:5000${comment.author.avatar}`}
                  alt="commenter"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-white text-sm">
                  {comment.author?.username?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="bg-gray-100 rounded-md px-3 py-2 w-full">
                <div className="text-sm font-semibold text-gray-800">
                  {comment.author.username}
                </div>
                <p className="text-sm text-gray-700">{comment.content}</p>
              </div>
            </div>
          ))}

          {/* Add Comment */}
          <form onSubmit={handleAddComment} className="flex gap-3 mt-2">
            <input
              type="text"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={loading}
              className="flex-1 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading || !newComment.trim()}
              className="bg-blue-600 text-white px-4 py-2 text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
            >
              <Send size={14} /> Post
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default PostCard;
