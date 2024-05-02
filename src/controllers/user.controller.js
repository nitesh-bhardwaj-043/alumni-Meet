import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    // upon saving the required fields are checked , so validation is turned off so refresh token can be added
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { username, name, email, password } = req.body;
  // console.log(username, name, email, password);

  if (!username || !name || !email || !password) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(400, "User already exists");
  }

  const user = await User.create({
    username: username.toLowerCase(),
    name,
    email,
    password,
  });
  // console.log(user);

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(200, createdUser, "User has been registered successfully")
    );
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User doesn't exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
        // pass the flag 1 to all the fields which you want to remove
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

const updateStudent = asyncHandler(async (req, res) => {
  const { userType, name, phoneNo, linkedInUrl, collegeName, courseName } =
    req.body;

  console.log(userType, name, phoneNo, linkedInUrl, collegeName, courseName);

  if (
    !userType ||
    !name ||
    !phoneNo ||
    !linkedInUrl ||
    !collegeName ||
    !courseName
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  const avatarFile = await uploadOnCloudinary(avatarLocalPath);
  if (!avatarFile.url) {
    throw new ApiError(400, "Avatar not uploaded on cloud");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        userType,
        avatar: {
          url: avatarFile.url,
          public_id: avatarFile.public_id,
        },
        name,
        phoneNo,
        linkedInUrl,
        collegeName,
        courseName,
      },
    },
    { new: true }
  ).select("-password");

  return res.status(200).json(new ApiResponse(200, updatedUser, "Student"));
});

const updateAlumni = asyncHandler(async (req, res) => {
  const {
    userType,
    name,
    phoneNo,
    linkedInUrl,
    collegeName,
    courseName,
    companyName,
    location,
    areaOfExpertise,
  } = req.body;

  if (
    !userType ||
    !name ||
    !phoneNo ||
    !linkedInUrl ||
    !collegeName ||
    !courseName ||
    !companyName ||
    !location ||
    !areaOfExpertise
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  const avatarFile = await uploadOnCloudinary(avatarLocalPath);
  if (!avatarFile.url) {
    throw new ApiError(400, "Avatar not uploaded on cloud");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        userType,
        avatar: {
          url: avatarFile.url,
          public_id: avatarFile.public_id,
        },
        name,
        phoneNo,
        linkedInUrl,
        collegeName,
        courseName,
        companyName,
        location,
        areaOfExpertise,
      },
    },
    { new: true }
  ).select("-password");

  return res.status(200).json(new ApiResponse(200, updatedUser, "Student"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const currentUser = await User.findById(req.user._id).select(
    "-password -createdAt -updatedAt -refreshToken -__v"
  );

  if (!currentUser) {
    throw new ApiError(400, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, currentUser, "User found successfully"));
});

const searchAndDiscover = asyncHandler(async (req, res) => {
  const {
    name,
    collegeName,
    courseName,
    companyName,
    location,
    areaOfExpertise,
    // sortBy,
  } = req.query;

  // console.log(req.query);

  if (
    !(
      name ||
      collegeName ||
      courseName ||
      companyName ||
      location ||
      areaOfExpertise
    )
  ) {
    throw new ApiError(400, "Please provide at least one search parameter");
  }

  const searchQuery = {
    userType: "alumni",
  };

  if (name) {
    searchQuery.name = { $regex: name, $options: "i" };
  }
  if (collegeName) {
    searchQuery.collegeName = { $regex: collegeName, $options: "i" };
  }
  if (courseName) {
    searchQuery.courseName = { $regex: courseName, $options: "i" };
  }
  if (companyName) {
    searchQuery.companyName = { $regex: companyName, $options: "i" };
  }
  if (location) {
    searchQuery.location = { $regex: location, $options: "i" };
  }
  if (areaOfExpertise) {
    searchQuery.areaOfExpertise = { $regex: areaOfExpertise, $options: "i" };
  }

  // Add filters dynamically
  // const filters = { name, collegeName, courseName, companyName, location, areaOfExpertise };
  // Object.keys(filters).forEach(key => {
  //   if (filters[key]) {
  //     searchQuery[key] = { $regex: filters[key], $options: 'i' };
  //   }
  // });

  try {
    const result = await User.find(searchQuery).select(
      "-password -createdAt -updatedAt -refreshToken  -__v -userType"
    );

    // console.log(result.length);

    // if (sortBy) {
    //   const sortList = sortBy.split(",").join(" ");
    //   result = result.sort(sortBy);
    //   console.log(result.length);
    // }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { totalNumber: result.length, data: result },
          "Search successful"
        )
      );
  } catch (error) {
    console.log("Error is => ", error);
    throw new ApiError(500, "Server Error while searching and sorting");
  }
});

export {
  registerUser,
  loginUser,
  logoutUser,
  updateStudent,
  updateAlumni,
  searchAndDiscover,
  getCurrentUser,
  changeCurrentPassword,
};
