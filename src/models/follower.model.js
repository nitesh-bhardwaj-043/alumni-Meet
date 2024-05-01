import mongoose, { Schema } from "mongoose";

const followerSchema = new Schema(
  {
    followFrom: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    followTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Follower = mongoose.model("Follower", followerSchema);