'use strict';

const express = require('express');
const User = require('./../models/user');
const Post = require('./../models/post');
const ObjectID = require('mongodb').ObjectID;
const routeGuard = require('./../middleware/route-guard');
const fileUploader = require('../cloudinary-configuration');

const profileRouter = new express.Router();

profileRouter.get('/settings', routeGuard, (request, response) => {
  response.render('profile/settings');
});

profileRouter.post('/settings', routeGuard, fileUploader.single('user-avatar'), async (req, res) => {
  const { username, email, avatar } = req.body;
  const _id = ObjectID(req.session.passport.user);

  User.updateOne({ _id }, { $set: { username, email, avatar } }, error => {
    if (error) {
      throw error;
    }
    res.redirect(`/profile/${username}`);
  });
});
/*
profileRouter.post('/settings',fileUploader.single('user-avatar'), (req, res, next) => {
  const { username } = req.params;
  console.log(username);
  res.redirect(`/profile/${username}`);
});
*/



profileRouter.get('/:username', (req, res) => {
  const username = req.params.username;
  User.findOne({ username })
    .populate('post')
    .populate('feed')
    .then(userPublic => {
      res.render('profile/display', { userPublic });
    });
});

profileRouter.post('/:username/post', async (req, res, next) => {
  const username = req.params.username;
  const id = ObjectID(req.session.passport.user);
  const { title, content } = req.body;

  try {
    const createdPost = await Post.create({ creator: id, title, content });
    const userPosted = await User.findById(id);
    const userReceivedPost = await User.findOne({ username });

    console.log(createdPost, userPosted, userReceivedPost);

    userReceivedPost.feed.push(createdPost._id);
    userPosted.posts.push(createdPost._id);
    userPosted.save();
    userReceivedPost.save();
    res.redirect(`/profile/${username}`);
  } catch (error) {
    next(error);
  }
});

module.exports = profileRouter;
