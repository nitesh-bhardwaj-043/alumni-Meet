import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Follower } from "../models/follower.model.js";

const toggleFollow = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid channel id");
  }

  const isFollowing = await Follower.findOne({
    followFrom: req.user?._id,
    followTo: userId,
  });

  if (isFollowing) {
    await Follower.findByIdAndDelete(isFollowing._id);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { isFollowing: false },
          "User follow toggled successfully - Un follow"
        )
      );
  }

  const following = await Follower.create({
    followFrom: req.user?._id,
    followTo: userId,
  });

  if (!following) {
    throw new ApiError(500, "Server error while following");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        following,
        "User follow toggled successfully - follow"
      )
    );
});

const getFollowers = asyncHandler(async (req, res) => {
  //   console.log(req.user?._id);
  const followerList = await Follower.aggregate([
    {
      $match: {
        followTo: new mongoose.Types.ObjectId(req.user?._id),
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "followFrom",
        foreignField: "_id",
        as: "followers",
        pipeline: [
          {
            $project: {
              username: 1,
              name: 1,
              "avatar.url": 1,
            },
          },
        ],
      },
    },

    {
      $addFields: {
        // followersCount: {
        //   $size: "$followers",
        // },
        followers: {
          $first: "$followers",
        },
      },
    },

    {
      $project: {
        // username: 1,
        // followFrom:1,
        // followTo:1,
        // followersCount: 1,
        followers: 1,
      },
    },
  ]);

  //   console.log(followerList);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { followerList, length: followerList.length },
        "Followers fetched successfully"
      )
    );
});

const getFollowing = asyncHandler(async (req, res) => {
  const followingList = await Follower.aggregate([
    {
      $match: {
        followFrom: new mongoose.Types.ObjectId(req.user?._id),
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "followTo",
        foreignField: "_id",
        as: "followings",
        pipeline: [
          {
            $project: {
              username: 1,
              name: 1,
              "avatar.url": 1,
            },
          },
        ],
      },
    },

    // { $count: "totalNumber" },

    {
      $addFields: {
        // followingsCount: {
        //   $size: "$followings",
        // },
        followings: {
          $first: "$followings",
        },
      },
    },

    {
      $project: {
        // username: 1,
        // followFrom:1,
        // followTo:1,
        _id: 0,
        // followingsCount: 1,
        followings: 1,
      },
    },
  ]);

  //   console.log(followerList);
  // console.log(followingList.length);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { followingList, length: followingList.length },
        "Followings fetched successfully"
      )
    );
});

export { toggleFollow, getFollowers, getFollowing };
