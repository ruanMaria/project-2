'use strict';

const express = require('express');
const User = require('../models/user_model');
const Post = require('./../models/post');
const ObjectID = require('mongodb').ObjectID;
const LibEntry = require('../models/library');
const routeGuard = require('./../middleware/route-guard');
const fileUploader = require('../cloudinary-configuration');
const Follow = require('../models/follow');

const profileRouter = new express.Router();

profileRouter.get('/settings', routeGuard, (req, res, next) => {
  res.render('profile/settings');
});

const twoFilesUploader = fileUploader.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'banner', maxCount: 1 }
]);
profileRouter.post(
  '/settings',
  routeGuard,
  twoFilesUploader,
  async (req, res, next) => {
    console.log(req.body);
    const { username, email, tagline } = req.body;

    try {
      let avatar, banner;
      if (await req.files.avatar) {
        avatar = await req.files.avatar[0].path;
      }
      if (await req.files.banner) {
        banner = await req.files.banner[0].path;
      }

      const id = ObjectID(req.session.passport.user);
      await User.findByIdAndUpdate(id, {
        username,
        email,
        avatar,
        tagline,
        banner
      });
      res.redirect(`/profile/${username}`);
    } catch (error) {
      next(error);
    }
  }
);

profileRouter.get('/:username', async (req, res, next) => {
  const username = req.params.username;

  try {
    const userPublic = await User.findOne({ username }).populate('post feed');
    const userLibrary = await LibEntry.find({
      user: userPublic._id
    }).populate('anime');

    let isFollowing;

    if (req.session.passport) {
      isFollowing = await Follow.findOne({
        $and: [{ followedId: userPublic._id }, { followerId: req.user._id }]
      });

      if (isFollowing === null) {
        isFollowing = false;
      } else isFollowing = true;
    }

    // GET LIST OF FOLLOWERS
    const followersOfUser = await Follow.find({ followedId: userPublic._id });

    let listOfUsers = [];

    for (let object of followersOfUser) {
      const userThatFollows = await User.findById(object.followerId);
      listOfUsers.push(userThatFollows);
    }

    const data = {
      userPublic: userPublic,
      library: userLibrary,
      isFollowing,
      followers: listOfUsers
    };

    res.render('profile/display', data);
  } catch (error) {
    next(error);
  }
});

module.exports = profileRouter;
