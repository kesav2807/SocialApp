import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import PostCard from '../Posts/PostCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Profile = () => {
  const { userId } = useParams();
  const { user: currentUser, updateProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    bio: '',
    isPrivate: false,
  });

  const isOwnProfile = !userId || userId === currentUser._id;

  useEffect(() => {
    fetchProfile();
    fetchUserPosts();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const targetUserId = userId || currentUser._id;
      const response = await axios.get(`${API_URL}/users/${targetUserId}`);
      setProfile(response.data.user);
      setFormData({
        username: response.data.user.username,
        bio: response.data.user.bio || '',
        isPrivate: response.data.user.isPrivate,
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const targetUserId = userId || currentUser._id;
      const response = await axios.get(`${API_URL}/posts/user/${targetUserId}`);
      setPosts(response.data.posts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      await axios.post(`${API_URL}/users/${profile._id}/follow`);
      fetchProfile();
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const form = new FormData();
    form.append('username', formData.username);
    form.append('bio', formData.bio);
    form.append('isPrivate', formData.isPrivate);

    const fileInput = document.getElementById('avatar-upload');
    if (fileInput.files[0]) {
      form.append('avatar', fileInput.files[0]);
    }

    const result = await updateProfile(form);
    if (result.success) {
      setEditing(false);
      fetchProfile();
    }
  };

  const isFollowing = profile?.followers?.some(f => f._id === currentUser._id);

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
        {profile.avatar ? (
          <img
            src={`http://localhost:5000${profile.avatar}`}
            alt={profile.username}
            className="w-28 h-28 rounded-full object-cover shadow-md"
          />
        ) : (
          <div className="w-28 h-28 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold text-3xl">
            {profile.username.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 space-y-3 text-center md:text-left">
          {editing ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Username"
                className="w-full p-2 border border-gray-300 rounded"
              />
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Bio"
                rows="3"
                className="w-full p-2 border border-gray-300 rounded"
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isPrivate}
                  onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
                />
                <label>Private Account</label>
              </div>
              <input type="file" id="avatar-upload" accept="image/*" />
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Save</button>
                <button type="button" onClick={() => setEditing(false)} className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400">Cancel</button>
              </div>
            </form>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-800">{profile.username}</h2>
              {profile.bio && <p className="text-gray-600 mt-1">{profile.bio}</p>}
              <div className="flex justify-center md:justify-start gap-6 mt-4 text-sm text-gray-600">
                <div className="text-center">
                  <div className="font-bold text-gray-800">{posts.length}</div>
                  <div>Posts</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-gray-800">{profile.followers?.length || 0}</div>
                  <div>Followers</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-gray-800">{profile.following?.length || 0}</div>
                  <div>Following</div>
                </div>
              </div>
              <div className="mt-4">
                {isOwnProfile ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <button
                    onClick={handleFollow}
                    className={`px-4 py-2 rounded text-white ${
                      isFollowing ? 'bg-gray-500 hover:bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-12">
        {posts.length === 0 ? (
          <p className="text-center text-gray-500">No posts yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {posts.map((post) => (
              <PostCard key={post._id} post={post} onDelete={() => fetchUserPosts()} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
