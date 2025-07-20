const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');
const User = require('../models/User');

const router = express.Router();

// Send direct message (HTTP fallback)
router.post('/direct', authenticateToken, async (req, res) => {
  try {
    const { receiver, content } = req.body;

    if (!receiver || !content) {
      return res.status(400).json({ message: 'Receiver and content are required' });
    }

    const message = new Message({
      sender: req.user._id,
      receiver,
      content,
      messageType: 'text'
    });

    await message.save();
    await message.populate('sender', 'username avatar');

    res.json({ message: 'Message sent', data: message });
  } catch (error) {
    console.error('Error sending direct message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get direct messages with a user
router.get('/direct/:userId', authenticateToken, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user._id }
      ]
    })
      .populate('sender', 'username avatar')
      .populate('receiver', 'username avatar')
      .sort({ createdAt: 1 });

    res.json({ messages });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Start or get direct conversation
router.post('/direct/start', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id }
      ]
    })
      .populate('sender', 'username avatar')
      .populate('receiver', 'username avatar')
      .sort({ createdAt: 1 });

    res.json({
      conversation: {
        _id: targetUser,
        type: 'direct',
        lastMessage: messages.length > 0 ? messages[messages.length - 1] : null
      },
      messages
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get chat rooms for user
router.get('/rooms', authenticateToken, async (req, res) => {
  try {
    const chatRooms = await ChatRoom.find({
      'members.user': req.user._id
    })
      .populate('members.user', 'username avatar')
      .populate('creator', 'username avatar')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    res.json({ chatRooms });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create chat room
router.post('/rooms', authenticateToken, async (req, res) => {
  try {
    const { name, description, memberIds } = req.body;

    const chatRoom = new ChatRoom({
      name,
      description,
      creator: req.user._id,
      members: [
        { user: req.user._id, role: 'admin' },
        ...memberIds.map(id => ({ user: id, role: 'member' }))
      ]
    });

    await chatRoom.save();
    await chatRoom.populate('members.user', 'username avatar');

    res.status(201).json({ message: 'Chat room created successfully', chatRoom });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Join chat room
router.post('/rooms/:id/join', authenticateToken, async (req, res) => {
  try {
    const chatRoom = await ChatRoom.findById(req.params.id);

    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    const isMember = chatRoom.members.some(member =>
      member.user.equals(req.user._id)
    );

    if (isMember) {
      return res.status(400).json({ message: 'Already a member of this chat room' });
    }

    chatRoom.members.push({ user: req.user._id, role: 'member' });
    await chatRoom.save();

    res.json({ message: 'Joined chat room successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Leave chat room
router.post('/rooms/:id/leave', authenticateToken, async (req, res) => {
  try {
    const chatRoom = await ChatRoom.findById(req.params.id);

    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    chatRoom.members = chatRoom.members.filter(member =>
      !member.user.equals(req.user._id)
    );

    await chatRoom.save();

    res.json({ message: 'Left chat room successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get chat room messages
router.get('/rooms/:id/messages', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const chatRoom = await ChatRoom.findById(req.params.id);

    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    const isMember = chatRoom.members.some(member =>
      member.user.equals(req.user._id)
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this chat room' });
    }

    const messages = await Message.find({ chatRoom: req.params.id })
      .populate('sender', 'username avatar')
      .populate('mentions', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ messages: messages.reverse() });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get conversation list
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const directMessages = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: req.user._id },
            { receiver: req.user._id }
          ],
          chatRoom: null
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', req.user._id] },
              '$receiver',
              '$sender'
            ]
          },
          lastMessage: { $first: '$$ROOT' }
        }
      }
    ]);

    await User.populate(directMessages, { path: '_id', select: 'username avatar isOnline' });
    await User.populate(directMessages, { path: 'lastMessage.sender', select: 'username avatar' });

    const groupConversations = await ChatRoom.find({
      'members.user': req.user._id
    })
      .populate('lastMessage')
      .populate('members.user', 'username avatar')
      .sort({ updatedAt: -1 });

    res.json({
      directMessages,
      groupConversations
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
