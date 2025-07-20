import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CreatePost = ({ onPostCreated }) => {
  const [content, setContent] = useState('');
  const [media, setMedia] = useState([]);
  const [previewURLs, setPreviewURLs] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Submit new post
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && media.length === 0) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('content', content);
      media.forEach(file => formData.append('media', file));

      const res = await axios.post(`${API_URL}/posts`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onPostCreated(res.data.post);
      setContent('');
      setMedia([]);
      setPreviewURLs([]);
    } catch (err) {
      console.error('Create post error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle media file selection
  const handleMediaChange = (e) => {
    const files = Array.from(e.target.files);
    const previews = files.map(file => URL.createObjectURL(file));
    setMedia(files);
    setPreviewURLs(previews);
  };

  // Remove selected media
  const removeMedia = (index) => {
    const updatedMedia = [...media];
    const updatedPreviews = [...previewURLs];
    updatedMedia.splice(index, 1);
    updatedPreviews.splice(index, 1);
    setMedia(updatedMedia);
    setPreviewURLs(updatedPreviews);
  };

  // Determine if a file is a video based on MIME type
  const isVideo = (file) => file.type && file.type.startsWith('video');

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-xl shadow-md p-6 border border-gray-200"
    >
      <form onSubmit={handleSubmit}>
        {/* Header: Avatar + Textarea */}
        <div className="flex items-start gap-4 mb-4">
          {user?.avatar ? (
            <img
              src={`http://localhost:5000${user.avatar}`}
              alt="user avatar"
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold text-lg">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            rows={3}
            disabled={loading}
            className="w-full p-3 border border-gray-300 rounded-lg resize-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
          />
        </div>

        {/* Media Previews */}
        {previewURLs.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            {previewURLs.map((url, index) => (
              <div key={index} className="relative group rounded-md overflow-hidden">
                {isVideo(media[index]) ? (
                  <video
                    src={url}
                    className="w-full h-28 object-cover rounded-md"
                    controls
                  />
                ) : (
                  <img
                    src={url}
                    className="w-full h-28 object-cover rounded-md"
                    alt="preview"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeMedia(index)}
                  className="absolute top-1 right-1 bg-black bg-opacity-60 text-white rounded-full p-1 hover:bg-opacity-80"
                  title="Remove"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer: Upload + Post */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4">
          {/* File Upload */}
          <div className="flex items-center gap-3">
            <label
              htmlFor="media-upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-sm text-gray-700 rounded-md cursor-pointer hover:bg-gray-200 transition"
            >
              <ImagePlus size={18} />
              Add Media
            </label>
            <input
              id="media-upload"
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleMediaChange}
              className="hidden"
              disabled={loading}
            />
            {media.length > 0 && (
              <span className="text-sm text-gray-500">{media.length} file(s)</span>
            )}
          </div>

          {/* Post Button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading || (!content.trim() && media.length === 0)}
            className={`inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-md text-sm font-medium transition ${
              loading || (!content.trim() && media.length === 0)
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Posting...
              </>
            ) : (
              'Post'
            )}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
};

export default CreatePost;
